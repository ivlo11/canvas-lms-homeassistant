"""Actions for the Canvas LMS integration."""

from __future__ import annotations

import voluptuous as vol

from homeassistant.const import ATTR_CONFIG_ENTRY_ID
from homeassistant.core import (
    HomeAssistant,
    ServiceCall,
    ServiceResponse,
    SupportsResponse,
    callback,
)
from homeassistant.helpers import config_validation as cv, service

from .const import DOMAIN
from .coordinator import CanvasConfigEntry

SERVICE_GET_UNSUBMITTED_ASSIGNMENTS = "get_unsubmitted_assignments"

SERVICE_SCHEMA = vol.Schema({vol.Required(ATTR_CONFIG_ENTRY_ID): cv.string})


@callback
def _get_unsubmitted_assignments(call: ServiceCall) -> ServiceResponse:
    """Return the entry's unsubmitted assignments from its last refresh."""
    entry: CanvasConfigEntry = service.async_get_config_entry(
        call.hass, DOMAIN, call.data[ATTR_CONFIG_ENTRY_ID]
    )
    return {
        "assignments": [
            item.as_dict()
            for student in entry.runtime_data.data.values()
            for item in student.assignments
        ]
    }


@callback
def async_setup_services(hass: HomeAssistant) -> None:
    """Register the integration's actions."""
    hass.services.async_register(
        DOMAIN,
        SERVICE_GET_UNSUBMITTED_ASSIGNMENTS,
        _get_unsubmitted_assignments,
        schema=SERVICE_SCHEMA,
        supports_response=SupportsResponse.ONLY,
    )
