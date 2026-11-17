# Tasks

Work on `fix/card-older-webviews`, which already holds the ES2019 build.

## 1. Define helper

- [x] 1.1 Add `frontend/src/define.ts` with `defineElement` as D1 and D2 describe; verify unit tests in `frontend/test/define.test.ts` with a fake registry swap for:
  - repair by the `home-assistant` trigger
  - repair by the 5-second fallback (fake timers)
  - no repair when the element is present
  - a second load that does nothing
  - one repair and one log only
  - a failed repair that logs a warning without throwing
- [x] 1.2 Use `defineElement` for the card and the editor in place of their guarded `define` calls; verify the existing card tests pass and a test that both tags are defined after the module loads

## 2. Load from `/local`

- [x] 2.1 In `__init__.py`, copy the bundle into `config/www/canvas_lms_edu/` as D4 describes; verify tests in `tests/test_frontend.py` that it's copied on setup, not rewritten when unchanged, rewritten when changed, that a missing `config/www` is created, and that a failed copy logs a warning while the extra module is still registered
- [x] 2.2 Keep one dashboard resource as D5 describes and add `lovelace` to the manifest's `dependencies`; verify tests that, in storage mode with `config/www` present, a resource is created with the same `?v=` as the extra module, an older URL is updated, duplicates are reduced to one, a rerun changes nothing; that nothing is written in YAML resource mode or when `config/www` was just created; that a collection error logs a warning; and update `test_manifest_depends_on_http_and_frontend`
- [x] 2.3 Keep `add_extra_js_url` as D6 describes; verify the existing extra-module tests pass unchanged
- [x] 2.4 Add `async_remove_entry` as D7 describes; verify tests that removing the last entry deletes the resource and the folder, that removing one of two entries keeps both, and that an error logs a warning

## 3. Bundle and docs

- [x] 3.1 Rebuild the bundle; verify `npm test`, `npm run typecheck` and `npm run check:bundle` pass, including the ES2019 syntax check, and `uv run pytest tests/test_frontend.py` passes with the new bundle hash
- [x] 3.2 In `docs/courses-card.md`, say that the dashboard resource is added for you and covers UI and YAML dashboards, give the `resources` line for installs that keep resources in YAML (`lovelace: resource_mode: yaml`) (`/local/canvas_lms_edu/canvas-lms-courses-card.js`, type `module`), and replace "reload the browser page" with when that's still needed
- [x] 3.3 In `docs/frontend-development.md`, describe both load paths (D4 to D6), why elements go through `defineElement`, and that the repair can be reduced once 2026.11 is the minimum version (D3), linking the frontend issue. Update "Trying it in Home Assistant" for the `/local` copy
- [x] 3.4 In `docs/known-limitations.md`, note: installs that keep resources in YAML need the resource line for pages opened during startup; the first start that creates `config/www` needs one more restart for the startup fix; the resource comes back if deleted by hand (D8); files stay if the integration is deleted without removing its entries. Verify the links resolve with `tests/test_docs.py`

## 4. Check

The checks run as end-to-end tests in `e2e/`, against Home Assistant containers and a stub Canvas, locally or in CI. See `docs/e2e-tests.md`. The CI workflow lands separately on `ci/github-actions`.

- [x] 4.1 Add the end-to-end harness: a stub Canvas, a compose file for Home Assistant at `HA_VERSION`, global setup that onboards, adds the entry through the config flow and puts the card on a UI dashboard and a YAML dashboard; verify `npm run typecheck` in `e2e/` and the compose file parses
- [x] 4.2 On 2026.10.4, keep a dashboard open through a restart; verify the page is built before the integration's setup and the card renders without a reload, on the UI and the YAML dashboard with only the resource loading, and that the resource is listed once. Verify the restart test fails with the integration from before this change (`INTEGRATION_DIR`) and the dashboard shows *Configuration error*
- [x] 4.3 On 2026.10.4, cold-reload under Chrome's Slow 4G preset with the cache disabled; verify the card renders, the editor is defined, and at most one repair line per element and page load is logged. Report whether the race reproduced
- [x] 4.4 Repeat 4.2 and 4.3 on 2026.11.2; verify the card renders and no repair line is logged
- [x] 4.5 Remove the only Canvas entry; verify the resource and `config/www/canvas_lms_edu/` are gone and `/local` no longer serves the card
- [ ] 4.6 Open the dashboard in the Home Assistant iOS or Android app on an older WebView if one is available, or report that it isn't; verify the card renders
- [x] 4.7 Run `uv run pytest --cov`, `uv run ruff check . && uv run ruff format --check .`; verify all pass

## Workflow follow-up

- Commit on `fix/card-older-webviews` with the ES2019 build, then sync the delta spec and archive the change after review.
