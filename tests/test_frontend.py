"""Tests for serving the courses dashboard card."""

from __future__ import annotations

import hashlib
from http import HTTPStatus
import json
from pathlib import Path

from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.typing import ClientSessionGenerator

from custom_components.canvas_lms_edu.const import DOMAIN
from homeassistant.components.frontend import UrlManager
from homeassistant.core import HomeAssistant
from homeassistant.setup import async_setup_component

from .conftest import FakeCanvas, setup_entry

COMPONENT = Path(__file__).parent.parent / "custom_components" / DOMAIN
BUNDLE = COMPONENT / "frontend" / "canvas-lms-courses-card.js"
VERSION = "{}-{}".format(
    json.loads((COMPONENT / "manifest.json").read_text())["version"],
    hashlib.sha256(BUNDLE.read_bytes()).hexdigest()[:8],
)
CARD_URL = f"/{DOMAIN}/frontend/canvas-lms-courses-card.js"


def test_manifest_depends_on_http_and_frontend() -> None:
    """Home Assistant sets up http and frontend before the integration."""
    manifest = json.loads((COMPONENT / "manifest.json").read_text())
    assert set(manifest["dependencies"]) == {"http", "frontend"}


async def test_card_is_served_without_entries(
    hass: HomeAssistant, hass_client: ClientSessionGenerator, frontend: UrlManager
) -> None:
    """The bundle is served and loaded as a module as soon as it is installed."""
    assert await async_setup_component(hass, DOMAIN, {})
    assert frontend.urls == {f"{CARD_URL}?v={VERSION}"}

    client = await hass_client()
    response = await client.get(f"{CARD_URL}?v={VERSION}")
    assert response.status == HTTPStatus.OK
    assert "javascript" in response.headers["Content-Type"]
    body = await response.text()
    assert body == BUNDLE.read_text()
    assert "canvas-lms-courses-card" in body


async def test_card_is_registered_once_for_several_entries(
    hass: HomeAssistant,
    canvas: FakeCanvas,
    parent_entry: MockConfigEntry,
    alice_entry: MockConfigEntry,
    frontend: UrlManager,
) -> None:
    """Several entries, and a reload, still register one URL."""
    await setup_entry(hass, parent_entry)
    await setup_entry(hass, alice_entry)
    await hass.config_entries.async_reload(parent_entry.entry_id)
    await hass.async_block_till_done()
    assert frontend.urls == {f"{CARD_URL}?v={VERSION}"}


async def test_only_the_bundle_folder_is_served(
    hass: HomeAssistant, hass_client: ClientSessionGenerator
) -> None:
    """The integration's Python files are not reachable through the card URL."""
    assert await async_setup_component(hass, DOMAIN, {})
    client = await hass_client()
    for path in ("../manifest.json", "..%2Fmanifest.json", "nothing.js"):
        response = await client.get(f"/{DOMAIN}/frontend/{path}")
        assert response.status != HTTPStatus.OK
    assert [p.name for p in (COMPONENT / "frontend").iterdir()] == [BUNDLE.name]
