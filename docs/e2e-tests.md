# End-to-end tests

The end-to-end tests run the integration in a real Home Assistant container and check the courses card in a real browser. They live in `e2e/`, and need only Docker and Node.js, so a CI pipeline can run them the same way as a developer.

They cover what unit tests can't: how Home Assistant loads the card while it starts, the custom element registry race in Home Assistant 2026.8 to 2026.10, and the card's cleanup when the integration is removed.

## What runs

`e2e/compose.yaml` starts two containers:

- **canvas:** a stub Canvas (`e2e/canvas-stub/server.py`) with one student, Alice, one course, Algebra, and one unsubmitted assignment. It answers only the requests the integration makes, for the token `e2e-token`.
- **homeassistant:** the official image at `HA_VERSION`, with `custom_components/canvas_lms_edu` mounted read-only and a fresh copy of `e2e/config/` as its config folder.

Before the tests, global setup:

1. onboards Home Assistant with a generated owner, saved in `e2e/run/owner.json`;
2. adds the Canvas entry through the config flow, pointing at the stub;
3. puts the card on a dashboard managed in the UI (`/canvas-ui`) and on a YAML dashboard (`/canvas-yaml`).

Everything the run writes is in `e2e/run/`, which is ignored by git and replaced on every run.

## The tests

| Test | What it shows |
|---|---|
| The copy is listed once as a resource | The bundle is copied to `config/www/canvas_lms_edu/`, served at `/local`, and listed once as a `module` resource. |
| The resource alone loads the card | With the extra module blocked, as on a page built while Home Assistant starts, the card renders on both dashboards. |
| The extra module alone loads the card | With `/local` blocked, as when resources are kept in YAML, the card renders on both dashboards. |
| Loading the card twice | With both in place, one card renders and nothing is logged as an error. |
| Opened while Home Assistant restarts | After a restart, the dashboard is opened as soon as the frontend answers, and the card renders without a reload. The report notes whether that page was built before the integration's setup. |
| Cold reload on a slow network | With Chrome's *Slow 4G* preset and the cache disabled, the card renders and its editor is defined. The report notes how many registry repairs were logged: none on 2026.11 and later, at most one per element and page load before. |
| Removing the only entry | The resource and `config/www/canvas_lms_edu/` are removed, and `/local` no longer serves the card. |

The tests set `serviceWorkers: "block"` in `e2e/playwright.config.ts`, since requests made by Home Assistant's service worker can't be blocked with `page.route`.

## Running them

You need Docker and Node.js 24.

```bash
cd e2e
npm ci
npx playwright install chromium
HA_VERSION=2026.10.4 npx playwright test
```

| Variable | Default | Use |
|---|---|---|
| `HA_VERSION` | `2026.10.4` | The Home Assistant image tag. |
| `HA_PORT` | `8123` | The port Home Assistant is published on. |
| `INTEGRATION_DIR` | `../custom_components/canvas_lms_edu` | Another copy of the integration, for example an older commit, to check that a test fails without a fix. |
| `E2E_KEEP` | unset | Leave the containers running after the tests. |

A run takes about two minutes once the images are pulled. On failure, `npx playwright show-trace` opens the trace in `e2e/test-results/`.

To check a test against the integration as it was before a change:

```bash
git archive HEAD custom_components/canvas_lms_edu | tar -x -C /tmp/before
INTEGRATION_DIR=/tmp/before/custom_components/canvas_lms_edu HA_VERSION=2026.10.4 npx playwright test -g restarts
```
