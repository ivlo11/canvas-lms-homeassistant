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
COURSE_INCLUDES = ["teachers", "term", "total_scores", "current_grading_period_scores"]


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


@dataclass(frozen=True, slots=True)
class Course:
    """A course a student is actively enrolled in, with the student's grade."""

    id: int
    name: str
    html_url: str | None
    teachers: list[str]
    score: float | None
    grade: str | None
    term: str | None
    grading_period: str | None
    start_at: str | None
    end_at: str | None
    # None when Canvas refused the course's assignments, so nothing was counted.
    unsubmitted_count: int | None
    missing_count: int | None


@dataclass(frozen=True, slots=True)
class StudentData:
    """What one refresh read for one student."""

    courses: list[Course]
    assignments: list[UnsubmittedAssignment]


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


def teacher_names(course: Any) -> list[str]:
    """Return the names of a course's teachers, skipping entries without one.

    The client does not type this field, so it is read defensively.
    """
    names: list[str] = []
    for teacher in getattr(course, "teachers", None) or []:
        if not isinstance(teacher, dict):
            continue
        name = teacher.get("display_name") or teacher.get("name")
        if isinstance(name, str) and name:
            names.append(name)
    return names


def student_enrollment(course: Any, student: CanvasUser) -> Any | None:
    """Return the student's own student enrolment in a course, if listed."""
    for enrollment in getattr(course, "enrollments", None) or []:
        if enrollment.type == "student" and enrollment.user_id == student.id:
            return enrollment
    return None


def current_grade(enrollment: Any | None) -> tuple[float | None, str | None]:
    """Return the score and letter grade Canvas shows the student.

    The current grading period's values are used when Canvas supplies them,
    otherwise the whole course's. Both are empty when the course hides totals.
    """
    if enrollment is None:
        return None, None
    if enrollment.current_period_computed_current_score is not None:
        return (
            float(enrollment.current_period_computed_current_score),
            enrollment.current_period_computed_current_grade or None,
        )
    if enrollment.computed_current_score is not None:
        return (
            float(enrollment.computed_current_score),
            enrollment.computed_current_grade or None,
        )
    return None, None


def build_course(
    course: Any,
    student: CanvasUser,
    base_url: str,
    items: list[UnsubmittedAssignment] | None,
) -> Course:
    """Build a course from the client's model and the items collected for it.

    ``items`` is None when Canvas refused the course's assignments.
    """
    enrollment = student_enrollment(course, student)
    score, grade = current_grade(enrollment)
    term = getattr(course, "term", None)
    return Course(
        id=course.id,
        name=course.name or str(course.id),
        html_url=getattr(course, "html_url", None) or f"{base_url}/courses/{course.id}",
        teachers=teacher_names(course),
        score=score,
        grade=grade,
        term=(term.name or None) if term is not None else None,
        grading_period=(
            (enrollment.current_grading_period_title or None)
            if enrollment is not None
            else None
        ),
        start_at=_iso(getattr(course, "start_at", None)),
        end_at=_iso(getattr(course, "end_at", None)),
        unsubmitted_count=None if items is None else len(items),
        missing_count=(
            None if items is None else sum(1 for item in items if item.missing)
        ),
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

    def __init__(self, api_client: ApiClient, url: str) -> None:
        """Wrap an already built client for a normalised Canvas URL."""
        self._api_client = api_client
        self._url = url
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
        return cls(await loop.run_in_executor(None, _build), url)

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

    async def async_get_student_data(self, student: CanvasUser) -> StudentData:
        """Return a student's active courses and their unsubmitted assignments.

        The one course listing supplies the teachers, term and grades, so
        course data costs no request beyond those the assignments need.
        """
        try:
            listed = [
                course
                async for course in self._courses.courses_user_index_all(
                    user_id=str(student.id),
                    include=COURSE_INCLUDES,
                    enrollment_state="active",
                    per_page=PAGE_SIZE,
                    _request_timeout=REQUEST_TIMEOUT,
                )
            ]
            per_course = await asyncio.gather(
                *(self._async_course_items(course, student) for course in listed)
            )
        except CanvasError:
            raise
        except Exception as err:
            raise _translate(err) from err
        return StudentData(
            courses=[
                build_course(course, student, self._url, items)
                for course, items in zip(listed, per_course, strict=True)
            ],
            assignments=sort_items(
                [item for items in per_course for item in items or []]
            ),
        )

    async def _async_course_items(
        self, course: Any, student: CanvasUser
    ) -> list[UnsubmittedAssignment] | None:
        """Return a student's unsubmitted assignments in one course.

        Returns None when Canvas refuses the course.
        """
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
                return None
        return list(items.values())


async def async_validate(url: str, token: str) -> CanvasUser:
    """Check a URL and token against Canvas and return the token's account."""
    client = await CanvasClient.async_create(url, token)
    try:
        return await client.async_get_account()
    finally:
        await client.async_close()
