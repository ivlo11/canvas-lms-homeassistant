"""Tests for the Canvas access layer."""

from __future__ import annotations

import logging
from types import SimpleNamespace

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
    build_course,
    build_item,
    expects_online_submission,
    host_from_url,
    is_missing,
    is_turned_in,
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
    enrollment,
    submission,
    teacher,
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
                course_id=102,
                workflow_state="graded",
                grader_id=900,
                score=0,
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
        "missing": False,
        "excused": False,
        "graded": True,
        "score": 0.0,
    }


def test_item_with_empty_due_date_and_points() -> None:
    """An undated, pointless assignment is carried with empty values."""
    data = submission(8, due_at=None)
    data["assignment"]["points_possible"] = None
    item = build_item(
        Submission.from_dict(data), Course.from_dict(course(101, "Algebra")), ALICE_USER
    )
    assert item.due_at is None
    assert item.points_possible is None
    assert item.missing is False
    assert item.excused is False
    assert item.locked_for_user is False
    assert item.graded is False
    assert item.score is None


async def test_collects_from_every_active_course(canvas: FakeCanvas) -> None:
    """Unsubmitted work in several courses is all collected, with class names."""
    client = await CanvasClient.async_create(URL, PARENT_TOKEN)
    items = (await client.async_get_student_data(ALICE_USER)).assignments
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
    items = (await client.async_get_student_data(ALICE_USER)).assignments
    assert len(items) == 250
    assert len({i.assignment_id for i in items}) == 250


async def test_concluded_course_is_excluded(canvas: FakeCanvas) -> None:
    """Work in a course whose enrolment is no longer active is not collected."""
    canvas.concluded_courses[ALICE["id"]] = [course(90, "Last year's Algebra")]
    canvas.submissions[(90, ALICE["id"])] = [submission(900, course_id=90)]
    client = await CanvasClient.async_create(URL, ALICE_TOKEN)
    items = (await client.async_get_student_data(ALICE_USER)).assignments
    assert 900 not in {i.assignment_id for i in items}
    assert 90 not in {i.course_id for i in items}


async def test_student_with_no_courses(canvas: FakeCanvas) -> None:
    """A student with no active courses has nothing outstanding."""
    client = await CanvasClient.async_create(URL, PARENT_TOKEN)
    assert (await client.async_get_student_data(BOB_USER)).assignments == []


async def test_ordered_by_due_date_with_undated_last(canvas: FakeCanvas) -> None:
    """Past-due first, then upcoming, then undated."""
    client = await CanvasClient.async_create(URL, ALICE_TOKEN)
    items = (await client.async_get_student_data(ALICE_USER)).assignments
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
    items = (await client.async_get_student_data(ALICE_USER)).assignments
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
    items = (await client.async_get_student_data(ALICE_USER)).assignments
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
        await client.async_get_student_data(ALICE_USER)


async def test_only_read_requests_are_made(canvas: FakeCanvas) -> None:
    """A full collection uses only the four read endpoints."""
    client = await CanvasClient.async_create(URL, PARENT_TOKEN)
    account = await client.async_get_account()
    for student in await client.async_get_students(account):
        await client.async_get_student_data(student)
    assert {name for name, _ in canvas.calls} == {
        "users_api_show",
        "user_observees_index_all",
        "courses_user_index_all",
        "submissions_api_for_students_all",
    }


def _course(data: dict, items: list | None = None):
    """Build Alice's course from a Canvas course dict."""
    return build_course(Course.from_dict(data), ALICE_USER, URL, items or [])


@pytest.mark.parametrize(
    ("teachers", "names"),
    [
        ([teacher("Ms Rivera")], ["Ms Rivera"]),
        ([teacher("Ms Rivera"), teacher("Mr Okafor", 901)], ["Ms Rivera", "Mr Okafor"]),
        ([], []),
        (None, []),
        ([{"id": 5, "name": "Dr Fallback"}], ["Dr Fallback"]),
        ([{"id": 5}, teacher("Ms Rivera")], ["Ms Rivera"]),
    ],
)
def test_course_teachers(teachers: list | None, names: list[str]) -> None:
    """Teacher names are read from display_name, then name, else skipped."""
    built = _course(course(101, "Algebra", teachers=teachers))
    assert built.id == 101
    assert built.name == "Algebra"
    assert built.teachers == names


