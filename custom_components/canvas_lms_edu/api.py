"""Read-only access to Canvas for the Canvas LMS integration.

Everything the integration asks of Canvas goes through this module, which wraps
``canvas-lms-python-client`` and has no Home Assistant dependencies.
"""

from __future__ import annotations

import asyncio
from dataclasses import asdict, dataclass
from datetime import UTC, datetime
import logging
from typing import Any, Self
from urllib.parse import urlsplit

import aiohttp
from canvas_lms_python_client import ApiClient, Configuration
from canvas_lms_python_client.api import (
    CoursesApi,
    SubmissionsApiApi,
    UserObserveesApi,
    UsersApi,
)
from canvas_lms_python_client.exceptions import (
    ApiException,
    ForbiddenException,
    UnauthorizedException,
)

_LOGGER = logging.getLogger(__name__)

REQUEST_TIMEOUT = 30.0
PAGE_SIZE = 100
MAX_CONCURRENT_COURSES = 5


class CanvasError(Exception):
    """Canvas could not be read."""


class CanvasAuthError(CanvasError):
    """Canvas rejected the access token."""


class CanvasConnectionError(CanvasError):
    """Canvas could not be reached, timed out, or failed with a server error."""


class InvalidUrl(ValueError):
    """The Canvas URL has no host."""


@dataclass(frozen=True, slots=True)
class CanvasUser:
    """A Canvas user: the token's account, or a student."""

    id: int
    name: str


@dataclass(frozen=True, slots=True)
class UnsubmittedAssignment:
    """An assignment a student has not turned in."""

    student_id: int
    student_name: str
    course_id: int
    course_name: str
    assignment_id: int
    name: str | None
    due_at: str | None
    points_possible: float | None
    html_url: str | None
    submission_types: list[str]
    locked_for_user: bool
    missing: bool
    excused: bool

    def as_dict(self) -> dict[str, Any]:
        """Return the item as a plain dict."""
        return asdict(self)


def normalize_url(url: str) -> str:
    """Reduce a Canvas URL to scheme and host, assuming https when omitted."""
    url = url.strip()
    if "://" not in url:
        url = f"https://{url}"
    parts = urlsplit(url)
    if parts.scheme not in ("http", "https") or not parts.hostname:
        raise InvalidUrl(url)
    return f"{parts.scheme}://{parts.netloc.lower()}"


def host_from_url(url: str) -> str:
    """Return the host (and port, if any) of a normalised Canvas URL."""
    return urlsplit(url).netloc


def _iso(value: datetime | None) -> str | None:
    """Format a Canvas timestamp as ISO 8601 in UTC."""
    if value is None:
        return None
    if value.tzinfo is None:
        value = value.replace(tzinfo=UTC)
    return value.astimezone(UTC).isoformat()


def build_item(
    submission: Any, course: Any, student: CanvasUser
) -> UnsubmittedAssignment:
    """Build an item from a submission with its embedded assignment."""
    assignment = submission.assignment
    return UnsubmittedAssignment(
        student_id=student.id,
        student_name=student.name,
        course_id=course.id,
        course_name=course.name or str(course.id),
        assignment_id=assignment.id,
        name=assignment.name,
        due_at=_iso(assignment.due_at),
        points_possible=assignment.points_possible,
        html_url=assignment.html_url,
        submission_types=list(assignment.submission_types or []),
        locked_for_user=bool(assignment.locked_for_user),
        missing=bool(submission.missing),
        excused=bool(submission.excused),
    )


def sort_items(items: list[UnsubmittedAssignment]) -> list[UnsubmittedAssignment]:
    """Order by due date, earliest first, undated last, then by assignment id."""
    return sorted(
        items, key=lambda i: (i.due_at is None, i.due_at or "", i.assignment_id)
    )


