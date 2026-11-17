# Developing the courses card

The card's source is in `frontend/`: TypeScript and [Lit](https://lit.dev), bundled by esbuild into one file, `custom_components/canvas_lms_edu/frontend/canvas-lms-courses-card.js`.

That bundle is committed, so people installing the integration need no Node.js. Node.js is needed only to change the card.

## Setup

Requires Node.js 22.12 or later. Run the commands from the `frontend/` folder.

```bash
npm ci
```

## Commands

Build the bundle into the integration:

```bash
npm run build
```

Rebuild whenever a source file changes:

```bash
npm run watch
```

Run the tests, which include the check that the committed bundle matches the source:

```bash
npm test
```

Check only that the committed bundle matches the source:

```bash
npm run check:bundle
```

Check the types:

```bash
npm run typecheck
```

## Browser support

The bundle is built for ES2019 so that it loads in the older WebViews found on phones and tablets, including the Home Assistant mobile apps on devices that no longer get system updates. A test fails if newer syntax reaches the bundle.

## After changing the card

1. Run `npm run build`.
2. Run `npm test`.
3. Commit the source and the rebuilt bundle together. `npm test` and `npm run check:bundle` fail when the bundle was not rebuilt.

## How Home Assistant loads the card

The integration loads the bundle in two ways, set up in `custom_components/canvas_lms_edu/__init__.py` and `card.py`:

- **A dashboard resource.** At setup the bundle is copied to `config/www/canvas_lms_edu/` and a `module` resource points at `/local/canvas_lms_edu/canvas-lms-courses-card.js`. The frontend serves `/local` and dashboard resources from the moment it starts, before custom integrations are set up, so pages opened during startup get the card. There's no public API for resources; `card.py` uses the same internal collection as Home Assistant's Marketplace and HACS, and logs a warning if that fails. Nothing is written when resources are kept in YAML, and the resource waits a restart when `config/www` had to be created, since `/local` is only served if the folder existed at startup. Removing the last entry removes the resource and the folder.
- **An extra module.** `add_extra_js_url` adds `/canvas_lms_edu/frontend/canvas-lms-courses-card.js` to every page built after setup. It covers resources kept in YAML, the first start, and a resource removed by hand.

Both URLs carry the integration's version and a hash of the bundle, so a rebuilt bundle gets new URLs when Home Assistant restarts. With both in place the bundle runs twice on a page; the second run defines nothing.

## Why elements go through `defineElement`

The card and the editor are defined with `defineElement` from `frontend/src/define.ts`, not `customElements.define`. Home Assistant 2026.8 to 2026.10 replace `window.customElements` with a polyfill while the page boots ([home-assistant/frontend#52960](https://github.com/home-assistant/frontend/issues/52960)). If the card's module runs first, its elements land in a registry the dashboard no longer reads, and the card shows *Configuration error*. `defineElement` checks once the dashboard app has defined `home-assistant`, or after 5 seconds, and defines a missing element again in the registry in use. It logs one `console.info` line when it does.

Home Assistant 2026.11 fixed the race. Once the integration requires 2026.11 or later, `defineElement` can be reduced to a guarded `customElements.define`. The loading in the previous section stays: it's about startup, not the race.

## Trying it in Home Assistant

Restart Home Assistant after rebuilding, so the copy in `config/www` and both URLs are updated. Without a restart, reload the browser page with the cache disabled; it still gets the old copy from `/local`.

## Layout

| Path | Contents |
|---|---|
| `frontend/src/canvas-lms-courses-card.ts` | The card element and its registration with the card picker. |
| `frontend/src/editor.ts` | The visual editor. |
| `frontend/src/define.ts` | Defining the elements, and defining them again if the dashboard's registry loses them. |
| `frontend/src/courses.ts` | Finding a student's course sensors in `hass`. |
| `frontend/src/sort.ts`, `frontend/src/format.ts` | Sorting assignments; grade, date and points text. |
| `frontend/src/styles.ts` | Styles, using Home Assistant theme variables only. |
| `frontend/test/` | Vitest tests against a fake `hass`. |
| `frontend/build.mjs` | The build, watch and bundle check. |
