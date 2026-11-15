"""Fixtures for the Canvas LMS tests: a fake Canvas behind the client's API classes."""

from __future__ import annotations

from collections.abc import AsyncIterator, Iterator
from dataclasses import dataclass, field
from typing import Any
from unittest.mock import AsyncMock, patch

from canvas_lms_python_client.exceptions import (
    ForbiddenException,
    UnauthorizedException,
)
from canvas_lms_python_client.models import Course, Submission, User
import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.canvas_lms_edu.const import CONF_USER_ID, DOMAIN
from homeassistant.config_entries import ConfigEntryState
from homeassistant.const import CONF_ACCESS_TOKEN, CONF_NAME, CONF_URL
from homeassistant.core import HomeAssistant

API = "custom_components.canvas_lms_edu.api"

URL = "https://canvas.example.edu"
HOST = "canvas.example.edu"

PARENT = {"id": 10, "name": "Pat Parent"}
ALICE = {"id": 21, "name": "Alice Student"}
BOB = {"id": 22, "name": "Bob Student"}

PARENT_TOKEN = "parent-token"
ALICE_TOKEN = "alice-token"
BOB_TOKEN = "bob-token"


def course(course_id: int, name: str) -> dict[str, Any]:
    """Return a course in the shape Canvas sends."""
    return {"id": course_id, "name": name, "workflow_state": "available"}


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
) -> dict[str, Any]:
    """Return an unsubmitted submission with its assignment embedded."""
    return {
        "id": 9000 + assignment_id,
        "assignment_id": assignment_id,
        "user_id": user_id,
        "workflow_state": "unsubmitted",
        "submitted_at": None,
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
    # (course id, student id) -> unsubmitted submissions
    submissions: dict[tuple[int, int], list[dict[str, Any]]] = field(
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
            assert kwargs["workflow_state"] == "unsubmitted"
            assert kwargs["include"] == ["assignment"]
            (student_id,) = kwargs["student_ids"]
            for item in fake.submissions.get((course_id, int(student_id)), []):
                yield Submission.from_dict(item)

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