def _translate(err: Exception) -> CanvasError:
    """Map a client or transport failure to one of this module's errors."""
    if isinstance(err, UnauthorizedException):
        return CanvasAuthError("Canvas rejected the access token")
    if isinstance(err, ApiException):
        if err.status is None or err.status == 0 or err.status >= 500:
            return CanvasConnectionError(f"Canvas returned {err.status}: {err.reason}")
        return CanvasError(f"Canvas returned {err.status}: {err.reason}")
    if isinstance(err, (aiohttp.ClientError, TimeoutError, OSError)):
        return CanvasConnectionError(f"Could not reach Canvas: {err!r}")
    return CanvasError(f"Unexpected error reading Canvas: {err!r}")


class CanvasClient:
    """A Canvas API client for one URL and access token."""

    def __init__(self, api_client: ApiClient) -> None:
        """Wrap an already built client."""
        self._api_client = api_client
        self._users = UsersApi(api_client)
        self._observees = UserObserveesApi(api_client)
        self._courses = CoursesApi(api_client)
        self._submissions = SubmissionsApiApi(api_client)
        self._semaphore = asyncio.Semaphore(MAX_CONCURRENT_COURSES)

    @classmethod
    async def async_create(cls, url: str, token: str) -> Self:
        """Build a client for a normalised Canvas URL and a token.

        The underlying client creates an SSL context when constructed, which
        reads certificates from disk, so it is built off the event loop.
        """

        def _build() -> ApiClient:
            return ApiClient(Configuration(host=url, access_token=token))

        loop = asyncio.get_running_loop()
        return cls(await loop.run_in_executor(None, _build))

    async def async_close(self) -> None:
        """Close the client's connections."""
        await self._api_client.close()

    async def async_get_account(self) -> CanvasUser:
        """Return the user the token belongs to."""
        try:
            user = await self._users.users_api_show(
                id="self", _request_timeout=REQUEST_TIMEOUT
            )
        except Exception as err:
            raise _translate(err) from err
        return CanvasUser(id=user.id, name=user.name or str(user.id))

    async def async_get_students(self, account: CanvasUser) -> list[CanvasUser]:
        """Return the account's observees, or the account itself if none."""
        try:
            students = [
                CanvasUser(id=user.id, name=user.name or str(user.id))
                async for user in self._observees.user_observees_index_all(
                    user_id="self",
                    per_page=PAGE_SIZE,
                    _request_timeout=REQUEST_TIMEOUT,
                )
            ]
        except Exception as err:
            raise _translate(err) from err
        return students or [account]

    async def async_get_unsubmitted(
        self, student: CanvasUser
    ) -> list[UnsubmittedAssignment]:
        """Return a student's unsubmitted assignments in their active courses."""
        try:
            courses = [
                course
                async for course in self._courses.courses_user_index_all(
                    user_id=str(student.id),
                    enrollment_state="active",
                    per_page=PAGE_SIZE,
                    _request_timeout=REQUEST_TIMEOUT,
                )
            ]
            per_course = await asyncio.gather(
                *(self._async_course_items(course, student) for course in courses)
            )
        except CanvasError:
            raise
        except Exception as err:
            raise _translate(err) from err
        return sort_items([item for items in per_course for item in items])

    async def _async_course_items(
        self, course: Any, student: CanvasUser
    ) -> list[UnsubmittedAssignment]:
        """Return a student's unsubmitted assignments in one course."""
        items: dict[int, UnsubmittedAssignment] = {}
        async with self._semaphore:
            try:
                async for (
                    submission
                ) in self._submissions.submissions_api_for_students_all(
                    course_id=str(course.id),
                    student_ids=[str(student.id)],
                    workflow_state="unsubmitted",
                    include=["assignment"],
                    per_page=PAGE_SIZE,
                    _request_timeout=REQUEST_TIMEOUT,
                ):
                    if submission.assignment is None:
                        continue
                    item = build_item(submission, course, student)
                    items.setdefault(item.assignment_id, item)
            except ForbiddenException:
                _LOGGER.debug(
                    "Canvas refused access to course %s for student %s; skipping it",
                    course.id,
                    student.id,
                )
                return []
        return list(items.values())


async def async_validate(url: str, token: str) -> CanvasUser:
    """Check a URL and token against Canvas and return the token's account."""
    client = await CanvasClient.async_create(url, token)
    try:
        return await client.async_get_account()
    finally:
        await client.async_close()
