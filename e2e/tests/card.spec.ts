// The courses card in a real Home Assistant: how it loads, and its cleanup.
// Covers the manual checks of the fix-card-lost-registration change.
import { existsSync } from "node:fs";
import { resolve } from "node:path";

import { expect, test, type Page } from "@playwright/test";

import {
  CONFIG,
  DOMAIN,
  EXTRA_MODULE_PATH,
  HA_URL,
  HA_VERSION,
  LOCAL_PATH,
  UI_DASHBOARD,
  YAML_DASHBOARD,
  api,
  cardResources,
  compose,
  readState,
  versionAtLeast,
  waitFor,
  waitForRunning,
} from "../src/ha";

const DASHBOARDS = { ui: `/${UI_DASHBOARD}/canvas`, yaml: `/${YAML_DASHBOARD}/0` } as const;
const REPAIR_LOG = "again in the dashboard's registry";
const RACE_FIXED = versionAtLeast(2026, 11);

const extraModule = new RegExp(`/${DOMAIN}/frontend/`);
const localCopy = new RegExp(`/local/${DOMAIN}/`);

test.describe.configure({ mode: "serial" });

/** The card rendered its class list, and the dashboard shows no error card. */
async function expectCardRenders(page: Page, timeout = 60_000): Promise<void> {
  const card = page.locator("canvas-lms-courses-card");
  await expect(card.getByText("Algebra")).toBeVisible({ timeout });
  await expect(page.locator("hui-error-card")).toHaveCount(0);
}

/** Record what a test observed, in the report and the CI log. */
function note(type: string, description: string): void {
  test.info().annotations.push({ type, description });
  console.log(`[${type}] ${description}`);
}

function repairLines(page: Page): string[] {
  const lines: string[] = [];
  page.on("console", (message) => {
    if (message.text().includes(REPAIR_LOG)) lines.push(message.text());
  });
  return lines;
}

test("the card's copy is served and listed once as a dashboard resource", async ({ request }) => {
  const { accessToken } = readState();
  const resources = await cardResources(accessToken);
  expect(resources).toHaveLength(1);
  expect(resources[0].type).toBe("module");

  const response = await request.get(resources[0].url);
  expect(response.status()).toBe(200);
  expect(await response.text()).toContain("canvas-lms-courses-card");
  expect(existsSync(resolve(CONFIG, "www", DOMAIN, "canvas-lms-courses-card.js"))).toBe(true);
});

for (const [kind, path] of Object.entries(DASHBOARDS)) {
  test(`${kind} dashboard: the resource alone loads the card, as on a page built during startup`, async ({
    page,
  }) => {
    // A page built before the integration's setup has no extra module.
    await page.route(extraModule, (route) => route.abort());
    await page.goto(path);
    await expectCardRenders(page);
  });

  test(`${kind} dashboard: the extra module alone loads the card, as with resources in YAML`, async ({
    page,
  }) => {
    await page.route(localCopy, (route) => route.abort());
    await page.goto(path);
    await expectCardRenders(page);
  });

  test(`${kind} dashboard: loading the card twice renders it once without errors`, async ({ page }) => {
    const errors: string[] = [];
    page.on("pageerror", (err) => errors.push(err.message));
    page.on("console", (message) => {
      if (message.type() === "error" && message.text().includes("canvas-lms")) errors.push(message.text());
    });
    await page.goto(path);
    await expectCardRenders(page);
    await expect(page.locator("canvas-lms-courses-card")).toHaveCount(1);
    expect(errors).toEqual([]);
  });
}

test("a dashboard opened while Home Assistant restarts renders the card without a reload", async ({
  page,
  request,
}) => {
  const { accessToken } = readState();
  compose("restart", "homeassistant");
  await waitFor(
    "the frontend to answer",
    async () => {
      const response = await request.get(DASHBOARDS.ui, { timeout: 2_000, failOnStatusCode: false });
      return response.ok() ? true : undefined;
    },
    180_000,
    100,
  );

  // The HTML this page is built from tells whether the integration had added
  // its extra module yet.
  const response = await page.goto(DASHBOARDS.ui);
  const html = (await response?.text()) ?? "";
  const builtBeforeSetup = !html.includes(EXTRA_MODULE_PATH);
  note(
    "startup window",
    builtBeforeSetup
      ? "the page was built before the integration's setup: only the resource could load the card"
      : "the integration was already set up when the page was built",
  );

  await expectCardRenders(page, 180_000);
  await waitForRunning(accessToken);
});

test("a cold reload on a slow network renders the card and opens its editor", async ({ page }) => {
  const repairs = repairLines(page);
  await page.goto(DASHBOARDS.ui);
  await expectCardRenders(page);
  const firstLoad = repairs.splice(0);

  // Chrome DevTools' "Slow 4G" preset, with the cache disabled.
  const cdp = await page.context().newCDPSession(page);
  await cdp.send("Network.enable");
  await cdp.send("Network.setCacheDisabled", { cacheDisabled: true });
  await cdp.send("Network.emulateNetworkConditions", {
    offline: false,
    latency: 562.5,
    downloadThroughput: 180_000,
    uploadThroughput: 84_375,
  });
  await page.reload();
  await expectCardRenders(page, 240_000);

  // The editor is defined in the registry the dashboard uses now.
  const editorDefined = await page.evaluate(
    () => document.createElement("canvas-lms-courses-card-editor").constructor !== HTMLElement,
  );
  expect(editorDefined).toBe(true);

  note(
    "registry repairs",
    `Home Assistant ${HA_VERSION}: ${firstLoad.length} on the first load, ${repairs.length} on the cold reload`,
  );
  if (RACE_FIXED) {
    expect([...firstLoad, ...repairs]).toEqual([]);
  } else {
    // At most once per element and page load.
    for (const lines of [firstLoad, repairs]) {
      for (const tag of ["<canvas-lms-courses-card>", "<canvas-lms-courses-card-editor>"]) {
        expect(lines.filter((line) => line.includes(tag)).length).toBeLessThanOrEqual(1);
      }
    }
  }
});

test("removing the only entry removes the resource and the copy", async ({ request }) => {
  const { accessToken, entryId } = readState();
  await api(accessToken, `/api/config/config_entries/entry/${entryId}`, { method: "DELETE" });

  await waitFor("the resource to go", async () =>
    (await cardResources(accessToken)).length === 0 ? true : undefined,
  );
  expect(existsSync(resolve(CONFIG, "www", DOMAIN))).toBe(false);
  expect(existsSync(resolve(CONFIG, "www"))).toBe(true);
  const response = await request.get(`${HA_URL}${LOCAL_PATH}`, { failOnStatusCode: false });
  expect(response.status()).toBe(404);
});