def test_course_prefers_current_period_grade() -> None:
    """With both sources, the current grading period's score and grade win."""
    built = _course(
        course(
            101,
            "Algebra",
            enrollments=[
                enrollment(
                    21,
                    score=85.0,
                    grade="B",
                    period_score=91.5,
                    period_grade="A-",
                    period_title="Quarter 2",
                )
            ],
        )
    )
    assert (built.score, built.grade) == (91.5, "A-")
    assert built.grading_period == "Quarter 2"


def test_course_whole_course_grade_only() -> None:
    """Without grading periods, the whole-course score and grade are used."""
    built = _course(
        course(101, "Algebra", enrollments=[enrollment(21, score=88, grade="B+")])
    )
    assert (built.score, built.grade) == (88.0, "B+")
    assert built.grading_period is None


def test_course_score_without_letter_grade() -> None:
    """A score with no letter grade is carried with an empty grade."""
    built = _course(course(101, "Algebra", enrollments=[enrollment(21, score=72.25)]))
    assert (built.score, built.grade) == (72.25, None)


def test_course_with_hidden_totals() -> None:
    """Canvas omits scores when the course hides totals; both are empty."""
    built = _course(course(101, "Algebra", enrollments=[enrollment(21)]))
    assert (built.score, built.grade) == (None, None)


def test_course_uses_the_students_own_student_enrolment() -> None:
    """Another user's enrolment, or a non-student one, is not the student's."""
    built = _course(
        course(
            101,
            "Algebra",
            enrollments=[
                enrollment(22, score=50.0, grade="F"),
                enrollment(21, kind="observer", score=10.0),
                enrollment(21, score=93.0, grade="A"),
            ],
        )
    )
    assert (built.score, built.grade) == (93.0, "A")
    assert _course(course(101, "Algebra")).score is None


def test_course_link_term_period_and_dates() -> None:
    """The link, term, grading period and dates are carried as Canvas sends them."""
    built = _course(
        course(
            101,
            "Algebra",
            term="Fall 2026",
            start_at="2026-08-20T08:00:00-06:00",
            end_at="2026-12-18T00:00:00Z",
            html_url="https://canvas.example.edu/courses/101",
            enrollments=[enrollment(21, period_score=90.0, period_title="Quarter 2")],
        )
    )
    assert built.html_url == "https://canvas.example.edu/courses/101"
    assert built.term == "Fall 2026"
    assert built.grading_period == "Quarter 2"
    assert built.start_at == "2026-08-20T14:00:00+00:00"
    assert built.end_at == "2026-12-18T00:00:00+00:00"


def test_course_without_term_period_or_dates() -> None:
    """Missing term, grading period and dates are empty; the link is derived."""
    built = _course(course(101, "Algebra", enrollments=[enrollment(21, score=90.0)]))
    assert built.term is None
    assert built.grading_period is None
    assert built.start_at is None
    assert built.end_at is None
    assert built.html_url == f"{URL}/courses/101"


async def test_course_listing_asks_for_teachers_term_and_scores(
    canvas: FakeCanvas,
) -> None:
    """Courses and assignments come from one method and the same requests."""
    client = await CanvasClient.async_create(URL, PARENT_TOKEN)
    data = await client.async_get_student_data(ALICE_USER)
    assert [c.name for c in data.courses] == ["Algebra", "Biology"]
    assert len(data.assignments) == 5
    names = [name for name, _ in canvas.calls]
    # One listing plus one submissions request per course, as before courses.
    assert names.count("courses_user_index_all") == 1
    assert names.count("submissions_api_for_students_all") == 2
    assert len(names) == 3
    (listing,) = [kw for name, kw in canvas.calls if name == "courses_user_index_all"]
    assert listing["include"] == [
        "teachers",
        "term",
        "total_scores",
        "current_grading_period_scores",
    ]


async def test_requests_for_five_courses(canvas: FakeCanvas) -> None:
    """Five active courses cost one listing and five submission requests."""
    canvas.courses[ALICE["id"]] = [course(100 + n, f"Course {n}") for n in range(5)]
    client = await CanvasClient.async_create(URL, ALICE_TOKEN)
    data = await client.async_get_student_data(ALICE_USER)
    assert len(data.courses) == 5
    assert len(canvas.calls) == 6


