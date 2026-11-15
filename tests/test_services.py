"""Tests for the get_unsubmitted_assignments action."""

from __future__ import annotations

import aiohttp
import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.canvas_lms_edu.const import DOMAIN
from homeassistant.config_entries import ConfigEntryState
from homeassistant.core import HomeAssistant, SupportsResponse
from homeassistant.exceptions import ServiceValidationError
from homeassistant.setup import async_setup_component

from .conftest import ALICE, FakeCanvas, setup_entry, submission

SERVICE = "get_unsubmitted_assignments"


async def _call(hass: HomeAssistant, entry_id: str) -> dict:
    return await hass.services.async_call(
        DOMAIN,
        SERVICE,
        {"config_entry_id": entry_id},
        blocking=True,
        return_response=True,
    )


async def test_action_exists_without_entries(hass: HomeAssistant) -> None:
    """The action is registered by the integration, not by an entry."""
    assert await async_setup_component(hass, DOMAIN, {})
    assert hass.services.has_service(DOMAIN, SERVICE)
    assert hass.services.supports_response(DOMAIN, SERVICE) is SupportsResponse.ONLY


async def test_action_exists_when_entry_failed_to_load(
    hass: HomeAssistant, canvas: FakeCanvas, parent_entry: MockConfigEntry
) -> None:
    """The action exists even if the only entry failed to load."""
    canvas.error = aiohttp.ClientConnectionError("refused")
    await setup_entry(hass, parent_entry)
    assert parent_entry.state is ConfigEntryState.SETUP_RETRY
    assert hass.services.has_service(DOMAIN, SERVICE)
    with pytest.raises(ServiceValidationError) as excinfo:
        await _call(hass, parent_entry.entry_id)
    assert excinfo.value.translation_key == "service_config_entry_not_loaded"


async def test_config_entry_id_is_required(hass: HomeAssistant) -> None:
    """Calling without a config entry is refused."""
    assert await async_setup_component(hass, DOMAIN, {})
    with pytest.raises(Exception, match="config_entry_id"):
        await hass.services.async_call(
            DOMAIN, SERVICE, {}, blocking=True, return_response=True
        )


async def test_returns_every_students_assignments(
    hass: HomeAssistant, canvas: FakeCanvas, parent_entry: MockConfigEntry
) -> None:
    """An observer entry returns each student's items, naming the student."""
    canvas.submissions[(101, 22)] = [submission(1, user_id=22)]
    await setup_entry(hass, parent_entry)
    response = await _call(hass, parent_entry.entry_id)
    assert list(response) == ["assignments"]
    items = response["assignments"]
    assert [(i["student_name"], i["assignment_id"]) for i in items] == [
        ("Alice Student", 2),
        ("Alice Student", 4),
        ("Alice Student", 1),
        ("Alice Student", 5),
        ("Alice Student", 3),
        ("Bob Student", 1),
    ]
    assert items[0] == {
        "student_id": 21,
        "student_name": "Alice Student",
        "course_id": 101,
        "course_name": "Algebra",
        "assignment_id": 2,
        "name": "Assignment 2",
        "due_at": "2026-11-01T23:59:00+00:00",
        "points_possible": 10.0,
        "html_url": "https://canvas.example.edu/courses/101/assignments/2",
        "submission_types": ["online_upload"],
        "locked_for_user": False,
        "missing": True,
        "excused": False,
    }


async def test_returns_empty_list(
    hass: HomeAssistant, canvas: FakeCanvas, parent_entry: MockConfigEntry
) -> None:
    """Nothing outstanding gives an empty list."""
    canvas.submissions.clear()
    await setup_entry(hass, parent_entry)
    assert await _call(hass, parent_entry.entry_id) == {"assignments": []}


async def test_excused_locked_and_on_paper_items_are_returned(
    hass: HomeAssistant, canvas: FakeCanvas, alice_entry: MockConfigEntry
) -> None:
    """Nothing is filtered out; the flags say what each item is."""
    canvas.submissions[(101, ALICE["id"])] = [
        submission(1, excused=True),
        submission(2, submission_types=["on_paper"]),
        submission(3, locked_for_user=True),
        submission(4, submission_types=["none"], due_at=None, points_possible=None),
    ]
    canvas.submissions[(102, ALICE["id"])] = []
    await setup_entry(hass, alice_entry)
    items = {
        i["assignment_id"]: i
        for i in (await _call(hass, alice_entry.entry_id))["assignments"]
    }
    assert set(items) == {1, 2, 3, 4}
    assert items[1]["excused"] is True
    assert items[2]["submission_types"] == ["on_paper"]
    assert items[2]["excused"] is False
    assert items[3]["locked_for_user"] is True
    assert items[4]["submission_types"] == ["none"]
    assert items[4]["due_at"] is None
    assert items[4]["points_possible"] is None


async def test_unknown_entry(hass: HomeAssistant) -> None:
    """An entry id that does not exist is a validation error."""
    assert await async_setup_component(hass, DOMAIN, {})
    with pytest.raises(ServiceValidationError) as excinfo:
        await _call(hass, "does-not-exist")
    assert excinfo.value.translation_key == "service_config_entry_not_found"


async def test_entry_of_another_integration(hass: HomeAssistant) -> None:
    """An entry that belongs to another integration is a validation error."""
    assert await async_setup_component(hass, DOMAIN, {})
    other = MockConfigEntry(domain="other")
    other.add_to_hass(hass)
    with pytest.raises(ServiceValidationError) as excinfo:
        await _call(hass, other.entry_id)
    assert excinfo.value.translation_key == "service_config_entry_wrong_domain"


async def test_unloaded_entry(
    hass: HomeAssistant, canvas: FakeCanvas, parent_entry: MockConfigEntry
) -> None:
    """An entry that is not loaded is a validation error."""
    await setup_entry(hass, parent_entry)
    await hass.config_entries.async_unload(parent_entry.entry_id)
    with pytest.raises(ServiceValidationError) as excinfo:
        await _call(hass, parent_entry.entry_id)
    assert excinfo.value.translation_key == "service_config_entry_not_loaded"


async def test_action_does_not_call_canvas(
    hass: HomeAssistant, canvas: FakeCanvas, parent_entry: MockConfigEntry
) -> None:
    """Repeated calls return the same data and send nothing to Canvas."""
    await setup_entry(hass, parent_entry)
    before = len(canvas.calls)
    first = await _call(hass, parent_entry.entry_id)
    second = await _call(hass, parent_entry.entry_id)
    assert first == second
    assert len(canvas.calls) == before
