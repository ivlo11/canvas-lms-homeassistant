"""Fixtures for the Canvas LMS tests: a fake Canvas behind the client's API classes."""

from __future__ import annotations

from collections.abc import AsyncIterator, Iterator
from dataclasses import dataclass, field
from pathlib import Path
from types import EllipsisType
from typing import Any
from unittest.mock import AsyncMock, patch

from canvas_lms_python_client.exceptions import (
    ForbiddenException,
    UnauthorizedException,
)
from canvas_lms_python_client.models import Course, Submission, User
import pytest
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    mock_component,
)

from custom_components.canvas_lms_edu.const import CONF_USER_ID, DOMAIN
from homeassistant.components.frontend import DATA_EXTRA_MODULE_URL, UrlManager
from homeassistant.components.lovelace import LovelaceData
from homeassistant.components.lovelace.const import LOVELACE_DATA, MODE_STORAGE
from homeassistant.components.lovelace.resources import ResourceStorageCollection
from homeassistant.config_entries import ConfigEntryState
from homeassistant.const import CONF_ACCESS_TOKEN, CONF_NAME, CONF_URL
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import HomeAssistantError

API = "custom_components.canvas_lms_edu.api"

URL = "https://canvas.example.edu"
HOST = "canvas.example.edu"

PARENT = {"id": 10, "name": "Pat Parent"}
ALICE = {"id": 21, "name": "Alice Student"}
BOB = {"id": 22, "name": "Bob Student"}

PARENT_TOKEN = "parent-token"
ALICE_TOKEN = "alice-token"
BOB_TOKEN = "bob-token"


def enrollment(
    user_id: int,
    *,
    kind: str = "student",
    score: float | None = None,
    grade: str | None = None,
    period_score: float | None = None,
    period_grade: str | None = None,
    period_title: str | None = None,
) -> dict[str, Any]:
    """Return an enrolment as the course listing embeds it.

    Canvas leaves the score fields out altogether when the course hides totals.
    """
    data: dict[str, Any] = {
        "type": kind,
        "role": "StudentEnrollment" if kind == "student" else "ObserverEnrollment",
        "user_id": user_id,
        "enrollment_state": "active",
    }
    if score is not None or grade is not None:
        data["computed_current_score"] = score
        data["computed_current_grade"] = grade
    if period_title is not None:
        data["current_grading_period_title"] = period_title
        data["current_period_computed_current_score"] = period_score
        data["current_period_computed_current_grade"] = period_grade
    return data


def course(
    course_id: int,
    name: str,
    *,
    teachers: list[dict[str, Any]] | None = None,
    enrollments: list[dict[str, Any]] | None = None,
    term: str | None = None,
    start_at: str | None = None,
    end_at: str | None = None,
    html_url: str | None = None,
) -> dict[str, Any]:
    """Return a course in the shape Canvas sends."""
    data: dict[str, Any] = {
        "id": course_id,
        "name": name,
        "workflow_state": "available",
        "start_at": start_at,
        "end_at": end_at,
    }
    if teachers is not None:
        data["teachers"] = teachers
    if enrollments is not None:
        data["enrollments"] = enrollments
    if term is not None:
        data["term"] = {"id": 1, "name": term}
    if html_url is not None:
        data["html_url"] = html_url
    return data


def teacher(name: str, user_id: int = 900) -> dict[str, Any]:
    """Return a teacher as the course listing embeds one."""
    return {"id": user_id, "display_name": name, "anonymous_id": "x"}


def submission(
    assignment_id: int,
    *,
    name: str | None = None,
    due_at: str | None = "2026-11-20T23:59:00Z",
    points_possible: float | None = 10.0,
    submission_types: list[str] | None = None,
    locked_for_user: bool = False,
    missing: bool = False,
    excused: bool = False,
    course_id: int = 101,
    user_id: int = 21,
    workflow_state: str = "unsubmitted",
    submitted_at: str | None = None,
    grader_id: int | None = None,
    score: float | None = None,
    late_policy_status: str | None = None,
    custom_grade_status_id: int | None = None,
    cached_due_date: str | EllipsisType | None = ...,
    seconds_late: float | None = None,
    is_quiz_lti_assignment: bool = False,
) -> dict[str, Any]:
    """Return a submission with its assignment embedded.

    The defaults describe an ungraded, unsubmitted, online submission. The
    student's due date (``cached_due_date``) defaults to the assignment's.
    ``missing`` sets Canvas's own flag and, unless ``seconds_late`` is given,
    makes the submission past due.
    """
    if cached_due_date is ...:
        cached_due_date = due_at
    if seconds_late is None:
        seconds_late = 86400 if missing else 0
    return {
        "id": 9000 + assignment_id,
        "assignment_id": assignment_id,
        "user_id": user_id,
        "workflow_state": workflow_state,
        "submitted_at": submitted_at,
        "grader_id": grader_id,
        "score": score,
        "late_policy_status": late_policy_status,
        "custom_grade_status_id": custom_grade_status_id,
        "cached_due_date": cached_due_date,
        "seconds_late": seconds_late,
        "missing": missing,
        "excused": excused,
        "assignment": {
            "id": assignment_id,
            "name": name or f"Assignment {assignment_id}",
            "due_at": due_at,
            "points_possible": points_possible,
            "course_id": course_id,
            "html_url": f"{URL}/courses/{course_id}/assignments/{assignment_id}",
            "submission_types": submission_types or ["online_upload"],
            "locked_for_user": locked_for_user,
            "is_quiz_lti_assignment": is_quiz_lti_assignment,
        },
    }


