"""The Canvas LMS integration."""

from __future__ import annotations

import hashlib

from homeassistant.components.frontend import add_extra_js_url
from homeassistant.components.http import StaticPathConfig
from homeassistant.const import CONF_ACCESS_TOKEN, CONF_URL, Platform
from homeassistant.core import HomeAssistant
from homeassistant.helpers import config_validation as cv
from homeassistant.helpers.typing import ConfigType
from homeassistant.loader import async_get_integration

from .api import CanvasClient
from .card import FRONTEND_DIR, async_remove_local_card, async_setup_local_card
from .const import CARD_FILENAME, DOMAIN, FRONTEND_URL
from .coordinator import CanvasConfigEntry, CanvasCoordinator
from .services import async_setup_services

PLATFORMS = [Platform.SENSOR]

CONFIG_SCHEMA = cv.config_entry_only_config_schema(DOMAIN)


async def async_setup(hass: HomeAssistant, config: ConfigType) -> bool:
    """Set up the integration: its actions and its dashboard card."""
    async_setup_services(hass)
    await _async_serve_card(hass)
    return True


def _card_fingerprint() -> str:
    """Return a short hash of the card bundle's contents."""
    return hashlib.sha256((FRONTEND_DIR / CARD_FILENAME).read_bytes()).hexdigest()[:8]


async def _async_serve_card(hass: HomeAssistant) -> None:
    """Serve the courses card and load it in every dashboard.

    The card is copied into ``config/www`` and listed as a dashboard resource,
    so pages opened while Home Assistant is starting load it. It's also loaded
    as an extra module, which covers resources kept in YAML, the first start
    after ``config/www`` is created, and a resource removed by hand. The card
    defines its elements once however often it's loaded.

    Both URLs carry the integration's version and a hash of the bundle, so
    browsers and the mobile apps, which cache aggressively, fetch a changed
    bundle instead of reusing the old one.
    """
    integration = await async_get_integration(hass, DOMAIN)
    fingerprint = await hass.async_add_executor_job(_card_fingerprint)
    version = f"{integration.version}-{fingerprint}"
    await async_setup_local_card(hass, version)
    await hass.http.async_register_static_paths(
        [StaticPathConfig(FRONTEND_URL, str(FRONTEND_DIR), False)]
    )
    add_extra_js_url(hass, f"{FRONTEND_URL}/{CARD_FILENAME}?v={version}")


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


async def async_remove_entry(hass: HomeAssistant, entry: CanvasConfigEntry) -> None:
    """Remove the courses card's files with the last entry."""
    if any(
        other.entry_id != entry.entry_id
        for other in hass.config_entries.async_entries(DOMAIN)
    ):
        return
    await async_remove_local_card(hass)
