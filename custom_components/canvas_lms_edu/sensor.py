"""Sensor platform for the Canvas LMS integration."""

from __future__ import annotations

from typing import Any

from homeassistant.components.sensor import SensorEntity, SensorStateClass
from homeassistant.const import CONF_URL, PERCENTAGE
from homeassistant.core import HomeAssistant, callback
from homeassistant.helpers import entity_registry as er
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .api import CanvasUser, Course, host_from_url
from .const import DOMAIN
from .coordinator import CanvasConfigEntry, CanvasCoordinator

# The coordinator does all the fetching; entities never call Canvas themselves.
PARALLEL_UPDATES = 0

COURSE_MARKER = "_course_"
COURSE_GRADE_SUFFIX = "_grade"


def _student_device(entry: CanvasConfigEntry, student: CanvasUser) -> DeviceInfo:
    """Return the device a student's entities belong to."""
    url = entry.data[CONF_URL]
    return DeviceInfo(
        identifiers={(DOMAIN, f"{host_from_url(url)}_{student.id}")},
        name=student.name,
        manufacturer="Instructure",
        entry_type=DeviceEntryType.SERVICE,
        configuration_url=url,
    )


def course_grade_unique_id(
    entry: CanvasConfigEntry, student_id: int, course_id: int
) -> str:
    """Return the unique id of a student's grade sensor for a course."""
    return (
        f"{entry.unique_id}_{student_id}{COURSE_MARKER}{course_id}{COURSE_GRADE_SUFFIX}"
    )


async def async_setup_entry(
    hass: HomeAssistant,
    entry: CanvasConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Add a sensor per student, and a grade sensor per student per course.

    Course sensors follow the student's active courses: after each successful
    refresh, newly listed courses get a sensor and courses no longer listed
    lose theirs. Student devices are fixed at setup.
    """
    coordinator = entry.runtime_data
    students = dict(coordinator.students)
    async_add_entities(
        UnsubmittedAssignmentsSensor(coordinator, student)
        for student in students.values()
    )

    registry = er.async_get(hass)
    known: set[tuple[int, int]] = set()

    @callback
    def _sync_course_sensors() -> None:
        # A failed refresh keeps the previous data; it must not remove anything.
        if not coordinator.last_update_success:
            return
        current = {
            (student_id, course.id): course
            for student_id, data in coordinator.data.items()
            if student_id in students
            for course in data.courses
        }
        added = [key for key in current if key not in known]
        if added:
            async_add_entities(
                CourseGradeSensor(coordinator, students[key[0]], current[key])
                for key in added
            )
        # Includes sensors left in the registry by an earlier run of the entry.
        wanted = {course_grade_unique_id(entry, *key) for key in current}
        for registered in er.async_entries_for_config_entry(registry, entry.entry_id):
            unique_id = registered.unique_id
            if (
                COURSE_MARKER in unique_id
                and unique_id.endswith(COURSE_GRADE_SUFFIX)
                and unique_id not in wanted
            ):
                registry.async_remove(registered.entity_id)
        known.clear()
        known.update(current)

    _sync_course_sensors()
    entry.async_on_unload(coordinator.async_add_listener(_sync_course_sensors))


class UnsubmittedAssignmentsSensor(CoordinatorEntity[CanvasCoordinator], SensorEntity):
    """The number of assignments a student has not turned in."""

    _attr_has_entity_name = True
    _attr_translation_key = "unsubmitted_assignments"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator: CanvasCoordinator, student: CanvasUser) -> None:
        """Initialise the sensor for one student."""
        super().__init__(coordinator)
        entry = coordinator.config_entry
        self._student_id = student.id
        self._attr_unique_id = f"{entry.unique_id}_{student.id}_unsubmitted"
        self._attr_device_info = _student_device(entry, student)

    @property
    def available(self) -> bool:
        """Return whether the last refresh read this student from Canvas."""
        return super().available and self._student_id in self.coordinator.data

    @property
    def native_value(self) -> int:
        """Return the number of unsubmitted assignments."""
        return len(self.coordinator.data[self._student_id].assignments)


class CourseGradeSensor(CoordinatorEntity[CanvasCoordinator], SensorEntity):
    """A student's current score in one course, as a percentage."""

    _attr_has_entity_name = True
    _attr_translation_key = "course_grade"
    _attr_state_class = SensorStateClass.MEASUREMENT
    _attr_native_unit_of_measurement = PERCENTAGE

    def __init__(
        self, coordinator: CanvasCoordinator, student: CanvasUser, course: Course
    ) -> None:
        """Initialise the sensor for one student in one course."""
        super().__init__(coordinator)
        entry = coordinator.config_entry
        self._student_id = student.id
        self._course_id = course.id
        self._attr_unique_id = course_grade_unique_id(entry, student.id, course.id)
        self._attr_translation_placeholders = {"course_name": course.name}
        self._attr_device_info = _student_device(entry, student)

    @property
    def _course(self) -> Course | None:
        """Return the course from the latest refresh, if it is still listed."""
        data = self.coordinator.data.get(self._student_id)
        if data is None:
            return None
        return next((c for c in data.courses if c.id == self._course_id), None)

    @property
    def available(self) -> bool:
        """Return whether the last refresh listed this course for the student."""
        return super().available and self._course is not None

    @property
    def native_value(self) -> float | None:
        """Return the current score, or None when Canvas gives none."""
        course = self._course
        return None if course is None else course.score

    @property
    def extra_state_attributes(self) -> dict[str, Any] | None:
        """Return the course's details."""
        course = self._course
        if course is None:
            return None
        return {
            "course_id": course.id,
            "course_name": course.name,
            "student_id": self._student_id,
            "html_url": course.html_url,
            "teachers": course.teachers,
            "grade": course.grade,
            "term": course.term,
            "grading_period": course.grading_period,
            "start_at": course.start_at,
            "end_at": course.end_at,
            "unsubmitted_count": course.unsubmitted_count,
            "missing_count": course.missing_count,
        }