async def test_course_counts(canvas: FakeCanvas) -> None:
    """Counts come from the assignments collected for the student and course."""
    canvas.courses[ALICE["id"]] = [
        course(101, "Algebra"),
        course(102, "Biology"),
        course(103, "Chemistry"),
    ]
    canvas.submissions[(101, ALICE["id"])] = [
        submission(n, missing=n <= 2) for n in range(1, 6)
    ]
    canvas.submissions[(102, ALICE["id"])] = []
    canvas.forbidden_courses.add(103)
    client = await CanvasClient.async_create(URL, ALICE_TOKEN)
    data = await client.async_get_student_data(ALICE_USER)
    counts = {c.name: (c.unsubmitted_count, c.missing_count) for c in data.courses}
    assert counts == {"Algebra": (5, 2), "Biology": (0, 0), "Chemistry": (None, None)}
    assert len(data.assignments) == 5


def _sub(assignment_id: int = 1, **kwargs) -> Submission:
    """Build a client Submission from the fixture's shape."""
    return Submission.from_dict(submission(assignment_id, **kwargs))


@pytest.mark.parametrize(
    ("types", "quiz", "expected"),
    [
        (["on_paper"], False, False),
        (["external_tool"], False, False),
        (["none"], False, False),
        (["not_graded"], False, False),
        (["wiki_page"], False, False),
        ([], False, False),
        (["online_upload"], False, True),
        (["online_text_entry", "online_url"], False, True),
        (["on_paper", "online_upload"], False, True),
        (["external_tool"], True, True),
    ],
)
def test_expects_online_submission(
    types: list[str], quiz: bool, expected: bool
) -> None:
    """Only no-online types on their own, or no types, expect nothing online."""
    # The client's enum has no wiki_page, so the assignment is not validated.
    assignment = SimpleNamespace(submission_types=types, is_quiz_lti_assignment=quiz)
    assert expects_online_submission(assignment) is expected


@pytest.mark.parametrize(
    ("kwargs", "turned_in"),
    [
        ({}, False),
        ({"workflow_state": "submitted", "submitted_at": "2026-11-01T00:00:00Z"}, True),
        (
            {
                "workflow_state": "pending_review",
                "submitted_at": "2026-11-01T00:00:00Z",
            },
            True,
        ),
        (
            {
                "workflow_state": "graded",
                "submitted_at": "2026-11-01T00:00:00Z",
                "score": 9,
            },
            True,
        ),
        ({"workflow_state": "graded", "grader_id": 900, "score": 0}, False),
        (
            {
                "workflow_state": "graded",
                "grader_id": 900,
                "score": 8,
                "submission_types": ["on_paper"],
            },
            True,
        ),
        ({"submission_types": ["on_paper"]}, False),
        (
            {
                "workflow_state": "graded",
                "grader_id": 900,
                "score": 0,
                "submission_types": ["external_tool"],
                "is_quiz_lti_assignment": True,
            },
            False,
        ),
    ],
    ids=[
        "unsubmitted",
        "submitted",
        "pending-review",
        "graded-with-submission",
        "online-graded-0-without-submission",
        "on-paper-graded",
        "on-paper-ungraded",
        "new-quiz-graded-without-being-taken",
    ],
)
def test_is_turned_in(kwargs: dict, turned_in: bool) -> None:
    """Turned in means a submission time, or graded work not expected online."""
    assert is_turned_in(_sub(**kwargs)) is turned_in


PAST_DUE = {"seconds_late": 3600}


@pytest.mark.parametrize(
    ("kwargs", "missing"),
    [
        (PAST_DUE, True),
        ({**PAST_DUE, "workflow_state": "graded", "grader_id": 900, "score": 0}, True),
        ({**PAST_DUE, "excused": True}, False),
        ({**PAST_DUE, "custom_grade_status_id": 3}, False),
        ({**PAST_DUE, "late_policy_status": "none"}, False),
        ({**PAST_DUE, "late_policy_status": "late"}, False),
        ({"seconds_late": 0, "late_policy_status": "missing"}, True),
        ({**PAST_DUE, "submitted_at": "2026-11-01T00:00:00Z"}, False),
        ({"seconds_late": 0}, False),
        ({"seconds_late": None}, False),
        ({**PAST_DUE, "submission_types": ["on_paper"]}, False),
        (
            {
                **PAST_DUE,
                "submission_types": ["external_tool"],
                "is_quiz_lti_assignment": True,
            },
            True,
        ),
    ],
    ids=[
        "past-due",
        "graded-0-without-being-turned-in",
        "excused",
        "custom-grade-status",
        "late-status-none",
        "late-status-late",
        "late-status-missing-before-due",
        "submitted",
        "not-yet-due",
        "no-seconds-late",
        "ungraded-past-due-on-paper",
        "new-quiz",
    ],
)
def test_is_missing(kwargs: dict, missing: bool) -> None:
    """Each branch of the integration's missing rule, in Canvas's order."""
    kwargs.setdefault("missing", False)
    assert is_missing(_sub(**kwargs)) is missing


