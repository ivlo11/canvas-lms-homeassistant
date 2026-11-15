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

## After changing the card

1. Run `npm run build`.
2. Run `npm test`.
3. Commit the source and the rebuilt bundle together. `npm test` and `npm run check:bundle` fail when the bundle was not rebuilt.

## Trying it in Home Assistant

Home Assistant serves the bundle at `/canvas_lms_edu/frontend/canvas-lms-courses-card.js` and loads it on every page. The URL carries the integration's version, so while developing, reload the browser page with the cache disabled to pick up a rebuilt bundle.

## Layout

| Path | Contents |
|---|---|
| `frontend/src/canvas-lms-courses-card.ts` | The card element and its registration with the card picker. |
| `frontend/src/editor.ts` | The visual editor. |
| `frontend/src/courses.ts` | Finding a student's course sensors in `hass`. |
| `frontend/src/sort.ts`, `frontend/src/format.ts` | Sorting assignments; grade, date and points text. |
| `frontend/src/styles.ts` | Styles, using Home Assistant theme variables only. |
| `frontend/test/` | Vitest tests against a fake `hass`. |
| `frontend/build.mjs` | The build, watch and bundle check. |
