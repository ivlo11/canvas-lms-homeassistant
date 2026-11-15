"""Data update coordinator for the Canvas LMS integration."""

from __future__ import annotations

import asyncio

from homeassistant.config_entries import ConfigEntry
from homeassistant.const import CONF_NAME
from homeassistant.core import HomeAssistant
from homeassistant.exceptions import ConfigEntryAuthFailed
from homeassistant.helpers.update_coordinator import DataUpdateCoordinator, UpdateFailed

from .api import (
    CanvasAuthError,
    CanvasClient,
    CanvasError,
    CanvasUser,
    UnsubmittedAssignment,
)
from .const import CONF_USER_ID, DOMAIN, LOGGER, UPDATE_INTERVAL

type CanvasConfigEntry = ConfigEntry[CanvasCoordinator]


class CanvasCoordinator(DataUpdateCoordinator[dict[int, list[UnsubmittedAssignment]]]):
    """Fetch each student's unsubmitted assignments for one config entry."""

    config_entry: CanvasConfigEntry

    def __init__(
        self, hass: HomeAssistant, entry: CanvasConfigEntry, client: CanvasClient
    ) -> None:
        """Initialise the coordinator."""
        super().__init__(
            hass,
            LOGGER,
            config_entry=entry,
            name=f"{DOMAIN} {entry.title}",
            update_interval=UPDATE_INTERVAL,
        )
        self.client = client
        self.account = CanvasUser(
            id=entry.data[CONF_USER_ID], name=entry.data[CONF_NAME]
        )
        self.students: dict[int, CanvasUser] = {}

    async def _async_update_data(self) -> dict[int, list[UnsubmittedAssignment]]:
        """Read the students and their unsubmitted assignments from Canvas."""
        try:
            students = await self.client.async_get_students(self.account)
            results = await asyncio.gather(
                *(self.client.async_get_unsubmitted(student) for student in students)
            )
        except CanvasAuthError as err:
            raise ConfigEntryAuthFailed(
                translation_domain=DOMAIN, translation_key="invalid_auth"
            ) from err
        except CanvasError as err:
            raise UpdateFailed(
                translation_domain=DOMAIN,
                translation_key="update_failed",
                translation_placeholders={"error": str(err)},
            ) from err
        self.students = {student.id: student for student in students}
        return {
            student.id: items for student, items in zip(students, results, strict=True)
        }
