"""Tests for serving the courses dashboard card."""

from __future__ import annotations

import hashlib
from http import HTTPStatus
import json
import logging
import os
from pathlib import Path
from unittest.mock import AsyncMock, patch

import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry
from pytest_homeassistant_custom_component.typing import ClientSessionGenerator

from custom_components.canvas_lms_edu.card import async_setup_local_card
from custom_components.canvas_lms_edu.const import DOMAIN
from homeassistant.components.frontend import UrlManager
from homeassistant.components.lovelace.const import LOVELACE_DATA
from homeassistant.components.lovelace.resources import ResourceStorageCollection
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
LOCAL_URL = f"/local/{DOMAIN}/canvas-lms-courses-card.js"


def test_manifest_depends_on_http_frontend_and_lovelace() -> None:
    """Home Assistant sets up http, frontend and dashboards before the integration."""
    manifest = json.loads((COMPONENT / "manifest.json").read_text())
    assert set(manifest["dependencies"]) == {"http", "frontend", "lovelace"}


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


def _copy(config_dir: Path) -> Path:
    return config_dir / "www" / DOMAIN / BUNDLE.name


async def _items(resources: ResourceStorageCollection) -> list[dict]:
    await resources.async_get_info()
    return [dict(item) for item in resources.async_items()]


# The copy in config/www


async def test_card_is_copied_to_www(hass: HomeAssistant, config_dir: Path) -> None:
    """Setting up copies the bundle where the frontend serves /local from."""
    assert await async_setup_component(hass, DOMAIN, {})
    assert _copy(config_dir).read_bytes() == BUNDLE.read_bytes()
    assert [p.name for p in _copy(config_dir).parent.iterdir()] == [BUNDLE.name]


async def test_unchanged_copy_is_not_rewritten(
    hass: HomeAssistant, config_dir: Path
) -> None:
    """An up-to-date copy is left alone."""
    assert await async_setup_component(hass, DOMAIN, {})
    os.utime(_copy(config_dir), ns=(1, 1))
    await async_setup_local_card(hass, VERSION)
    assert _copy(config_dir).stat().st_mtime_ns == 1


async def test_changed_copy_is_rewritten(hass: HomeAssistant, config_dir: Path) -> None:
    """A copy from an older version is replaced."""
    _copy(config_dir).parent.mkdir()
    _copy(config_dir).write_text("old card")
    assert await async_setup_component(hass, DOMAIN, {})
    assert _copy(config_dir).read_bytes() == BUNDLE.read_bytes()