@dataclass
class FakeCanvas:
    """What a fake Canvas knows, keyed the way the client asks for it."""

    # token -> the user Canvas reports for it
    accounts: dict[str, dict[str, Any]] = field(default_factory=dict)
    # account id -> observees
    observees: dict[int, list[dict[str, Any]]] = field(default_factory=dict)
    # student id -> active courses / concluded courses
    courses: dict[int, list[dict[str, Any]]] = field(default_factory=dict)
    concluded_courses: dict[int, list[dict[str, Any]]] = field(default_factory=dict)
    # (course id, student id) -> every submission, in any state
    submissions: dict[tuple[int, int], list[dict[str, Any] | Submission]] = field(
        default_factory=dict
    )
    forbidden_courses: set[int] = field(default_factory=set)
    # raised by every request while set
    error: Exception | None = None
    calls: list[tuple[str, dict[str, Any]]] = field(default_factory=list)
    clients: list[FakeApiClient] = field(default_factory=list)

    def record(self, name: str, client: FakeApiClient, kwargs: dict[str, Any]) -> None:
        """Record a request and fail it if Canvas is failing or the token is bad."""
        self.calls.append((name, {"host": client.host, **kwargs}))
        if self.error is not None:
            raise self.error
        if client.token not in self.accounts:
            raise UnauthorizedException(status=401, reason="Unauthorized")


class FakeApiClient:
    """Stands in for the client's ApiClient."""

    def __init__(self, configuration: Any) -> None:
        """Remember the URL and token the client was built with."""
        self.host = configuration.host
        self.token = configuration.access_token
        self.close = AsyncMock()


@pytest.fixture
def canvas() -> Iterator[FakeCanvas]:
    """Replace the client's API classes with a fake Canvas.

    The default data is an observer (Pat) with two students, Alice and Bob, who
    also have tokens of their own.
    """
    fake = FakeCanvas(
        accounts={PARENT_TOKEN: PARENT, ALICE_TOKEN: ALICE, BOB_TOKEN: BOB},
        observees={PARENT["id"]: [ALICE, BOB]},
        courses={
            ALICE["id"]: [course(101, "Algebra"), course(102, "Biology")],
            BOB["id"]: [course(101, "Algebra")],
        },
        submissions={
            (101, ALICE["id"]): [
                submission(1, due_at="2026-11-20T23:59:00Z"),
                submission(2, due_at="2026-11-01T23:59:00Z", missing=True),
            ],
            (102, ALICE["id"]): [
                submission(3, due_at=None, course_id=102),
                submission(4, due_at="2026-11-10T12:00:00Z", course_id=102),
                submission(5, due_at="2026-12-01T12:00:00Z", course_id=102),
            ],
        },
    )

    def make_client(configuration: Any) -> FakeApiClient:
        client = FakeApiClient(configuration)
        fake.clients.append(client)
        return client

    class FakeUsersApi:
        def __init__(self, client: FakeApiClient) -> None:
            self.client = client

        async def users_api_show(self, **kwargs: Any) -> User:
            fake.record("users_api_show", self.client, kwargs)
            return User.from_dict(fake.accounts[self.client.token])

    class FakeObserveesApi:
        def __init__(self, client: FakeApiClient) -> None:
            self.client = client

        async def user_observees_index_all(self, **kwargs: Any) -> AsyncIterator[User]:
            fake.record("user_observees_index_all", self.client, kwargs)
            account = fake.accounts[self.client.token]
            for user in fake.observees.get(account["id"], []):
                yield User.from_dict(user)

    class FakeCoursesApi:
        def __init__(self, client: FakeApiClient) -> None:
            self.client = client

        async def courses_user_index_all(self, **kwargs: Any) -> AsyncIterator[Course]:
            fake.record("courses_user_index_all", self.client, kwargs)
            student_id = int(kwargs["user_id"])
            found = list(fake.courses.get(student_id, []))
            if kwargs.get("enrollment_state") != "active":
                found += fake.concluded_courses.get(student_id, [])
            for item in found:
                yield Course.from_dict(item)

    class FakeSubmissionsApi:
        def __init__(self, client: FakeApiClient) -> None:
            self.client = client

        async def submissions_api_for_students_all(
            self, **kwargs: Any
        ) -> AsyncIterator[Submission]:
            fake.record("submissions_api_for_students_all", self.client, kwargs)
            course_id = int(kwargs["course_id"])
            if course_id in fake.forbidden_courses:
                raise ForbiddenException(status=403, reason="Forbidden")
            assert "workflow_state" not in kwargs
            assert kwargs["include"] == ["assignment"]
            (student_id,) = kwargs["student_ids"]
            for item in fake.submissions.get((course_id, int(student_id)), []):
                # A test may supply a built model for a value the client's
                # validation would refuse.
                yield (
                    item if isinstance(item, Submission) else Submission.from_dict(item)
                )

    with (
        patch(f"{API}.ApiClient", side_effect=make_client),
        patch(f"{API}.UsersApi", FakeUsersApi),
        patch(f"{API}.UserObserveesApi", FakeObserveesApi),
        patch(f"{API}.CoursesApi", FakeCoursesApi),
        patch(f"{API}.SubmissionsApiApi", FakeSubmissionsApi),
    ):
        yield fake


