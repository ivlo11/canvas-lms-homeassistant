"""Tests for the Canvas LMS sensor platform."""

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
from homeassistant.const import ATTR_UNIT_OF_MEASUREMENT, STATE_UNAVAILABLE
from homeassistant.core import HomeAssistant
from homeassistant.helpers import device_registry as dr, entity_registry as er

from .conftest import ALICE, BOB, HOST, URL, FakeCanvas, setup_entry, submission

ALICE_SENSOR = "sensor.alice_student_unsubmitted_assignments"
BOB_SENSOR = "sensor.bob_student_unsubmitted_assignments"


async def _tick(hass: HomeAssistant, freezer: FrozenDateTimeFactory) -> None:
    freezer.tick(UPDATE_INTERVAL + timedelta(seconds=1))
    async_fire_time_changed(hass)
    await hass.async_block_till_done(wait_background_tasks=True)


async def test_observer_entry_has_a_device_per_student(
    hass: HomeAssistant,
    canvas: FakeCanvas,
    parent_entry: MockConfigEntry,
    device_registry: dr.DeviceRegistry,
) -> None:
    """Two students give two service devices named after them."""
    await setup_entry(hass, parent_entry)
    devices = dr.async_entries_for_config_entry(device_registry, parent_entry.entry_id)
    assert {d.name for d in devices} == {"Alice Student", "Bob Student"}
    assert {next(iter(d.identifiers)) for d in devices} == {
        (DOMAIN, f"{HOST}_{ALICE['id']}"),
        (DOMAIN, f"{HOST}_{BOB['id']}"),
    }
    assert all(d.entry_type is dr.DeviceEntryType.SERVICE for d in devices)
    assert all(d.configuration_url == URL for d in devices)


async def test_student_entry_has_one_device(
    hass: HomeAssistant,
    canvas: FakeCanvas,
    alice_entry: MockConfigEntry,
    device_registry: dr.DeviceRegistry,
) -> None:
    """A student entry gives one device named after the student."""
    await setup_entry(hass, alice_entry)
    devices = dr.async_entries_for_config_entry(device_registry, alice_entry.entry_id)
    assert [d.name for d in devices] == ["Alice Student"]


async def test_sensor_counts_and_metadata(
    hass: HomeAssistant,
    canvas: FakeCanvas,
    parent_entry: MockConfigEntry,
    entity_registry: er.EntityRegistry,
) -> None:
    """The sensor shows 5 and 0, in assignments, with a stable unique id."""
    await setup_entry(hass, parent_entry)
    alice = hass.states.get(ALICE_SENSOR)
    assert alice.state == "5"
    assert alice.name == "Alice Student Unsubmitted assignments"
    assert alice.attributes[ATTR_UNIT_OF_MEASUREMENT] == "assignments"
    assert alice.attributes[ATTR_STATE_CLASS] == SensorStateClass.MEASUREMENT
    assert hass.states.get(BOB_SENSOR).state == "0"

    registered = entity_registry.async_get(ALICE_SENSOR)
    assert registered.unique_id == f"{HOST}_10_{ALICE['id']}_unsubmitted"
    assert registered.translation_key == "unsubmitted_assignments"
    assert registered.has_entity_name is True

    await hass.config_entries.async_reload(parent_entry.entry_id)
    await hass.async_block_till_done()
    assert entity_registry.async_get(ALICE_SENSOR).id == registered.id


async def test_count_changes_after_refresh(
    hass: HomeAssistant,
    canvas: FakeCanvas,
    parent_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    """A refresh that collects a different number changes the state."""
    await setup_entry(hass, parent_entry)
    canvas.submissions[(101, BOB["id"])] = [submission(1, user_id=22)]
    canvas.submissions[(102, ALICE["id"])] = []
    await _tick(hass, freezer)
    assert hass.states.get(ALICE_SENSOR).state == "2"
    assert hass.states.get(BOB_SENSOR).state == "1"


async def test_unavailable_after_failure_and_back_after_success(
    hass: HomeAssistant,
    canvas: FakeCanvas,
    parent_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    """Sensors are unavailable while Canvas cannot be read, then return."""
    await setup_entry(hass, parent_entry)
    canvas.error = aiohttp.ClientConnectionError("refused")
    await _tick(hass, freezer)
    assert hass.states.get(ALICE_SENSOR).state == STATE_UNAVAILABLE
    assert hass.states.get(BOB_SENSOR).state == STATE_UNAVAILABLE

    canvas.error = None
    await _tick(hass, freezer)
    assert hass.states.get(ALICE_SENSOR).state == "5"
    assert hass.states.get(BOB_SENSOR).state == "0"


async def test_student_no_longer_observed_is_unavailable(
    hass: HomeAssistant,
    canvas: FakeCanvas,
    parent_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    """A student who drops out of a refresh is unavailable, not an error."""
    await setup_entry(hass, parent_entry)
    canvas.observees[10] = [ALICE]
    await _tick(hass, freezer)
    assert hass.states.get(ALICE_SENSOR).state == "5"
    assert hass.states.get(BOB_SENSOR).state == STATE_UNAVAILABLE


async def test_observer_and_student_entries_cover_the_same_student(
    hass: HomeAssistant,
    canvas: FakeCanvas,
    parent_entry: MockConfigEntry,
    alice_entry: MockConfigEntry,
    device_registry: dr.DeviceRegistry,
    entity_registry: er.EntityRegistry,
) -> None:
    """Two entries covering Alice each give her a device and a sensor.

    Home Assistant gives a device to exactly one config entry, so the two
    entries cannot share one; they register the same identifiers and name.
    """
    await setup_entry(hass, parent_entry)
    await setup_entry(hass, alice_entry)
    devices = device_registry.async_get_devices(
        identifiers={(DOMAIN, f"{HOST}_{ALICE['id']}")}
    )
    assert {d.config_entry_id for d in devices} == {
        parent_entry.entry_id,
        alice_entry.entry_id,
    }
    assert {d.name for d in devices} == {"Alice Student"}
    sensors = [
        sensor
        for device in devices
        for sensor in er.async_entries_for_device(entity_registry, device.id)
        if sensor.translation_key == "unsubmitted_assignments"
    ]
    assert {s.unique_id for s in sensors} == {
        f"{HOST}_10_21_unsubmitted",
        f"{HOST}_21_21_unsubmitted",
    }
    assert len({s.entity_id for s in sensors}) == 2
    assert all(hass.states.get(s.entity_id).state == "5" for s in sensors)


async def test_attributes_do_not_contain_the_list(
    hass: HomeAssistant, canvas: FakeCanvas, alice_entry: MockConfigEntry
) -> None:
    """A long list of assignments stays out of the state attributes."""
    canvas.submissions[(101, ALICE["id"])] = [submission(n) for n in range(1, 301)]
    canvas.submissions[(102, ALICE["id"])] = []
    await setup_entry(hass, alice_entry)
    state = hass.states.get(ALICE_SENSOR)
    assert state.state == "300"
    assert set(state.attributes) == {
        "friendly_name",
        "icon",
        ATTR_STATE_CLASS,
        ATTR_UNIT_OF_MEASUREMENT,
    } - ({"icon"} - set(state.attributes))
    assert "Assignment 1" not in str(state.attributes)