async def test_missing_www_is_created_without_a_resource(
    hass: HomeAssistant,
    config_dir: Path,
    resources: ResourceStorageCollection,
    frontend: UrlManager,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """/local isn't served until the next start, so the resource waits."""
    (config_dir / "www").rmdir()
    with caplog.at_level(logging.INFO):
        assert await async_setup_component(hass, DOMAIN, {})
    assert _copy(config_dir).read_bytes() == BUNDLE.read_bytes()
    assert await _items(resources) == []
    assert frontend.urls == {f"{CARD_URL}?v={VERSION}"}
    assert "next restart" in caplog.text


async def test_failed_copy_keeps_the_extra_module(
    hass: HomeAssistant,
    config_dir: Path,
    resources: ResourceStorageCollection,
    frontend: UrlManager,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """A copy that can't be written is logged, and the card still loads."""
    (config_dir / "www" / DOMAIN).write_text("a file in the way")
    assert await async_setup_component(hass, DOMAIN, {})
    assert frontend.urls == {f"{CARD_URL}?v={VERSION}"}
    assert await _items(resources) == []
    assert "Could not copy the courses card" in caplog.text


# The dashboard resource


async def test_resource_is_created(
    hass: HomeAssistant, resources: ResourceStorageCollection, frontend: UrlManager
) -> None:
    """One module resource points at the copy, versioned like the extra module."""
    assert await async_setup_component(hass, DOMAIN, {})
    (item,) = await _items(resources)
    assert item["type"] == "module"
    assert item["url"] == f"{LOCAL_URL}?v={VERSION}"
    assert frontend.urls == {f"{CARD_URL}?v={VERSION}"}


async def test_older_resource_is_updated(
    hass: HomeAssistant, resources: ResourceStorageCollection
) -> None:
    """A resource from an older version gets the new URL and stays one item."""
    old = await resources.async_create_item(
        {"res_type": "js", "url": f"{LOCAL_URL}?v=0.0.1-deadbeef"}
    )
    assert await async_setup_component(hass, DOMAIN, {})
    (item,) = await _items(resources)
    assert item["id"] == old["id"]
    assert item["type"] == "module"
    assert item["url"] == f"{LOCAL_URL}?v={VERSION}"


async def test_duplicate_resources_are_reduced_to_one(
    hass: HomeAssistant, resources: ResourceStorageCollection
) -> None:
    """Copies of the card's resource are removed; other resources stay."""
    other = await resources.async_create_item(
        {"res_type": "module", "url": "/local/community/other-card.js"}
    )
    for version in ("a", "b"):
        await resources.async_create_item(
            {"res_type": "module", "url": f"{LOCAL_URL}?v={version}"}
        )
    assert await async_setup_component(hass, DOMAIN, {})
    items = await _items(resources)
    assert other in items
    assert [i["url"] for i in items if i != other] == [f"{LOCAL_URL}?v={VERSION}"]


async def test_resource_rerun_changes_nothing(
    hass: HomeAssistant, resources: ResourceStorageCollection
) -> None:
    """Setting up again keeps the same single resource."""
    assert await async_setup_component(hass, DOMAIN, {})
    before = await _items(resources)
    with patch.object(
        resources, "async_update_item", AsyncMock(side_effect=AssertionError)
    ):
        await async_setup_local_card(hass, VERSION)
    assert await _items(resources) == before


async def test_no_resource_when_resources_are_kept_in_yaml(
    hass: HomeAssistant, resources: ResourceStorageCollection, config_dir: Path
) -> None:
    """Resources in YAML are the user's file: nothing is written there."""
    hass.data[LOVELACE_DATA].resource_mode = "yaml"
    assert await async_setup_component(hass, DOMAIN, {})
    assert await _items(resources) == []
    assert _copy(config_dir).is_file()


async def test_resource_error_is_logged(
    hass: HomeAssistant,
    resources: ResourceStorageCollection,
    frontend: UrlManager,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """An error from the resource collection doesn't stop setup."""
    with patch.object(
        resources, "async_create_item", AsyncMock(side_effect=RuntimeError("changed"))
    ):
        assert await async_setup_component(hass, DOMAIN, {})
    assert frontend.urls == {f"{CARD_URL}?v={VERSION}"}
    assert "Could not add the courses card to the dashboard resources" in caplog.text


# Removal


async def test_last_entry_removal_removes_the_card(
    hass: HomeAssistant,
    canvas: FakeCanvas,
    parent_entry: MockConfigEntry,
    resources: ResourceStorageCollection,
    config_dir: Path,
) -> None:
    """Removing the only entry removes the resource and the copy."""
    other = await resources.async_create_item(
        {"res_type": "module", "url": "/local/community/other-card.js"}
    )
    await setup_entry(hass, parent_entry)
    assert len(await _items(resources)) == 2

    await hass.config_entries.async_remove(parent_entry.entry_id)
    await hass.async_block_till_done()

    assert await _items(resources) == [other]
    assert not (config_dir / "www" / DOMAIN).exists()
    assert (config_dir / "www").is_dir()


async def test_removing_one_of_two_entries_keeps_the_card(
    hass: HomeAssistant,
    canvas: FakeCanvas,
    parent_entry: MockConfigEntry,
    alice_entry: MockConfigEntry,
    resources: ResourceStorageCollection,
    config_dir: Path,
) -> None:
    """Another entry still uses the card."""
    await setup_entry(hass, parent_entry)
    await setup_entry(hass, alice_entry)

    await hass.config_entries.async_remove(parent_entry.entry_id)
    await hass.async_block_till_done()

    assert len(await _items(resources)) == 1
    assert _copy(config_dir).is_file()


async def test_removal_error_is_logged(
    hass: HomeAssistant,
    canvas: FakeCanvas,
    parent_entry: MockConfigEntry,
    resources: ResourceStorageCollection,
    config_dir: Path,
    caplog: pytest.LogCaptureFixture,
) -> None:
    """An error from the resource collection doesn't stop the removal."""
    await setup_entry(hass, parent_entry)
    with patch.object(
        resources, "async_delete_item", AsyncMock(side_effect=RuntimeError("changed"))
    ):
        await hass.config_entries.async_remove(parent_entry.entry_id)
        await hass.async_block_till_done()

    assert (
        "Could not remove the courses card from the dashboard resources" in caplog.text
    )
    assert not (config_dir / "www" / DOMAIN).exists()
