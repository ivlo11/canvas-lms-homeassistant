# Proposal

## Why

The courses card can show *Configuration error* until the page is reloaded. There are two causes.

**Pages opened while Home Assistant is starting.** The frontend starts serving pages before custom integrations are set up. Each page's list of extra modules is fixed when the page is built. This card is added to that list with `add_extra_js_url` in the integration's `async_setup`, so a page built before then has no script for the card. None of the card's code runs, and the dashboard waits for an element that's never defined. A wall tablet or the companion app on the default dashboard reconnects during every restart, so this happens often.

**A cold reload on Home Assistant 2026.8 to 2026.10.** Those releases load a polyfill that replaces `window.customElements` while the page boots. A module added with `add_extra_js_url` can run before the polyfill. When it does, its `customElements.define()` lands in the browser's own registry, which the dashboard no longer reads. The bug was reported in [home-assistant/frontend#53890](https://github.com/home-assistant/frontend/issues/53890) and [home-assistant/frontend#52960](https://github.com/home-assistant/frontend/issues/52960), and fixed in HA 2026.11.0 by [home-assistant/frontend#54444](https://github.com/home-assistant/frontend/pull/54444).

Users shouldn't have to upgrade Home Assistant, which risks other regressions, or reload the page to use the card.

The frontend serves `/local` from `config/www` as soon as it starts, before any custom integration. Dashboard resources are read from the dashboard's own storage, which is also ready then. Home Assistant 2026.11's built-in Marketplace relies on the same pair: it installs cards into `config/www/community` and points their dashboard resources at `/local/community`. HACS's `/hacsfiles` path, and the Marketplace's copy of it, are registered during integration setup, so they have the same startup gap as this card does today.

## What Changes

- **Load from `/local`.** At setup the integration copies the card's bundle into `config/www/canvas_lms_edu/` and keeps one dashboard resource pointing at it. Resources are shared by all dashboards, so pages opened while Home Assistant is starting load the card on UI and YAML dashboards alike. The exception is an install that keeps its resources in YAML (`lovelace: resource_mode: yaml`), where nothing is written.
- **Keep the extra module.** The card is still added with `add_extra_js_url`, for resources kept in YAML, for the first start after `config/www` is created, and if the resource is removed by hand.
- **Repair a lost definition.** The card and its editor check, once the dashboard app has booted, that their elements are in the registry the dashboard uses. If one is missing, it's defined again there, and the dashboard rebuilds the card by itself. A fallback timer covers boots where that signal is missed. Each repair is logged once to the browser console.
- **Load twice safely.** With both a resource and an extra module the bundle can run twice. Defining an element that's already defined does nothing instead of throwing.
- **Clean up.** Removing the last Canvas entry removes the dashboard resource and the copied files.
- On Home Assistant 2026.11 and later, and on releases before 2026.8, nothing is repaired or logged.
- This ships on `fix/card-older-webviews` together with the ES2019 build already there. The spec records all three: the card loads on older phone WebViews, it survives a cold reload, and it loads on pages opened while Home Assistant starts.

### Out of scope

- Publishing the card separately in HACS or the Marketplace.
- A minimum Home Assistant version for the integration.
- Editing `configuration.yaml`. Users who keep resources in YAML add the resource line themselves, as the docs describe.
- A built-in `todo` or `calendar` platform as an alternative view.

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `courses-dashboard-card`: the card is available after a cold reload on every supported Home Assistant release, on pages opened while Home Assistant starts, and on older phone WebViews. Its files and resource are removed with the integration.

## Impact

- **Backend:** `__init__.py` copies the bundle into `config/www/canvas_lms_edu/`, keeps the dashboard resource up to date, and removes both with the last entry. The manifest adds `lovelace` to `dependencies`. The resource is managed through Home Assistant's internal dashboard resource collection, as the core Marketplace and HACS do, since there's no public API.
- **Frontend:** a small helper that defines an element and repairs a lost definition, used by the card and the editor. The bundle is rebuilt and stays ES2019.
- **Files written outside the integration:** `config/www/canvas_lms_edu/`, and one entry in the dashboard resource storage.
- **Tests:** backend tests for the copy, the resource and the cleanup; frontend unit tests for the repair. The existing extra-module tests are unchanged. New end-to-end tests in `e2e/` run Home Assistant 2026.10 and 2026.11 containers against a stub Canvas, locally, and are ready for CI. The GitHub Actions workflows land separately on `ci/github-actions`.
- **Documentation:** `docs/courses-card.md` (the resource is added for you; the line to add when resources are kept in YAML), `docs/frontend-development.md` (both load paths, why elements go through the helper, and when it can be removed), `docs/known-limitations.md`, and `docs/e2e-tests.md` (running the end-to-end tests).
