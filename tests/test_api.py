"""Tests for the Canvas access layer."""

from __future__ import annotations

import logging

import aiohttp
from canvas_lms_python_client.exceptions import (
    NotFoundException,
    ServiceException,
    UnauthorizedException,
)
from canvas_lms_python_client.models import Course, Submission
import pytest

from custom_components.canvas_lms_edu.api import (
    CanvasAuthError,
    CanvasClient,
    CanvasConnectionError,
    CanvasError,
    CanvasUser,
    InvalidUrl,
    async_validate,
    build_item,
    host_from_url,
    normalize_url,
    sort_items,
)

from .conftest import (
    ALICE,
    ALICE_TOKEN,
    BOB,
    PARENT,
    PARENT_TOKEN,
    URL,
    FakeCanvas,
    course,
    submission,
)

ALICE_USER = CanvasUser(id=ALICE["id"], name=ALICE["name"])
BOB_USER = CanvasUser(id=BOB["id"], name=BOB["name"])
PARENT_USER = CanvasUser(id=PARENT["id"], name=PARENT["name"])


@pytest.mark.parametrize(
    ("entered", "stored"),
    [
        ("https://canvas.example.edu", "https://canvas.example.edu"),
        ("https://canvas.example.edu/", "https://canvas.example.edu"),
        ("https://canvas.example.edu/courses/5?x=1#top", "https://canvas.example.edu"),
        ("canvas.example.edu", "https://canvas.example.edu"),
        ("canvas.example.edu/login", "https://canvas.example.edu"),
        ("  HTTPS://Canvas.Example.EDU/  ", "https://canvas.example.edu"),
        ("http://localhost:3000/", "http://localhost:3000"),
    ],
)
def test_normalize_url(entered: str, stored: str) -> None:
    """Each accepted input form is reduced to scheme and host."""
    assert normalize_url(entered) == stored


@pytest.mark.parametrize("entered", ["", "   ", "https://", "ftp://canvas.example.edu"])
def test_normalize_url_rejects_unusable_input(entered: str) -> None:
    """Input without a web host is refused."""
    with pytest.raises(InvalidUrl):
        normalize_url(entered)


def test_host_from_url() -> None:
    """The host keeps its port."""
    assert host_from_url("http://localhost:3000") == "localhost:3000"


async def test_account_resolved_from_self(canvas: FakeCanvas) -> None:
    """The account is whoever Canvas says the token belongs to."""
    assert await async_validate(URL, ALICE_TOKEN) == ALICE_USER
    name, kwargs = canvas.calls[0]
    assert name == "users_api_show"
    assert kwargs["id"] == "self"
    assert kwargs["host"] == URL
    canvas.clients[0].close.assert_awaited_once()


async def test_account_unauthorized(canvas: FakeCanvas) -> None:
    """A rejected token is reported as an authentication error."""
    with pytest.raises(CanvasAuthError):
        await async_validate(URL, "wrong-token")
    canvas.clients[0].close.assert_awaited_once()


@pytest.mark.parametrize(
    "error",
    [
        aiohttp.ClientConnectionError("refused"),
        TimeoutError(),
        ServiceException(status=503, reason="Service Unavailable"),
    ],
)
async def test_account_connection_failure(canvas: FakeCanvas, error: Exception) -> None:
    """Unreachable, timed out, and server errors are connection errors."""
    canvas.error = error
    with pytest.raises(CanvasConnectionError):
        await async_validate(URL, ALICE_TOKEN)


@pytest.mark.parametrize(
    "error", [NotFoundException(status=404, reason="Not Found"), ValueError("boom")]
)
async def test_account_other_failure(canvas: FakeCanvas, error: Exception) -> None:
    """Anything else is a plain Canvas error, not auth or connection."""
    canvas.error = error
    with pytest.raises(CanvasError) as excinfo:
        await async_validate(URL, ALICE_TOKEN)
    assert type(excinfo.value) is CanvasError


async def test_students_of_an_observer(canvas: FakeCanvas) -> None:
    """An account with observees has those observees as its students."""
    client = await CanvasClient.async_create(URL, PARENT_TOKEN)
    assert await client.async_get_students(PARENT_USER) == [ALICE_USER, BOB_USER]
    assert canvas.calls[-1][1]["user_id"] == "self"


