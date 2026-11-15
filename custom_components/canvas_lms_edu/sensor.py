"""Sensor platform for the Canvas LMS integration."""

from __future__ import annotations

from homeassistant.components.sensor import SensorEntity, SensorStateClass
from homeassistant.const import CONF_URL
from homeassistant.core import HomeAssistant
from homeassistant.helpers.device_registry import DeviceEntryType, DeviceInfo
from homeassistant.helpers.entity_platform import AddConfigEntryEntitiesCallback
from homeassistant.helpers.update_coordinator import CoordinatorEntity

from .api import CanvasUser, host_from_url
from .const import DOMAIN
from .coordinator import CanvasConfigEntry, CanvasCoordinator

# The coordinator does all the fetching; entities never call Canvas themselves.
PARALLEL_UPDATES = 0


async def async_setup_entry(
    hass: HomeAssistant,
    entry: CanvasConfigEntry,
    async_add_entities: AddConfigEntryEntitiesCallback,
) -> None:
    """Add one unsubmitted-assignments sensor per student."""
    coordinator = entry.runtime_data
    async_add_entities(
        UnsubmittedAssignmentsSensor(coordinator, student)
        for student in coordinator.students.values()
    )


class UnsubmittedAssignmentsSensor(CoordinatorEntity[CanvasCoordinator], SensorEntity):
    """The number of assignments a student has not turned in."""

    _attr_has_entity_name = True
    _attr_translation_key = "unsubmitted_assignments"
    _attr_state_class = SensorStateClass.MEASUREMENT

    def __init__(self, coordinator: CanvasCoordinator, student: CanvasUser) -> None:
        """Initialise the sensor for one student."""
        super().__init__(coordinator)
        entry = coordinator.config_entry
        url = entry.data[CONF_URL]
        self._student_id = student.id
        self._attr_unique_id = f"{entry.unique_id}_{student.id}_unsubmitted"
        self._attr_device_info = DeviceInfo(
            identifiers={(DOMAIN, f"{host_from_url(url)}_{student.id}")},
            name=student.name,
            manufacturer="Instructure",
            entry_type=DeviceEntryType.SERVICE,
            configuration_url=url,
        )

    @property
    def available(self) -> bool:
        """Return whether the last refresh read this student from Canvas."""
        return super().available and self._student_id in self.coordinator.data

    @property
    def native_value(self) -> int:
        """Return the number of unsubmitted assignments."""
        return len(self.coordinator.data[self._student_id])
