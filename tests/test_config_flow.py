"""Tests for the Canvas LMS config flow."""

from __future__ import annotations

import json
from pathlib import Path

import aiohttp
import pytest
from pytest_homeassistant_custom_component.common import MockConfigEntry

from custom_components.canvas_lms_edu.const import CONF_USER_ID, DOMAIN
from homeassistant.config_entries import SOURCE_USER
from homeassistant.const import CONF_ACCESS_TOKEN, CONF_NAME, CONF_URL
from homeassistant.core import HomeAssistant
from homeassistant.data_entry_flow import FlowResultType

from .conftest import (
    ALICE,
    ALICE_TOKEN,
    BOB,
    BOB_TOKEN,
    PARENT,
    PARENT_TOKEN,
    URL,
    FakeCanvas,
    make_entry,
    setup_entry,
)

COMPONENT = Path(__file__).parent.parent / "custom_components" / DOMAIN
STRINGS = json.loads((COMPONENT / "strings.json").read_text())


async def _submit(hass: HomeAssistant, url: str, token: str, flow_id=None):
    """Open the user step if needed and submit a URL and token."""
    if flow_id is None:
        result = await hass.config_entries.flow.async_init(
            DOMAIN, context={"source": SOURCE_USER}
        )
        assert result["type"] is FlowResultType.FORM
        assert result["step_id"] == "user"
        assert not result["errors"]
        flow_id = result["flow_id"]
    result = await hass.config_entries.flow.async_configure(
        flow_id, {CONF_URL: url, CONF_ACCESS_TOKEN: token}
    )
    await hass.async_block_till_done()
    return result


def _assert_translated(result) -> None:
    """Every error or abort a flow shows must have a string."""
    for key in (result.get("errors") or {}).values():
        assert key in STRINGS["config"]["error"]
    if result["type"] is FlowResultType.ABORT:
        assert result["reason"] in STRINGS["config"]["abort"]


async def test_user_step_asks_only_for_url_and_token(hass: HomeAssistant) -> None:
    """The form has two fields and nothing else."""
    result = await hass.config_entries.flow.async_init(
        DOMAIN, context={"source": SOURCE_USER}
    )
    assert [str(key) for key in result["data_schema"].schema] == [
        CONF_URL,
        CONF_ACCESS_TOKEN,
    ]


@pytest.mark.parametrize(
    "entered",
    [URL, f"{URL}/", f"{URL}/courses/1", "canvas.example.edu"],
)
async def test_user_success(
    hass: HomeAssistant, canvas: FakeCanvas, entered: str
) -> None:
    """A valid URL and token create an entry titled with name and host."""
    result = await _submit(hass, entered, f" {PARENT_TOKEN} ")
    assert result["type"] is FlowResultType.CREATE_ENTRY
    assert result["title"] == "Pat Parent (canvas.example.edu)"
    assert result["data"] == {
        CONF_URL: URL,
        CONF_ACCESS_TOKEN: PARENT_TOKEN,
        CONF_USER_ID: PARENT["id"],
        CONF_NAME: "Pat Parent",
    }
    assert result["result"].unique_id == "canvas.example.edu_10"


@pytest.mark.parametrize(
    ("error", "token", "expected"),
    [
        (None, "wrong-token", "invalid_auth"),
        (aiohttp.ClientConnectionError("refused"), PARENT_TOKEN, "cannot_connect"),
        (TimeoutError(), PARENT_TOKEN, "cannot_connect"),
        (ValueError("boom"), PARENT_TOKEN, "unknown"),
    ],
)
async def test_user_errors_then_recovery(
    hass: HomeAssistant,
    canvas: FakeCanvas,
    caplog: pytest.LogCaptureFixture,
    error: Exception | None,
    token: str,
    expected: str,
) -> None:
    """Each failure shows its own error, and a corrected resubmission succeeds."""
    canvas.error = error
    result = await _submit(hass, URL, token)
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"base": expected}
    _assert_translated(result)
    assert not hass.config_entries.async_entries(DOMAIN)
    assert ("Unexpected error" in caplog.text) is (expected == "unknown")

    canvas.error = None
    result = await _submit(hass, URL, PARENT_TOKEN, result["flow_id"])
    assert result["type"] is FlowResultType.CREATE_ENTRY


async def test_user_invalid_url(hass: HomeAssistant, canvas: FakeCanvas) -> None:
    """A URL with no host is refused on the URL field without calling Canvas."""
    result = await _submit(hass, "ftp://canvas.example.edu", PARENT_TOKEN)
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {CONF_URL: "invalid_url"}
    _assert_translated(result)
    assert not canvas.calls

    result = await _submit(hass, URL, PARENT_TOKEN, result["flow_id"])
    assert result["type"] is FlowResultType.CREATE_ENTRY


async def test_same_account_twice_aborts(
    hass: HomeAssistant, canvas: FakeCanvas
) -> None:
    """An account that is already configured is refused."""
    make_entry(PARENT, PARENT_TOKEN).add_to_hass(hass)
    result = await _submit(hass, f"{URL}/", PARENT_TOKEN)
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "already_configured"
    _assert_translated(result)
    assert len(hass.config_entries.async_entries(DOMAIN)) == 1