async def test_students_of_a_student(canvas: FakeCanvas) -> None:
    """An account with no observees is its own only student."""
    client = await CanvasClient.async_create(URL, ALICE_TOKEN)
    assert await client.async_get_students(ALICE_USER) == [ALICE_USER]


async def test_students_unauthorized(canvas: FakeCanvas) -> None:
    """A rejected token while listing observees is an authentication error."""
    client = await CanvasClient.async_create(URL, "wrong-token")
    with pytest.raises(CanvasAuthError):
        await client.async_get_students(ALICE_USER)


def test_item_carries_every_field() -> None:
    """Every field in the spec is carried from Canvas's values."""
    item = build_item(
        Submission.from_dict(
            submission(
                7,
                name="Lab report",
                due_at="2026-11-20T18:59:00-05:00",
                points_possible=25.5,
                submission_types=["on_paper"],
                locked_for_user=True,
                missing=True,
                excused=True,
                course_id=102,
            )
        ),
        Course.from_dict(course(102, "Biology")),
        ALICE_USER,
    )
    assert item.as_dict() == {
        "student_id": 21,
        "student_name": "Alice Student",
        "course_id": 102,
        "course_name": "Biology",
        "assignment_id": 7,
        "name": "Lab report",
        "due_at": "2026-11-20T23:59:00+00:00",
        "points_possible": 25.5,
        "html_url": f"{URL}/courses/102/assignments/7",
        "submission_types": ["on_paper"],
        "locked_for_user": True,
        "missing": True,
        "excused": True,
    }


def test_item_with_empty_due_date_and_points() -> None:
    """An undated, pointless assignment is carried with empty values."""
    data = submission(8)
    data["assignment"]["due_at"] = None
    data["assignment"]["points_possible"] = None
    item = build_item(
        Submission.from_dict(data), Course.from_dict(course(101, "Algebra")), ALICE_USER
    )
    assert item.due_at is None
    assert item.points_possible is None
    assert item.missing is False
    assert item.excused is False
    assert item.locked_for_user is False


async def test_collects_from_every_active_course(canvas: FakeCanvas) -> None:
    """Unsubmitted work in several courses is all collected, with class names."""
    client = await CanvasClient.async_create(URL, PARENT_TOKEN)
    items = await client.async_get_unsubmitted(ALICE_USER)
    assert {(i.course_name, i.assignment_id) for i in items} == {
        ("Algebra", 1),
        ("Algebra", 2),
        ("Biology", 3),
        ("Biology", 4),
        ("Biology", 5),
    }
    assert all(i.student_id == 21 for i in items)
    listing = [kw for name, kw in canvas.calls if name == "courses_user_index_all"]
    assert listing[0]["user_id"] == "21"
    assert listing[0]["enrollment_state"] == "active"
    per_course = [
        kw for name, kw in canvas.calls if name == "submissions_api_for_students_all"
    ]
    assert {kw["course_id"] for kw in per_course} == {"101", "102"}
    assert all(kw["student_ids"] == ["21"] for kw in per_course)
    assert all(kw["per_page"] == 100 for kw in per_course)


async def test_collects_every_page_without_duplicates(canvas: FakeCanvas) -> None:
    """More than a page of results is all collected, and a repeat is dropped."""
    rows = [submission(n) for n in range(1, 251)]
    canvas.courses[ALICE["id"]] = [course(101, "Algebra")]
    canvas.submissions[(101, ALICE["id"])] = [*rows, rows[99], rows[199]]
    client = await CanvasClient.async_create(URL, ALICE_TOKEN)
    items = await client.async_get_unsubmitted(ALICE_USER)
    assert len(items) == 250
    assert len({i.assignment_id for i in items}) == 250