@pytest.fixture(autouse=True)
def auto_enable_custom_integrations(enable_custom_integrations: None) -> None:
    """Let Home Assistant load the integration under test."""


@pytest.fixture(autouse=True)
def frontend(hass: HomeAssistant) -> UrlManager:
    """Stand in for the frontend component and return its extra module URLs.

    The real one needs Home Assistant's built frontend, which is not installed
    for tests. The http component is the real one.
    """
    mock_component(hass, "frontend")
    urls = UrlManager(lambda change, url: None, [])
    hass.data[DATA_EXTRA_MODULE_URL] = urls
    return urls


@pytest.fixture(autouse=True)
def config_dir(hass: HomeAssistant, tmp_path: Path) -> Path:
    """Give each test its own config folder, with a ``www`` folder in it."""
    hass.config.config_dir = str(tmp_path)
    (tmp_path / "www").mkdir()
    return tmp_path


class _NoDashboardConfig:
    """The default dashboard's config, which holds no resources to import."""

    async def async_load(self, force: bool) -> dict[str, Any]:
        raise HomeAssistantError("no config")


@pytest.fixture(autouse=True)
def resources(hass: HomeAssistant) -> ResourceStorageCollection:
    """Stand in for the dashboards component and return its resource collection.

    The collection is the real one, kept in storage.
    """
    mock_component(hass, "lovelace")
    collection = ResourceStorageCollection(hass, _NoDashboardConfig())  # type: ignore[arg-type]
    hass.data[LOVELACE_DATA] = LovelaceData(
        resource_mode=MODE_STORAGE,
        dashboards={},
        resources=collection,
        yaml_dashboards={},
    )
    return collection


def make_entry(
    account: dict[str, Any], token: str, url: str = URL, host: str = HOST
) -> MockConfigEntry:
    """Return a config entry for an account, as the config flow would create it."""
    return MockConfigEntry(
        domain=DOMAIN,
        title=f"{account['name']} ({host})",
        unique_id=f"{host}_{account['id']}",
        data={
            CONF_URL: url,
            CONF_ACCESS_TOKEN: token,
            CONF_USER_ID: account["id"],
            CONF_NAME: account["name"],
        },
    )


@pytest.fixture
def parent_entry(hass: HomeAssistant) -> MockConfigEntry:
    """Return an observer entry (Pat, observing Alice and Bob), added to hass."""
    entry = make_entry(PARENT, PARENT_TOKEN)
    entry.add_to_hass(hass)
    return entry


@pytest.fixture
def alice_entry(hass: HomeAssistant) -> MockConfigEntry:
    """Return Alice's own student entry, added to hass."""
    entry = make_entry(ALICE, ALICE_TOKEN)
    entry.add_to_hass(hass)
    return entry


async def setup_entry(hass: HomeAssistant, entry: MockConfigEntry) -> None:
    """Set up a config entry and wait for it to finish.

    Setting up the first entry of the integration also sets up the others.
    """
    if entry.state is ConfigEntryState.NOT_LOADED:
        await hass.config_entries.async_setup(entry.entry_id)
    await hass.async_block_till_done()
