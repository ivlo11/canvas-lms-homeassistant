"""Config flow for the Canvas LMS integration."""

from __future__ import annotations

from collections.abc import Mapping
from typing import Any

import voluptuous as vol

from homeassistant.config_entries import ConfigFlow, ConfigFlowResult
from homeassistant.const import CONF_ACCESS_TOKEN, CONF_NAME, CONF_URL
from homeassistant.helpers.selector import (
    TextSelector,
    TextSelectorConfig,
    TextSelectorType,
)

from .api import (
    CanvasAuthError,
    CanvasConnectionError,
    CanvasUser,
    InvalidUrl,
    async_validate,
    host_from_url,
    normalize_url,
)
from .const import CONF_USER_ID, DOMAIN, LOGGER

_TOKEN_SELECTOR = TextSelector(TextSelectorConfig(type=TextSelectorType.PASSWORD))

USER_SCHEMA = vol.Schema(
    {
        vol.Required(CONF_URL): TextSelector(
            TextSelectorConfig(type=TextSelectorType.URL)
        ),
        vol.Required(CONF_ACCESS_TOKEN): _TOKEN_SELECTOR,
    }
)
REAUTH_SCHEMA = vol.Schema({vol.Required(CONF_ACCESS_TOKEN): _TOKEN_SELECTOR})


def _unique_id(url: str, account: CanvasUser) -> str:
    """Identify an account by Canvas host and user id."""
    return f"{host_from_url(url)}_{account.id}"


class CanvasConfigFlow(ConfigFlow, domain=DOMAIN):
    """Add or reauthenticate a Canvas account."""

    VERSION = 1

    async def _async_validate(
        self, url: str, token: str, errors: dict[str, str]
    ) -> CanvasUser | None:
        """Return the token's account, or record why validation failed."""
        try:
            return await async_validate(url, token)
        except CanvasAuthError:
            errors["base"] = "invalid_auth"
        except CanvasConnectionError:
            errors["base"] = "cannot_connect"
        except Exception:
            LOGGER.exception("Unexpected error validating the Canvas account")
            errors["base"] = "unknown"
        return None

    async def async_step_user(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Ask for a Canvas URL and an access token."""
        errors: dict[str, str] = {}
        if user_input is not None:
            token = user_input[CONF_ACCESS_TOKEN].strip()
            account = None
            try:
                url = normalize_url(user_input[CONF_URL])
            except InvalidUrl:
                errors[CONF_URL] = "invalid_url"
            else:
                account = await self._async_validate(url, token, errors)
            if account is not None:
                await self.async_set_unique_id(_unique_id(url, account))
                self._abort_if_unique_id_configured()
                return self.async_create_entry(
                    title=f"{account.name} ({host_from_url(url)})",
                    data={
                        CONF_URL: url,
                        CONF_ACCESS_TOKEN: token,
                        CONF_USER_ID: account.id,
                        CONF_NAME: account.name,
                    },
                )
        return self.async_show_form(
            step_id="user",
            data_schema=self.add_suggested_values_to_schema(USER_SCHEMA, user_input),
            errors=errors,
        )

    async def async_step_reauth(
        self, entry_data: Mapping[str, Any]
    ) -> ConfigFlowResult:
        """Start reauthentication after Canvas rejected the token."""
        return await self.async_step_reauth_confirm()

    async def async_step_reauth_confirm(
        self, user_input: dict[str, Any] | None = None
    ) -> ConfigFlowResult:
        """Ask for a new access token for the same account."""
        errors: dict[str, str] = {}
        entry = self._get_reauth_entry()
        if user_input is not None:
            url = entry.data[CONF_URL]
            token = user_input[CONF_ACCESS_TOKEN].strip()
            account = await self._async_validate(url, token, errors)
            if account is not None:
                await self.async_set_unique_id(_unique_id(url, account))
                self._abort_if_unique_id_mismatch(reason="wrong_account")
                return self.async_update_reload_and_abort(
                    entry, data_updates={CONF_ACCESS_TOKEN: token}
                )
        return self.async_show_form(
            step_id="reauth_confirm",
            data_schema=REAUTH_SCHEMA,
            description_placeholders={"title": entry.title},
            errors=errors,
        )