async def test_concluded_course_is_excluded(canvas: FakeCanvas) -> None:
    """Work in a course whose enrolment is no longer active is not collected."""
    canvas.concluded_courses[ALICE["id"]] = [course(90, "Last year's Algebra")]
    canvas.submissions[(90, ALICE["id"])] = [submission(900, course_id=90)]
    client = await CanvasClient.async_create(URL, ALICE_TOKEN)
    items = await client.async_get_unsubmitted(ALICE_USER)
    assert 900 not in {i.assignment_id for i in items}
    assert 90 not in {i.course_id for i in items}


async def test_student_with_no_courses(canvas: FakeCanvas) -> None:
    """A student with no active courses has nothing outstanding."""
    client = await CanvasClient.async_create(URL, PARENT_TOKEN)
    assert await client.async_get_unsubmitted(BOB_USER) == []


async def test_ordered_by_due_date_with_undated_last(canvas: FakeCanvas) -> None:
    """Past-due first, then upcoming, then undated."""
    client = await CanvasClient.async_create(URL, ALICE_TOKEN)
    items = await client.async_get_unsubmitted(ALICE_USER)
    assert [(i.assignment_id, i.due_at) for i in items] == [
        (2, "2026-11-01T23:59:00+00:00"),
        (4, "2026-11-10T12:00:00+00:00"),
        (1, "2026-11-20T23:59:00+00:00"),
        (5, "2026-12-01T12:00:00+00:00"),
        (3, None),
    ]


def test_same_due_date_ordered_by_assignment_id() -> None:
    """Assignments due at the same time, or both undated, are ordered by id."""
    algebra = Course.from_dict(course(101, "Algebra"))
    items = [
        build_item(Submission.from_dict(submission(n, due_at=due)), algebra, ALICE_USER)
        for n, due in [(4, None), (3, None), (2, "2026-11-01T00:00:00Z"), (1, None)]
    ]
    assert [i.assignment_id for i in sort_items(items)] == [2, 1, 3, 4]


async def test_forbidden_course_is_skipped(
    canvas: FakeCanvas, caplog: pytest.LogCaptureFixture
) -> None:
    """One refused course is skipped and logged at debug; the rest are returned."""
    canvas.forbidden_courses.add(101)
    caplog.set_level(logging.DEBUG)
    client = await CanvasClient.async_create(URL, ALICE_TOKEN)
    items = await client.async_get_unsubmitted(ALICE_USER)
    assert {i.assignment_id for i in items} == {3, 4, 5}
    skips = [r for r in caplog.records if "refused access to course 101" in r.message]
    assert len(skips) == 1
    assert skips[0].levelno == logging.DEBUG


async def test_submission_without_assignment_is_ignored(canvas: FakeCanvas) -> None:
    """A row Canvas sends without its assignment cannot be described; skip it."""
    bare = submission(6)
    del bare["assignment"]
    canvas.submissions[(101, ALICE["id"])].append(bare)
    client = await CanvasClient.async_create(URL, ALICE_TOKEN)
    items = await client.async_get_unsubmitted(ALICE_USER)
    assert 6 not in {i.assignment_id for i in items}


@pytest.mark.parametrize(
    ("error", "expected"),
    [
        (UnauthorizedException(status=401, reason="Unauthorized"), CanvasAuthError),
        (ServiceException(status=502, reason="Bad Gateway"), CanvasConnectionError),
        (aiohttp.ClientConnectionError("reset"), CanvasConnectionError),
    ],
)
async def test_collection_failures(
    canvas: FakeCanvas, error: Exception, expected: type[Exception]
) -> None:
    """Failures while collecting are reported by kind."""
    client = await CanvasClient.async_create(URL, ALICE_TOKEN)
    canvas.error = error
    with pytest.raises(expected):
        await client.async_get_unsubmitted(ALICE_USER)


async def test_only_read_requests_are_made(canvas: FakeCanvas) -> None:
    """A full collection uses only the four read endpoints."""
    client = await CanvasClient.async_create(URL, PARENT_TOKEN)
    account = await client.async_get_account()
    for student in await client.async_get_students(account):
        await client.async_get_unsubmitted(student)
    assert {name for name, _ in canvas.calls} == {
        "users_api_show",
        "user_observees_index_all",
        "courses_user_index_all",
        "submissions_api_for_students_all",
    }
