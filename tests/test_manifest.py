"""Check the manifest and the dev environment pin the same client."""

from __future__ import annotations

import json
from pathlib import Path
import re
import tomllib

from custom_components.canvas_lms_edu.const import DOMAIN
from homeassistant.core import HomeAssistant
from homeassistant.loader import async_get_integration

ROOT = Path(__file__).parent.parent
PIN = re.compile(r"canvas-lms-python-client\.git@([0-9a-f]{40})$")


async def test_manifest_loads(hass: HomeAssistant) -> None:
    """Home Assistant loads the integration with the expected manifest values."""
    integration = await async_get_integration(hass, DOMAIN)
    assert integration.domain == DOMAIN
    assert integration.config_flow is True
    assert integration.integration_type == "service"
    assert integration.iot_class == "cloud_polling"
    assert integration.version is not None
    assert integration.documentation
    assert integration.issue_tracker
    assert integration.manifest["codeowners"] == ["@ivlo11"]


def test_client_is_pinned_to_one_commit() -> None:
    """The client requirement is a full commit SHA, the same one tests run with."""
    manifest = json.loads(
        (ROOT / "custom_components" / DOMAIN / "manifest.json").read_text()
    )
    (requirement,) = manifest["requirements"]
    pinned = PIN.search(requirement)
    assert pinned is not None

    dev = tomllib.loads((ROOT / "pyproject.toml").read_text())["dependency-groups"]
    (dev_requirement,) = [r for r in dev["dev"] if "canvas" in r]
    assert PIN.search(dev_requirement).group(1) == pinned.group(1)
