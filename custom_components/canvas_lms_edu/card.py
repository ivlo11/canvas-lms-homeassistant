"""Load the courses card from /local, so pages opened during startup get it.

The frontend serves ``config/www`` as ``/local`` from the moment it starts,
before custom integrations are set up, and dashboards fetch their resources
from storage that is also ready by then. A page built before this integration
is set up has no extra module for the card, but it still loads the resource.

Home Assistant has no public API for dashboard resources. This uses the same
internal collection as the built-in Marketplace and HACS, and any error leaves
the card to the extra module.
"""

from __future__ import annotations

import logging
import os
from pathlib import Path
import shutil
import tempfile
from typing import Any

from homeassistant.components.lovelace.const import (
    CONF_RESOURCE_TYPE_WS,
    LOVELACE_DATA,
    MODE_STORAGE,
)
from homeassistant.const import CONF_ID, CONF_TYPE, CONF_URL
from homeassistant.core import HomeAssistant

from .const import CARD_FILENAME, DOMAIN

_LOGGER = logging.getLogger(__name__)

FRONTEND_DIR = Path(__file__).parent / "frontend"
LOCAL_URL = f"/local/{DOMAIN}/{CARD_FILENAME}"
RESOURCE_TYPE = "module"


def _www(hass: HomeAssistant) -> Path:
    return Path(hass.config.path("www"))


def _copy_bundle(www: Path) -> tuple[bool, bool]:
    """Copy the bundle into ``www/<domain>/``, return if www existed and if it worked.

    The file is only written when its contents differ, and replaced in one step
    so a page never reads half of it.
    """
    existed = www.is_dir()
    target_dir = www / DOMAIN
    target = target_dir / CARD_FILENAME
    try:
        content = (FRONTEND_DIR / CARD_FILENAME).read_bytes()
        target_dir.mkdir(parents=True, exist_ok=True)
        if target.is_file() and target.read_bytes() == content:
            return existed, True
        fd, temporary = tempfile.mkstemp(dir=target_dir, prefix=".", suffix=".tmp")
        try:
            with os.fdopen(fd, "wb") as file:
                file.write(content)
            os.replace(temporary, target)
        except BaseException:
            Path(temporary).unlink(missing_ok=True)
            raise
    except OSError as err:
        _LOGGER.warning("Could not copy the courses card to %s: %s", target, err)
        return existed, False
    return existed, True


def _is_ours(item: dict[str, Any]) -> bool:
    return str(item.get(CONF_URL, "")).split("?", 1)[0] == LOCAL_URL


def _storage_resources(hass: HomeAssistant) -> Any | None:
    """Return the dashboard resource collection when it's kept in storage."""
    data = hass.data.get(LOVELACE_DATA)
    if data is None or data.resource_mode != MODE_STORAGE:
        return None
    return data.resources


async def _async_ensure_resource(hass: HomeAssistant, url: str) -> None:
    """Keep exactly one dashboard resource for the card, pointing at ``url``."""
    if (resources := _storage_resources(hass)) is None:
        return
    try:
        await resources.async_get_info()  # loads the collection
        ours = [item for item in resources.async_items() if _is_ours(item)]
        if not ours:
            await resources.async_create_item(
                {CONF_RESOURCE_TYPE_WS: RESOURCE_TYPE, CONF_URL: url}
            )
            return
        first, *duplicates = ours
        for item in duplicates:
            await resources.async_delete_item(item[CONF_ID])
        if first[CONF_URL] != url or first.get(CONF_TYPE) != RESOURCE_TYPE:
            await resources.async_update_item(
                first[CONF_ID], {CONF_RESOURCE_TYPE_WS: RESOURCE_TYPE, CONF_URL: url}
            )
    except Exception:  # an internal API: anything it raises must not stop setup
        _LOGGER.warning(
            "Could not add the courses card to the dashboard resources; it still "
            "loads once Home Assistant has started",
            exc_info=True,
        )


async def async_setup_local_card(hass: HomeAssistant, version: str) -> None:
    """Copy the card into ``config/www`` and point a dashboard resource at it."""
    existed, copied = await hass.async_add_executor_job(_copy_bundle, _www(hass))
    if not copied:
        return
    if not existed:
        _LOGGER.info(
            "Created %s; Home Assistant serves it from the next restart, when the "
            "courses card is added to the dashboard resources",
            _www(hass),
        )
        return
    await _async_ensure_resource(hass, f"{LOCAL_URL}?v={version}")


def _remove_folder(folder: Path) -> None:
    try:
        shutil.rmtree(folder)
    except FileNotFoundError:
        pass
    except OSError as err:
        _LOGGER.warning("Could not remove the courses card from %s: %s", folder, err)


async def async_remove_local_card(hass: HomeAssistant) -> None:
    """Remove the card's dashboard resource and its copy in ``config/www``."""
    if (resources := _storage_resources(hass)) is not None:
        try:
            await resources.async_get_info()
            for item in [item for item in resources.async_items() if _is_ours(item)]:
                await resources.async_delete_item(item[CONF_ID])
        except Exception:  # an internal API: anything it raises must not stop removal
            _LOGGER.warning(
                "Could not remove the courses card from the dashboard resources",
                exc_info=True,
            )
    await hass.async_add_executor_job(_remove_folder, _www(hass) / DOMAIN)
