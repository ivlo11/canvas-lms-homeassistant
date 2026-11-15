"""Check that the documented example templates run against a sample response."""

from __future__ import annotations

from pathlib import Path
import re

from freezegun.api import FrozenDateTimeFactory
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.canvas_lms_edu.const import DOMAIN
from homeassistant.core import HomeAssistant
from homeassistant.helpers.template import Template

from .conftest import ALICE, FakeCanvas, setup_entry, submission

DOCS = Path(__file__).parent.parent / "docs" / "actions.md"


async def test_example_templates(
    hass: HomeAssistant,
    canvas: FakeCanvas,
    alice_entry: MockConfigEntry,
    freezer: FrozenDateTimeFactory,
) -> None:
    """Each jinja example in the action docs renders the expected result."""
    freezer.move_to("2026-11-15T12:00:00+00:00")
    canvas.submissions[(101, ALICE["id"])] = [
        submission(1, name="Essay", due_at="2026-11-18T12:00:00Z"),
        submission(2, name="Excused", excused=True, missing=True),
        submission(
            3,
            name="Poster",
            due_at="2026-12-10T12:00:00Z",
            submission_types=["on_paper"],
        ),
        submission(4, name="Late", due_at="2026-11-01T12:00:00Z", missing=True),
    ]
    canvas.submissions[(102, ALICE["id"])] = []
    await setup_entry(hass, alice_entry)
    response = await hass.services.async_call(
        DOMAIN,
        "get_unsubmitted_assignments",
        {"config_entry_id": alice_entry.entry_id},
        blocking=True,
        return_response=True,
    )

    templates = re.findall(r"```jinja\n(.*?)```", DOCS.read_text(), re.DOTALL)
    assert len(templates) == 3
    rendered = [
        Template(text, hass).async_render({"canvas": response}) for text in templates
    ]
    online, missing, soon = rendered
    assert "Essay" in online
    assert "Late" in online
    assert "Excused" not in online
    assert "Poster" not in online
    assert missing == 2
    assert "Essay" in soon
    assert "Late" not in soon
    assert "Poster" not in soon
