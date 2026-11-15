"""The Canvas LMS integration."""

from __future__ import annotations

from homeassistant.const import CONF_ACCESS_TOKEN, CONF_URL, Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType

from .api import CanvasClient
from .const import DOMAIN
from .coordinator import CanvasConfigEntry, CanvasCoordinator
from .services import async_setup_services

PLATFORMS = [Platform.SENSOR]

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the integration and register its actions."""
    async_setup_services(hass)
    return True


async def async_setup_entry(hass: HomeAssistant, entry: CanvasConfigEntry) -> bool:
    """Set up a Canvas account from a config entry."""
    client = await CanvasClient.async_create(
        entry.data[CONF_URL], entry.data[CONF_ACCESS_TOKEN]
    )
    coordinator = CanvasCoordinator(hass, entry, client)
    try:
        await coordinator.async_config_entry_first_refresh()
    except BaseException:
        await client.async_close()
        raise
    entry.runtime_data = coordinator
    await hass.config_entries.async_forward_entry_setups(entry, PLATFORMS)
    return True


async def async_unload_entry(hass: HomeAssistant, entry: CanvasConfigEntry) -> bool:
    """Unload a config entry and close its client."""
    unloaded = await hass.config_entries.async_unload_platforms(entry, PLATFORMS)
    if unloaded:
        await entry.runtime_data.client.async_close()
    return unloaded
