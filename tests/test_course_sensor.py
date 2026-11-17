"""Tests for the course grade sensors."""

from __future__ import annotations

from datetime import timedelta

import aiohttp
from freezegun.api import FrozenDateTimeFactory
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
)

from custom_components.canvas_lms_edu.const import DOMAIN, UPDATE_INTERVAL
from homeassistant.components.sensor import ATTR_STATE_CLASS, SensorStateClass
from homeassistant.const import (
    ATTR_UNIT_OF_MEASUREMENT,
    STATE_UNAVAILABLE,
    STATE_UNKNOWN,
)
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr, entity_registry as er

from .conftest import (
    ALICE,
    BOB,
    HOST,
    URL,
    FakeCanvas,
    course,
    enrollment,
    setup_entry,
    submission,
    teacher,
)

ALGEBRA = "sensor.alice_student_algebra_grade"
BIOLOGY = "sensor.alice_student_biology_grade"
BOB_ALGEBRA = "sensor.bob_student_algebra_grade"


async def _tick(hass: HomeAssistant, freezer: FrozenDateTimeFactory) -> None:
    freezer.tick(UPDATE_INTERVAL + timedelta(seconds=1))
    async_fire_time_changed(hass)
    await hass.async_block_till_done(wait_background_tasks=True)


def _graded(score: float | None, grade: str | None = None, **kwargs) -> list[dict]:
    """Return Alice's courses with a grade in Algebra."""
    return [
        course(
            101,
            "Algebra",
            enrollments=[enrollment(ALICE["id"], score=score, grade=grade)],
            **kwargs,
        ),
        course(102, "Biology"),
    ]


def _course_sensors(hass: HomeAssistant, entry: MockConfigEntry) -> set[str]:
    return {
        e.entity_id
        for e in er.async_entries_for_config_entry(er.async_get(hass), entry.entry_id)
        if e.translation_key == "course_grade"
    }


async def test_score_unit_and_metadata(
    hass: HomeAssistant,
    canvas: FakeCanvas,
    parent_entry: MockConfigEntry,
    entity_registry: er.EntityRegistry,
    device_registry: dr.DeviceRegistry,
) -> None:
    """A score of 91.5 is the state, in percent, on the student's device."""
    canvas.courses[ALICE["id"]] = _graded(91.5, "A-")
    await setup_entry(hass, parent_entry)
    state = hass.states.get(ALGEBRA)
    assert state.state == "91.5"
    assert state.name == "Alice Student Algebra grade"
    assert state.attributes[ATTR_UNIT_OF_MEASUREMENT] == "%"
    assert state.attributes[ATTR_STATE_CLASS] == SensorStateClass.MEASUREMENT

    registered = entity_registry.async_get(ALGEBRA)
    assert registered.unique_id == f"{HOST}_10_{ALICE['id']}_course_101_grade"
    assert registered.translation_key == "course_grade"
    assert registered.has_entity_name is True
    device = device_registry.async_get(registered.device_id)
    assert device.identifiers == {(DOMAIN, f"{HOST}_{ALICE['id']}")}
    assert device.config_entry_id == parent_entry.entry_id


