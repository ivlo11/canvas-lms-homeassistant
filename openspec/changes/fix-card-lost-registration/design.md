# Design

## Context

See proposal.md for why. The card module defines two elements at the bottom of their files: `canvas-lms-courses-card` and `canvas-lms-courses-card-editor`. Each is guarded by `customElements.get()`. `async_setup` serves the bundle at `/canvas_lms_edu/frontend/` and adds it with `add_extra_js_url`, with `?v=<version>-<hash>`.

**Startup.** Home Assistant sets up `frontend` in boot stage 0 and starts the HTTP server then. The frontend registers `/local` for `config/www` at that point, but only if the folder exists. Custom integrations are set up later. A page requested in between is built with the extra modules known at that moment, so the card's script isn't in it. Dashboard resources are different: the page asks for them over the websocket when the dashboard loads, and `lovelace` (a dependency of `frontend`) holds them in its own storage from stage 0.

**Registry race.** Home Assistant's dashboard creates a custom card like this: if the tag isn't defined, it shows an error card after 2 seconds, and waits on `customElements.whenDefined(tag)` to rebuild. Once the polyfill has replaced the registry, both calls go to the polyfill. A definition made in the native registry before the swap is invisible to it, so `whenDefined` never resolves.

The workaround in [benct/lovelace-multiple-entity-row#434](https://github.com/benct/lovelace-multiple-entity-row/pull/434) shows that the dashboard app defines `home-assistant` after installing the polyfill, and the polyfill also defines onto the native registry. So `whenDefined("home-assistant")` resolves on whichever registry the module saw at load, and a check made then sees the final registry.

## Goals / Non-Goals

**Goals:**
- The card renders on any dashboard, UI or YAML, opened while Home Assistant is starting, with no user action, when resources are kept in storage (the default).
- The card renders after a cold reload on HA 2026.8 to 2026.10, with no user action.
- No effect, apart from one extra lookup, on releases without the polyfill race.
- One install: no separate card download.
- Stays within the ES2019 build.

**Non-Goals:**
- Editing `configuration.yaml` when resources are kept in YAML.
- Fixing other custom cards, or HA's own error card text.

## Decisions

### D1. One helper for every element

`frontend/src/define.ts` exports `defineElement(tag, constructor)`:

1. Read `window.customElements` and keep it as the load-time registry. Define the tag there unless it's already defined.
2. Arm two triggers, each running the check at most once:
   - **boot:** `loadRegistry.whenDefined("home-assistant")` resolves
   - **fallback:** a 5-second timer
3. **Check:** read `window.customElements` again. If `get(tag)` is undefined, define the tag there and log `console.info` once with the tag and the trigger.

The card and the editor both use it in place of their guarded `define` calls.

- *Alternative: poll the registry.* Wasteful and slower than the boot signal.
- *Alternative: listen for a frontend event.* There's no public event for the polyfill being installed.

### D2. Define again with a subclass

The repair defines `class extends constructor {}` rather than the original constructor. A registry implementation may refuse a constructor that's already been used in another registry. A subclass behaves the same: same prototype chain, same static methods (`getConfigElement`, `getStubConfig`). A failed repair is caught and logged with `console.warn`, so the card behaves no worse than today.

### D3. When to remove the repair

Once the integration requires Home Assistant 2026.11 or later, the helper can be reduced to the guarded define. `docs/frontend-development.md` says so, naming the frontend issue. D4 to D8 stay: the startup gap isn't tied to a release.

### D4. Copy the bundle into `config/www`

In `async_setup`, before the extra module is added, the integration:

1. Notes whether `config/www` exists. That decides whether the frontend is serving `/local` in this run.
2. Creates `config/www/canvas_lms_edu/` if needed and copies the bundle there as `canvas-lms-courses-card.js`, only when the contents differ. File work runs in the executor.

The folder is named after the domain, so it can't clash with the Marketplace's `community/` folder or the user's own files. A failed copy logs a warning and setup goes on: the extra module still serves the card.

- *Alternative: a resource pointing at `/canvas_lms_edu/frontend/`.* That path is registered by this integration, so it has the same startup gap.
- *Alternative: publish the card in HACS or the Marketplace.* A second install, version skew with the integration, and `/hacsfiles` has the same gap on releases before 2026.11.

### D5. Keep one dashboard resource up to date

When dashboard resources are kept in storage (`hass.data[LOVELACE_DATA].resource_mode == "storage"`) and `config/www` existed at the start of setup, the integration makes sure the resource collection holds exactly one item of type `module` whose URL path is `/local/canvas_lms_edu/canvas-lms-courses-card.js`:

- none → create it with `?v=<version>-<hash>`, the same version the extra module uses
- one with another `?v=` → update its URL
- more than one → keep the first, delete the rest

If `config/www` had to be created, the resource is left for the next start, because `/local` isn't served until then, and an info line is logged. In YAML resource mode nothing is written.

Resources are global, not per dashboard. The frontend fetches them once per page (`fetchResources` in `ha-panel-lovelace.ts`) whatever the dashboard's own mode. So the resource also covers dashboards defined in YAML, under `lovelace: dashboards:` or created in the UI as YAML. Resources are in YAML only when `configuration.yaml` sets `lovelace: resource_mode: yaml`, or the deprecated `lovelace: mode: yaml` without `resource_mode`. Only then does the user add the resource line.

The collection is Home Assistant's internal `ResourceStorageCollection`, the same one the core Marketplace and HACS write to; there's no public API. Its calls are wrapped so that any error logs a warning and leaves the extra module in place. `lovelace` is added to the manifest's `dependencies`, since the integration now imports it.

- *Alternative: a repair issue asking the user to add the resource.* Non-technical users wouldn't act on it, and the default dashboard would keep failing at startup.

### D6. Keep the extra module

`add_extra_js_url` stays. It loads the card when resources are in YAML, on the first start after `config/www` is created, and if the user deletes the resource. With resources in storage the bundle then loads twice from two URLs. The guard in D1 makes the second load define nothing.

- *Alternative: drop the extra module when the resource exists.* Saves one request per page, but the card would vanish whenever the resource is missing.

### D7. Clean up with the last entry

`async_remove_entry` checks whether another Canvas entry remains. If none does, it deletes the dashboard resource items with the card's URL path and the `config/www/canvas_lms_edu/` folder. Errors log a warning. Integrations set up only from config entries aren't set up again once no entry remains, so nothing re-adds them on the next start.

### D8. The resource follows the integration

A user who deletes the resource gets it back on the next start. The docs say to remove the integration instead. Changes to the resource's URL made by hand are replaced in the same way.

### D9. Check in real Home Assistant containers, in CI

The checks run as Playwright tests in `e2e/`, against the official Home Assistant image at a given tag and a stub Canvas built on the standard library. Global setup onboards through the onboarding API, adds the entry through the config flow, and saves a UI dashboard and a YAML dashboard with the card. They're run for 2026.10.4, which has the race, and 2026.11.2, which doesn't. They need only Docker and Node.js, so CI can run them as they are; the workflow lands separately on `ci/github-actions`.

- The startup case is tested twice: deterministically, by blocking the extra module so only the resource can load the card, and for real, by opening the dashboard as soon as the frontend answers after a restart and recording whether that page was built before the integration's setup.
- The race test uses Chrome's Slow 4G preset with the cache disabled, through the DevTools protocol.
- The service worker is blocked, so `page.route` sees every request.
- `INTEGRATION_DIR` mounts another copy of the integration, to confirm a test fails without the fix.

- *Alternative: the Docker Canvas used for development.* Too large for CI, and the tests need only four requests.

## Risks / Trade-offs

- [The internal resource API changes] → Calls are guarded. The card falls back to the extra module and the startup gap returns until the integration is updated. Tests run against the pinned Home Assistant version.
- [Writing into the user's `config/www`] → One folder named after the domain, removed with the last entry. Files are only rewritten when they differ.
- [`config/www` didn't exist] → The first start creates it and skips the resource. The card loads as before, and the startup fix starts with the next restart. The Marketplace has the same rule.
- [Another integration creates `config/www` earlier in the same start] → The resource is created but `/local` isn't served until the next restart, so that script fails to load. The extra module still loads the card.
- [Files left behind if the integration's files are deleted without removing the entry] → Documented. The resource then points at a file that's still there and still works.
- [Pages opened during startup before the entry is set up] → The card renders from the device and entity registries, which load first. Grades show a dash until states arrive, and opening a class says it couldn't load and offers **Try again**, until the action is registered.
- [The `home-assistant` signal changes in a future frontend] → The 5-second fallback still repairs. HA's error card shows for up to 5 seconds before the rebuild.
- [Two definitions co-exist, native and scoped] → Only the dashboard's registry is used to create elements, so the native one is inert.
- [The timer runs on every page] → It runs once, does one lookup, and is cleared when the boot trigger has already checked.
- [Not reproducible in unit tests with a real polyfill or a real boot] → Unit tests swap a fake registry and call setup with and without `config/www`. End-to-end tests (D9) cover the real boot and the real polyfill.
