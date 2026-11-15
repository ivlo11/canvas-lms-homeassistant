"""Tests for the coordinator and config entry lifecycle."""

from __future__ import annotations

from datetime import timedelta
import logging

import aiohttp
from canvas_lms_python_client.exceptions import ServiceException
from freezegun.api import FrozenDateTimeFactory
import pytest
from pytest_homeassistant_custom_component.common import (
    MockConfigEntry,
    async_fire_time_changed,
)

from custom_components.canvas_lms_edu.const import DOMAIN, UPDATE_INTERVAL
from homeassistant.config_entries import SOURCE_REAUTH, ConfigEntryState
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr, entity_registry as er

from .conftest import ALICE, BOB, PARENT_TOKEN, FakeCanvas, setup_entry, submission

SENSOR = "sensor.alice_student_unsubmitted_assignments"


async def _tick(hass: HomeAssistant, freezer: FrozenDateTimeFactory) -> None:
    """Let one polling interval pass."""
    freezer.tick(UPDATE_INTERVAL + timedelta(seconds=1))
    async_fire_time_changed(hass)
    await hass.async_block_till_done(wait_background_tasks=True)


def test_interval_is_thirty_minutes() -> None:
    """The polling interval is fixed at 30 minutes."""
    assert timedelta(minutes=30) == UPDATE_INTERVAL


async def test_refresh_populates_each_student(
    hass: HomeAssistant, canvas: FakeCanvas, parent_entry: MockConfigEntry
) -> None:
    """A refresh stores each student's items, keyed by student."""
    await setup_entry(hass, parent_entry)
    assert parent_entry.state is ConfigEntryState.LOADED
    coordinator = parent_entry.runtime_data
    assert coordinator.update_interval == UPDATE_INTERVAL
    assert set(coordinator.data) == {ALICE["id"], BOB["id"]}
    assert [i.assignment_id for i in coordinator.data[ALICE["id"]].assignments] == [
        2,
        4,
        1,
        5,
        3,
    ]
    assert coordinator.data[BOB["id"]].assignments == []
    assert {s.name for s in coordinator.students.values()} == {
        "Alice Student",
        "Bob Student",
    }