async def test_score_changes_after_refresh(
    hass: HomeAssistant,
    canvas: FakeCanvas,
    parent_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    """A refresh that reads a different score changes the state."""
    canvas.courses[ALICE["id"]] = _graded(91.5)
    await setup_entry(hass, parent_entry)
    canvas.courses[ALICE["id"]] = _graded(89.0)
    await _tick(hass, freezer)
    assert hass.states.get(ALGEBRA).state == "89.0"


async def test_unknown_without_a_score(
    hass: HomeAssistant, canvas: FakeCanvas, parent_entry: MockConfigEntry
) -> None:
    """No score, or hidden totals, gives an unknown state and an empty grade."""
    canvas.courses[ALICE["id"]] = _graded(None)
    await setup_entry(hass, parent_entry)
    state = hass.states.get(ALGEBRA)
    assert state.state == STATE_UNKNOWN
    assert state.attributes["grade"] is None
    assert state.attributes["course_name"] == "Algebra"


async def test_identity_teacher_and_letter_grade_attributes(
    hass: HomeAssistant, canvas: FakeCanvas, parent_entry: MockConfigEntry
) -> None:
    """Course id and name, student id, teachers and letter grade are exposed."""
    canvas.courses[ALICE["id"]] = [
        course(
            101,
            "Algebra",
            teachers=[teacher("Ms Rivera")],
            enrollments=[enrollment(ALICE["id"], score=91.5, grade="A-")],
        ),
        course(
            102,
            "Biology",
            teachers=[teacher("Mr Okafor"), teacher("Dr Lindqvist", 901)],
            enrollments=[enrollment(ALICE["id"], score=77.0)],
        ),
    ]
    await setup_entry(hass, parent_entry)
    algebra = hass.states.get(ALGEBRA).attributes
    assert algebra["course_id"] == 101
    assert algebra["course_name"] == "Algebra"
    assert algebra["student_id"] == ALICE["id"]
    assert algebra["teachers"] == ["Ms Rivera"]
    assert algebra["grade"] == "A-"

    biology = hass.states.get(BIOLOGY)
    assert biology.state == "77.0"
    assert biology.attributes["grade"] is None
    assert biology.attributes["teachers"] == ["Mr Okafor", "Dr Lindqvist"]
    # Bob's Algebra has no teachers listed.
    assert hass.states.get(BOB_ALGEBRA).attributes["teachers"] == []


async def test_link_term_dates_and_counts_attributes(
    hass: HomeAssistant, canvas: FakeCanvas, parent_entry: MockConfigEntry
) -> None:
    """Link, term, period, dates and counts match the course data."""
    canvas.courses[ALICE["id"]] = [
        course(
            101,
            "Algebra",
            term="Fall 2026",
            start_at="2026-08-20T14:00:00Z",
            end_at="2026-12-18T00:00:00Z",
            html_url=f"{URL}/courses/101",
            enrollments=[
                enrollment(
                    ALICE["id"],
                    score=80.0,
                    period_score=91.5,
                    period_grade="A-",
                    period_title="Quarter 2",
                )
            ],
        ),
        course(102, "Biology"),
    ]
    canvas.submissions[(101, ALICE["id"])] = [
        submission(n, missing=n <= 2) for n in range(1, 6)
    ]
    canvas.submissions[(102, ALICE["id"])] = []
    await setup_entry(hass, parent_entry)

    algebra = hass.states.get(ALGEBRA)
    assert algebra.state == "91.5"
    assert algebra.attributes["html_url"] == f"{URL}/courses/101"
    assert algebra.attributes["term"] == "Fall 2026"
    assert algebra.attributes["grading_period"] == "Quarter 2"
    assert algebra.attributes["start_at"] == "2026-08-20T14:00:00+00:00"
    assert algebra.attributes["end_at"] == "2026-12-18T00:00:00+00:00"
    assert algebra.attributes["unsubmitted_count"] == 5
    assert algebra.attributes["missing_count"] == 2

    biology = hass.states.get(BIOLOGY).attributes
    assert biology["term"] is None
    assert biology["grading_period"] is None
    assert biology["start_at"] is None
    assert biology["end_at"] is None
    assert biology["unsubmitted_count"] == 0
    assert biology["missing_count"] == 0

    response = await hass.services.async_call(
        DOMAIN,
        "get_unsubmitted_assignments",
        {"config_entry_id": parent_entry.entry_id},
        blocking=True,
        return_response=True,
    )
    for entity_id in (ALGEBRA, BIOLOGY, BOB_ALGEBRA):
        attributes = hass.states.get(entity_id).attributes
        returned = [
            item
            for item in response["assignments"]
            if item["student_id"] == attributes["student_id"]
            and item["course_id"] == attributes["course_id"]
        ]
        assert attributes["unsubmitted_count"] == len(returned)


async def test_missing_work_graded_zero_is_counted(
    hass: HomeAssistant, canvas: FakeCanvas, parent_entry: MockConfigEntry
) -> None:
    """Online work graded 0 and never turned in counts as unsubmitted and missing."""
    canvas.submissions[(101, ALICE["id"])] = [
        submission(
            54,
            due_at="2026-11-01T23:59:00Z",
            workflow_state="graded",
            grader_id=900,
            score=0,
            seconds_late=86400,
        )
    ]
    await setup_entry(hass, parent_entry)
    attributes = hass.states.get(ALGEBRA).attributes
    assert attributes["unsubmitted_count"] == 1
    assert attributes["missing_count"] == 1


async def test_refused_course_has_empty_counts(
    hass: HomeAssistant, canvas: FakeCanvas, parent_entry: MockConfigEntry
) -> None:
    """A course Canvas refused keeps its sensor, with counts empty, not zero."""
    canvas.forbidden_courses.add(101)
    await setup_entry(hass, parent_entry)
    attributes = hass.states.get(ALGEBRA).attributes
    assert attributes["unsubmitted_count"] is None
    assert attributes["missing_count"] is None
    assert hass.states.get(BIOLOGY).attributes["unsubmitted_count"] == 3


async def test_new_course_gets_a_sensor(
    hass: HomeAssistant,
    canvas: FakeCanvas,
    parent_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
    entity_registry: er.EntityRegistry,
) -> None:
    """A course first listed mid-year appears without a reload."""
    await setup_entry(hass, parent_entry)
    assert _course_sensors(hass, parent_entry) == {ALGEBRA, BIOLOGY, BOB_ALGEBRA}
    canvas.courses[ALICE["id"]].append(
        course(103, "Chemistry", enrollments=[enrollment(ALICE["id"], score=95.0)])
    )
    await _tick(hass, freezer)
    chemistry = hass.states.get("sensor.alice_student_chemistry_grade")
    assert chemistry.state == "95.0"
    registered = entity_registry.async_get(chemistry.entity_id)
    assert registered.device_id == entity_registry.async_get(ALGEBRA).device_id


async def test_ended_course_loses_its_sensor(
    hass: HomeAssistant,
    canvas: FakeCanvas,
    parent_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
    entity_registry: er.EntityRegistry,
) -> None:
    """A course no longer listed after a successful refresh is removed."""
    await setup_entry(hass, parent_entry)
    canvas.courses[ALICE["id"]] = [course(101, "Algebra")]
    await _tick(hass, freezer)
    assert hass.states.get(BIOLOGY) is None
    assert entity_registry.async_get(BIOLOGY) is None
    assert _course_sensors(hass, parent_entry) == {ALGEBRA, BOB_ALGEBRA}


async def test_two_students_sharing_a_course(
    hass: HomeAssistant,
    canvas: FakeCanvas,
    parent_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
    entity_registry: er.EntityRegistry,
) -> None:
    """Each student has their own sensor for a shared course, removed singly."""
    canvas.courses[ALICE["id"]] = _graded(91.5)
    canvas.courses[BOB["id"]] = [
        course(101, "Algebra", enrollments=[enrollment(BOB["id"], score=64.0)])
    ]
    await setup_entry(hass, parent_entry)
    assert hass.states.get(ALGEBRA).state == "91.5"
    assert hass.states.get(BOB_ALGEBRA).state == "64.0"
    alice = entity_registry.async_get(ALGEBRA)
    bob = entity_registry.async_get(BOB_ALGEBRA)
    assert alice.device_id != bob.device_id
    assert alice.unique_id != bob.unique_id

    canvas.courses[BOB["id"]] = []
    await _tick(hass, freezer)
    assert hass.states.get(BOB_ALGEBRA) is None
    assert hass.states.get(ALGEBRA).state == "91.5"


async def test_failed_refresh_removes_nothing(
    hass: HomeAssistant,
    canvas: FakeCanvas,
    parent_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    """While Canvas cannot be read the sensors are unavailable, not removed."""
    canvas.courses[ALICE["id"]] = _graded(91.5)
    await setup_entry(hass, parent_entry)
    before = _course_sensors(hass, parent_entry)

    canvas.error = aiohttp.ClientConnectionError("refused")
    await _tick(hass, freezer)
    assert _course_sensors(hass, parent_entry) == before
    assert all(hass.states.get(e).state == STATE_UNAVAILABLE for e in before)

    canvas.error = None
    await _tick(hass, freezer)
    assert _course_sensors(hass, parent_entry) == before
    assert hass.states.get(ALGEBRA).state == "91.5"


async def test_entity_ids_survive_a_reload(
    hass: HomeAssistant,
    canvas: FakeCanvas,
    parent_entry: MockConfigEntry,
    entity_registry: er.EntityRegistry,
) -> None:
    """Course sensors keep their registry entries across a reload."""
    await setup_entry(hass, parent_entry)
    before = {
        entity_id: entity_registry.async_get(entity_id).id
        for entity_id in _course_sensors(hass, parent_entry)
    }
    assert len(before) == 3
    await hass.config_entries.async_reload(parent_entry.entry_id)
    await hass.async_block_till_done()
    after = {
        entity_id: entity_registry.async_get(entity_id).id
        for entity_id in _course_sensors(hass, parent_entry)
    }
    assert after == before


async def test_course_that_ended_while_unloaded_is_removed(
    hass: HomeAssistant,
    canvas: FakeCanvas,
    parent_entry: MockConfigEntry,
    entity_registry: er.EntityRegistry,
) -> None:
    """A sensor left by an earlier run is removed when its course is gone."""
    await setup_entry(hass, parent_entry)
    await hass.config_entries.async_unload(parent_entry.entry_id)
    canvas.courses[ALICE["id"]] = [course(101, "Algebra")]
    await hass.config_entries.async_setup(parent_entry.entry_id)
    await hass.async_block_till_done()
    assert entity_registry.async_get(BIOLOGY) is None
    assert _course_sensors(hass, parent_entry) == {ALGEBRA, BOB_ALGEBRA}


async def test_student_token_reports_the_same_grades(
    hass: HomeAssistant,
    canvas: FakeCanvas,
    parent_entry: MockConfigEntry,
    alice_entry: MockConfigEntry,
) -> None:
    """Alice's grade is the same from her own entry and her observer's."""
    canvas.courses[ALICE["id"]] = _graded(91.5, "A-")
    await setup_entry(hass, parent_entry)
    await setup_entry(hass, alice_entry)
    own = hass.states.get(f"{ALGEBRA}_2")
    observed = hass.states.get(ALGEBRA)
    assert own.state == observed.state == "91.5"
    assert own.attributes["grade"] == observed.attributes["grade"] == "A-"