def test_canvas_missing_flag_is_not_read() -> None:
    """Canvas's own missing flag no longer decides the item's."""
    assert is_missing(_sub(missing=True, seconds_late=0)) is False


async def test_graded_zero_online_assignment_is_collected(canvas: FakeCanvas) -> None:
    """Online work graded 0 without being turned in is collected as missing."""
    # Canvas lists only active submissions and the client refuses "deleted",
    # so a deleted row is set on an already built model.
    deleted = Submission.from_dict(submission(57)).model_copy(
        update={"workflow_state": "deleted"}
    )
    canvas.submissions[(101, ALICE["id"])] = [
        submission(
            54,
            due_at="2026-11-01T23:59:00Z",
            workflow_state="graded",
            grader_id=900,
            score=0,
            seconds_late=86400,
        ),
        submission(55, workflow_state="submitted", submitted_at="2026-11-01T00:00:00Z"),
        submission(
            56,
            workflow_state="graded",
            grader_id=900,
            score=8,
            submission_types=["on_paper"],
        ),
        deleted,
    ]
    client = await CanvasClient.async_create(URL, ALICE_TOKEN)
    data = await client.async_get_student_data(ALICE_USER)
    algebra = [i for i in data.assignments if i.course_id == 101]
    assert [(i.assignment_id, i.missing, i.graded, i.score) for i in algebra] == [
        (54, True, True, 0.0)
    ]
    assert data.courses[0].unsubmitted_count == 1
    assert data.courses[0].missing_count == 1
    per_course = [
        kw for name, kw in canvas.calls if name == "submissions_api_for_students_all"
    ]
    assert all("workflow_state" not in kw for kw in per_course)


def test_due_date_is_the_students_own() -> None:
    """An extension's date is used rather than the assignment's general one."""
    algebra = Course.from_dict(course(101, "Algebra"))
    item = build_item(
        _sub(due_at="2026-11-01T23:59:00Z", cached_due_date="2026-11-08T23:59:00Z"),
        algebra,
        ALICE_USER,
    )
    assert item.due_at == "2026-11-08T23:59:00+00:00"


def test_no_due_date_for_the_student() -> None:
    """With no date for the student, the general due date is not used."""
    algebra = Course.from_dict(course(101, "Algebra"))
    item = build_item(
        _sub(due_at="2026-11-01T23:59:00Z", cached_due_date=None), algebra, ALICE_USER
    )
    assert item.due_at is None


def test_unparseable_due_date(caplog: pytest.LogCaptureFixture) -> None:
    """An unparseable due date is empty and logged at debug level."""
    caplog.set_level(logging.DEBUG)
    algebra = Course.from_dict(course(101, "Algebra"))
    item = build_item(_sub(cached_due_date="next Tuesday"), algebra, ALICE_USER)
    assert item.due_at is None
    (record,) = [r for r in caplog.records if "next Tuesday" in r.message]
    assert record.levelno == logging.DEBUG


def test_due_date_with_offset_and_fraction() -> None:
    """Canvas's other timestamp forms are normalised to UTC."""
    algebra = Course.from_dict(course(101, "Algebra"))
    item = build_item(
        _sub(cached_due_date="2026-11-20T18:59:00.000-05:00"), algebra, ALICE_USER
    )
    assert item.due_at == "2026-11-20T23:59:00+00:00"


async def test_extension_moves_assignment_in_order(canvas: FakeCanvas) -> None:
    """Ordering uses the student's due date, so an extension reorders work."""
    canvas.courses[ALICE["id"]] = [course(101, "Algebra")]
    canvas.submissions[(101, ALICE["id"])] = [
        submission(
            1,
            due_at="2026-11-01T23:59:00Z",
            cached_due_date="2026-11-12T23:59:00Z",
        ),
        submission(2, due_at="2026-11-05T23:59:00Z"),
    ]
    client = await CanvasClient.async_create(URL, ALICE_TOKEN)
    items = (await client.async_get_student_data(ALICE_USER)).assignments
    assert [i.assignment_id for i in items] == [2, 1]


def test_not_graded_yet() -> None:
    """An ungraded item is not graded and has no score."""
    algebra = Course.from_dict(course(101, "Algebra"))
    item = build_item(_sub(), algebra, ALICE_USER)
    assert (item.graded, item.score) == (False, None)