async def test_scheduled_refresh_rereads_canvas(
    hass: HomeAssistant,
    canvas: FakeCanvas,
    parent_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    """After 30 minutes a turned-in assignment is no longer collected."""
    await setup_entry(hass, parent_entry)
    canvas.submissions[(101, ALICE["id"])].pop()
    before = len(canvas.calls)
    await _tick(hass, freezer)
    assert len(canvas.calls) > before
    assert hass.states.get(SENSOR).state == "4"


async def test_unauthorized_starts_reauth(
    hass: HomeAssistant,
    canvas: FakeCanvas,
    parent_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    """A rejected token during operation prompts for reauthentication."""
    await setup_entry(hass, parent_entry)
    del canvas.accounts[PARENT_TOKEN]
    await _tick(hass, freezer)
    assert parent_entry.runtime_data.last_update_success is False
    flows = hass.config_entries.flow.async_progress_by_handler(DOMAIN)
    assert len(flows) == 1
    assert flows[0]["context"]["source"] == SOURCE_REAUTH
    assert flows[0]["context"]["entry_id"] == parent_entry.entry_id


async def test_unauthorized_at_setup_starts_reauth(
    hass: HomeAssistant, canvas: FakeCanvas, parent_entry: MockConfigEntry
) -> None:
    """A rejected token at startup fails setup and prompts for reauthentication."""
    del canvas.accounts[PARENT_TOKEN]
    await setup_entry(hass, parent_entry)
    assert parent_entry.state is ConfigEntryState.SETUP_ERROR
    assert hass.config_entries.flow.async_progress_by_handler(DOMAIN)
    canvas.clients[0].close.assert_awaited_once()


@pytest.mark.parametrize(
    "error",
    [
        aiohttp.ClientConnectionError("refused"),
        TimeoutError(),
        ServiceException(status=500, reason="Internal Server Error"),
    ],
)
async def test_other_failures_mark_update_failed(
    hass: HomeAssistant,
    canvas: FakeCanvas,
    parent_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
    error: Exception,
) -> None:
    """Connection, timeout and server errors fail the update without reauth."""
    await setup_entry(hass, parent_entry)
    canvas.error = error
    await _tick(hass, freezer)
    assert parent_entry.runtime_data.last_update_success is False
    assert parent_entry.state is ConfigEntryState.LOADED
    assert not hass.config_entries.flow.async_progress_by_handler(DOMAIN)


async def test_failing_first_refresh_retries_setup(
    hass: HomeAssistant, canvas: FakeCanvas, parent_entry: MockConfigEntry
) -> None:
    """Canvas being unreachable at startup leaves the entry retrying."""
    canvas.error = aiohttp.ClientConnectionError("refused")
    await setup_entry(hass, parent_entry)
    assert parent_entry.state is ConfigEntryState.SETUP_RETRY
    canvas.clients[0].close.assert_awaited_once()
    assert not hass.config_entries.flow.async_progress_by_handler(DOMAIN)


async def test_unload_closes_client_and_stops_polling(
    hass: HomeAssistant,
    canvas: FakeCanvas,
    parent_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    """Unloading closes the client and sends nothing more to Canvas."""
    await setup_entry(hass, parent_entry)
    assert await hass.config_entries.async_unload(parent_entry.entry_id)
    await hass.async_block_till_done()
    assert parent_entry.state is ConfigEntryState.NOT_LOADED
    canvas.clients[0].close.assert_awaited_once()
    before = len(canvas.calls)
    await _tick(hass, freezer)
    assert len(canvas.calls) == before


async def test_remove_entry_removes_entities(
    hass: HomeAssistant,
    canvas: FakeCanvas,
    parent_entry: MockConfigEntry,
    entity_registry: er.EntityRegistry,
    device_registry: dr.DeviceRegistry,
) -> None:
    """Removing an entry removes its entities and devices."""
    await setup_entry(hass, parent_entry)
    assert await hass.config_entries.async_remove(parent_entry.entry_id)
    await hass.async_block_till_done()
    assert hass.states.get(SENSOR) is None
    assert not er.async_entries_for_config_entry(entity_registry, parent_entry.entry_id)
    assert not dr.async_entries_for_config_entry(device_registry, parent_entry.entry_id)


async def test_failure_and_recovery_are_each_logged_once(
    hass: HomeAssistant,
    canvas: FakeCanvas,
    parent_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """Repeated failures log once; the recovery logs once."""
    await setup_entry(hass, parent_entry)
    caplog.clear()
    caplog.set_level(logging.INFO)

    def count(text: str) -> int:
        return sum(
            text in r.getMessage()
            for r in caplog.records
            if r.name == "custom_components.canvas_lms_edu"
        )

    canvas.error = aiohttp.ClientConnectionError("refused")
    await _tick(hass, freezer)
    await _tick(hass, freezer)
    await _tick(hass, freezer)
    assert count("Error fetching") == 1

    canvas.error = None
    await _tick(hass, freezer)
    await _tick(hass, freezer)
    assert count("Error fetching") == 1
    assert count("recovered") == 1


async def test_forbidden_course_does_not_fail_refresh(
    hass: HomeAssistant, canvas: FakeCanvas, parent_entry: MockConfigEntry
) -> None:
    """One refused course is skipped and the refresh still succeeds."""
    canvas.forbidden_courses.add(101)
    canvas.submissions[(102, BOB["id"])] = [submission(50, course_id=102, user_id=22)]
    await setup_entry(hass, parent_entry)
    assert parent_entry.state is ConfigEntryState.LOADED
    assert hass.states.get(SENSOR).state == "3"