async def test_two_students_on_one_host(
    hass: HomeAssistant, canvas: FakeCanvas
) -> None:
    """Two students add their own entries against the same Canvas."""
    first = await _submit(hass, URL, ALICE_TOKEN)
    second = await _submit(hass, URL, BOB_TOKEN)
    assert first["type"] is second["type"] is FlowResultType.CREATE_ENTRY
    assert first["data"][CONF_USER_ID] == ALICE["id"]
    assert second["data"][CONF_USER_ID] == BOB["id"]
    assert len(hass.config_entries.async_entries(DOMAIN)) == 2


async def test_accounts_on_two_hosts(hass: HomeAssistant, canvas: FakeCanvas) -> None:
    """The same user id on another host is a different account."""
    first = await _submit(hass, URL, ALICE_TOKEN)
    second = await _submit(hass, "https://other.example.org", ALICE_TOKEN)
    assert first["type"] is second["type"] is FlowResultType.CREATE_ENTRY
    assert second["result"].unique_id == "other.example.org_21"
    hosts = {kw["host"] for _, kw in canvas.calls}
    assert hosts == {URL, "https://other.example.org"}


async def test_observer_and_student_entries_coexist(
    hass: HomeAssistant, canvas: FakeCanvas
) -> None:
    """A parent's entry and their student's own entry are both accepted."""
    first = await _submit(hass, URL, PARENT_TOKEN)
    second = await _submit(hass, URL, ALICE_TOKEN)
    assert first["type"] is second["type"] is FlowResultType.CREATE_ENTRY


async def _start_reauth(hass: HomeAssistant, entry: MockConfigEntry):
    result = await entry.start_reauth_flow(hass)
    assert result["type"] is FlowResultType.FORM
    assert result["step_id"] == "reauth_confirm"
    assert [str(key) for key in result["data_schema"].schema] == [CONF_ACCESS_TOKEN]
    return result


async def test_reauth_same_account(
    hass: HomeAssistant, canvas: FakeCanvas, parent_entry: MockConfigEntry
) -> None:
    """A new token for the same account is stored and the entry reloads."""
    await setup_entry(hass, parent_entry)
    canvas.accounts["new-parent-token"] = PARENT
    result = await _start_reauth(hass, parent_entry)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_ACCESS_TOKEN: "new-parent-token"}
    )
    await hass.async_block_till_done()
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "reauth_successful"
    _assert_translated(result)
    assert parent_entry.data[CONF_ACCESS_TOKEN] == "new-parent-token"
    assert parent_entry.data[CONF_URL] == URL
    assert canvas.clients[-1].token == "new-parent-token"
    assert hass.states.get("sensor.alice_student_unsubmitted_assignments").state == "5"


async def test_reauth_wrong_account(
    hass: HomeAssistant, canvas: FakeCanvas, parent_entry: MockConfigEntry
) -> None:
    """A token for a different user aborts and leaves the entry unchanged."""
    result = await _start_reauth(hass, parent_entry)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_ACCESS_TOKEN: ALICE_TOKEN}
    )
    assert result["type"] is FlowResultType.ABORT
    assert result["reason"] == "wrong_account"
    _assert_translated(result)
    assert parent_entry.data[CONF_ACCESS_TOKEN] == PARENT_TOKEN


async def test_reauth_invalid_token_then_recovery(
    hass: HomeAssistant, canvas: FakeCanvas, parent_entry: MockConfigEntry
) -> None:
    """A rejected token shows an error and leaves the entry unchanged."""
    result = await _start_reauth(hass, parent_entry)
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_ACCESS_TOKEN: "still-wrong"}
    )
    assert result["type"] is FlowResultType.FORM
    assert result["errors"] == {"base": "invalid_auth"}
    _assert_translated(result)
    assert parent_entry.data[CONF_ACCESS_TOKEN] == PARENT_TOKEN

    canvas.accounts["new-parent-token"] = PARENT
    result = await hass.config_entries.flow.async_configure(
        result["flow_id"], {CONF_ACCESS_TOKEN: "new-parent-token"}
    )
    await hass.async_block_till_done()
    assert result["reason"] == "reauth_successful"


def test_translations_match_strings() -> None:
    """The English translation is the strings file, and both steps are described."""
    assert json.loads((COMPONENT / "translations" / "en.json").read_text()) == STRINGS
    steps = STRINGS["config"]["step"]
    assert set(steps["user"]["data"]) == {CONF_URL, CONF_ACCESS_TOKEN}
    assert set(steps["user"]["data_description"]) == {CONF_URL, CONF_ACCESS_TOKEN}
    assert set(steps["reauth_confirm"]["data"]) == {CONF_ACCESS_TOKEN}
    assert set(steps["reauth_confirm"]["data_description"]) == {CONF_ACCESS_TOKEN}
