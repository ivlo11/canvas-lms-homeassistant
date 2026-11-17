"""Check that the documented example templates run against a sample response."""

from __future__ import annotations

import json
from pathlib import Path
import re

from freezegun.api import FrozenDateTimeFactory
from pytest_homeassistant_custom_component.common import MockConfigEntry
import yaml

from custom_components.canvas_lms_edu.card import LOCAL_URL
from custom_components.canvas_lms_edu.const import DOMAIN
from homeassistant.core import HomeAssistant
from homeassistant.helpers.template import Template

from .conftest import (
    ALICE,
    FakeCanvas,
    course,
    enrollment,
    setup_entry,
    submission,
)

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
    assert missing == 1
    assert "Essay" in soon
    assert "Late" not in soon
    assert "Poster" not in soon


SENSORS = DOCS.parent / "sensors.md"
CARD = DOCS.parent / "courses-card.md"
FRONTEND = DOCS.parent / "frontend-development.md"
README = DOCS.parent.parent / "README.md"
ROOT = DOCS.parent.parent


def _blocks(path: Path, language: str) -> list[str]:
    return re.findall(rf"```{language}\n(.*?)```", path.read_text(), re.DOTALL)


async def test_course_sensor_page(
    hass: HomeAssistant, canvas: FakeCanvas, alice_entry: MockConfigEntry
) -> None:
    """The documented attributes are the sensor's, and the example renders."""
    canvas.courses[ALICE["id"]] = [
        course(101, "Algebra", enrollments=[enrollment(ALICE["id"], score=91.5)]),
        course(102, "Biology", enrollments=[enrollment(ALICE["id"], score=77.0)]),
        course(103, "Chemistry"),
    ]
    await setup_entry(hass, alice_entry)
    state = hass.states.get("sensor.alice_student_algebra_grade")
    own = set(state.attributes) - {
        "friendly_name",
        "icon",
        "state_class",
        "unit_of_measurement",
    }

    (example,) = _blocks(SENSORS, "yaml")
    assert set(yaml.safe_load(example)) == own
    table = SENSORS.read_text()
    assert all(f"`{name}`" in table for name in own)

    (template,) = _blocks(SENSORS, "jinja")
    assert Template(template, hass).async_render() == 77.0


def test_card_page_examples() -> None:
    """The card's YAML examples use its type and only its options."""
    options = {"type", "device_id", "title"}
    documented = set(
        re.findall(r"^\| `(\w+)` \| (?:yes|no) \|", CARD.read_text(), re.MULTILINE)
    )
    assert documented == options
    blocks = [
        yaml.safe_load(b) for b in [*_blocks(CARD, "yaml"), *_blocks(README, "yaml")]
    ]
    resources = [b for b in blocks if "lovelace" in b]
    examples = [b for b in blocks if "lovelace" not in b]
    assert len(examples) == 2
    for config in examples:
        assert config["type"] == "custom:canvas-lms-courses-card"
        assert "device_id" in config
        assert set(config) <= options

    # The resource line for YAML resources points at the copy the integration makes.
    (resource,) = resources
    assert resource["lovelace"]["resource_mode"] == "yaml"
    assert resource["lovelace"]["resources"] == [{"url": LOCAL_URL, "type": "module"}]

    # The messages and sort labels the page describes are the card's own.
    source = "".join(
        path.read_text() for path in (ROOT / "frontend" / "src").glob("*.ts")
    )
    for phrase in (
        "Canvas LMS courses",
        "No active classes",
        "Nothing to turn in",
        "Try again",
        "Due date",
        "Points",
        "Missing",
    ):
        assert phrase in CARD.read_text()
        assert phrase in source


def test_frontend_page_commands_exist() -> None:
    """Every npm command the page documents is a script of the frontend."""
    scripts = json.loads((ROOT / "frontend" / "package.json").read_text())["scripts"]
    commands = [block.strip() for block in _blocks(FRONTEND, "bash")]
    assert commands
    for command in commands:
        if command == "npm ci":
            continue
        name = command.removeprefix("npm run ").removeprefix("npm ")
        assert name in scripts, command
    for path in re.findall(r"^\| `(frontend/[^`]+)` \|", FRONTEND.read_text(), re.M):
        assert all((ROOT / part.strip("` ")).exists() for part in path.split("`, `"))


def _anchors(path: Path) -> set[str]:
    headings = re.findall(r"^#+ (.+)$", path.read_text(), re.MULTILINE)
    return {re.sub(r"[^\w\- ]", "", h.lower()).replace(" ", "-") for h in headings}


def test_relative_links_resolve() -> None:
    """Links between the docs point at files and headings that exist."""
    for page in [README, *DOCS.parent.glob("*.md")]:
        for target in re.findall(r"\]\((?!https?:|#)([^)\s]+)\)", page.read_text()):
            file, _, anchor = target.partition("#")
            linked = (page.parent / file).resolve()
            assert linked.exists(), f"{page.name}: {target}"
            if anchor and linked.suffix == ".md":
                assert anchor in _anchors(linked), f"{page.name}: {target}"
