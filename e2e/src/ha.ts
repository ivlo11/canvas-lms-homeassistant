// Drive a Home Assistant container for the end-to-end tests: start it, onboard
// it, add the Canvas entry and the dashboards, and talk to its API.
import { execFileSync } from "node:child_process";
import { randomBytes } from "node:crypto";
import { cpSync, existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

export const E2E = resolve(dirname(fileURLToPath(import.meta.url)), "..");
export const RUN = resolve(E2E, "run");
export const CONFIG = resolve(RUN, "config");
export const STATE = resolve(RUN, "state.json");
export const STORAGE_STATE = resolve(RUN, "storage-state.json");

export const HA_VERSION = process.env.HA_VERSION ?? "2026.10.4";
export const HA_PORT = process.env.HA_PORT ?? "8123";
export const HA_URL = `http://localhost:${HA_PORT}`;
const CLIENT_ID = `${HA_URL}/`;

export const DOMAIN = "canvas_lms_edu";
export const LOCAL_PATH = `/local/${DOMAIN}/canvas-lms-courses-card.js`;
export const EXTRA_MODULE_PATH = `/${DOMAIN}/frontend/canvas-lms-courses-card.js`;
export const YAML_DASHBOARD = "canvas-yaml";
export const UI_DASHBOARD = "canvas-ui";

/** What global setup hands the tests. */
export interface State {
  accessToken: string;
  refreshToken: string;
  expiresIn: number;
  entryId: string;
  deviceId: string;
}

/** Whether `HA_VERSION` is at least `year.month`. */
export function versionAtLeast(year: number, month: number): boolean {
  const [y, m] = HA_VERSION.split(".").map(Number);
  return y > year || (y === year && m >= month);
}

export function compose(...args: string[]): string {
  return execFileSync("docker", ["compose", "-f", resolve(E2E, "compose.yaml"), ...args], {
    env: { ...process.env, HA_VERSION, HA_PORT },
    encoding: "utf8",
    stdio: ["ignore", "pipe", "inherit"],
  });
}

/** Start from a fresh copy of the config template, with `config/www` present. */
export function resetConfig(): void {
  compose("down", "--volumes", "--remove-orphans");
  if (existsSync(RUN)) {
    try {
      rmSync(RUN, { recursive: true, force: true });
    } catch {
      // Files the container wrote as root on Linux.
      execFileSync("docker", ["run", "--rm", "-v", `${E2E}:/e2e`, "alpine:3.22", "rm", "-rf", "/e2e/run"]);
    }
  }
  mkdirSync(RUN, { recursive: true });
  cpSync(resolve(E2E, "config"), CONFIG, { recursive: true });
}

export async function waitFor<T>(
  what: string,
  check: () => Promise<T | undefined>,
  timeoutMs = 180_000,
  intervalMs = 500,
): Promise<T> {
  const deadline = Date.now() + timeoutMs;
  let last: unknown;
  while (Date.now() < deadline) {
    try {
      const value = await check();
      if (value !== undefined) return value;
    } catch (err) {
      last = err;
    }
    await new Promise((r) => setTimeout(r, intervalMs));
  }
  throw new Error(`Timed out waiting for ${what}${last ? `: ${String(last)}` : ""}`);
}

export async function api<T = unknown>(
  token: string,
  path: string,
  init: { method?: string; body?: unknown } = {},
): Promise<T> {
  const response = await fetch(`${HA_URL}${path}`, {
    method: init.method ?? (init.body === undefined ? "GET" : "POST"),
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: init.body === undefined ? undefined : JSON.stringify(init.body),
  });
  if (!response.ok) throw new Error(`${init.method ?? "GET"} ${path}: ${response.status} ${await response.text()}`);
  const text = await response.text();
  return (text ? JSON.parse(text) : undefined) as T;
}

/** Wait until Home Assistant reports it has fully started. */
export async function waitForRunning(token: string): Promise<void> {
  await waitFor("Home Assistant to start", async () => {
    const config = await api<{ state: string }>(token, "/api/config");
    return config.state === "RUNNING" ? true : undefined;
  });
}

/** Onboard a fresh instance with a generated test owner; return its tokens. */
export async function onboard(): Promise<Pick<State, "accessToken" | "refreshToken" | "expiresIn">> {
  await waitFor("the onboarding API", async () => {
    const response = await fetch(`${HA_URL}/api/onboarding`);
    return response.ok ? true : undefined;
  });
  const password = randomBytes(18).toString("base64url");
  writeFileSync(resolve(RUN, "owner.json"), JSON.stringify({ username: "e2e", password }));

  const user = await fetch(`${HA_URL}/api/onboarding/users`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ client_id: CLIENT_ID, name: "E2E", username: "e2e", password, language: "en" }),
  });
  if (!user.ok) throw new Error(`onboarding user: ${user.status} ${await user.text()}`);
  const { auth_code } = (await user.json()) as { auth_code: string };

  const tokenResponse = await fetch(`${HA_URL}/auth/token`, {
    method: "POST",
    body: new URLSearchParams({ grant_type: "authorization_code", code: auth_code, client_id: CLIENT_ID }),
  });
  if (!tokenResponse.ok) throw new Error(`token: ${tokenResponse.status} ${await tokenResponse.text()}`);
  const tokens = (await tokenResponse.json()) as {
    access_token: string;
    refresh_token: string;
    expires_in: number;
  };
  const token = tokens.access_token;
  await api(token, "/api/onboarding/core_config", { body: {} });
  await api(token, "/api/onboarding/analytics", { body: {} });
  await api(token, "/api/onboarding/integration", {
    body: { client_id: CLIENT_ID, redirect_uri: `${HA_URL}/?auth_callback=1` },
  });
  return { accessToken: token, refreshToken: tokens.refresh_token, expiresIn: tokens.expires_in };
}

/** Add the Canvas entry through the config flow, against the stub Canvas. */
export async function addCanvasEntry(token: string): Promise<{ entryId: string; deviceId: string }> {
  const flow = await api<{ flow_id: string }>(token, "/api/config/config_entries/flow", {
    body: { handler: DOMAIN, show_advanced_options: false },
  });
  const result = await api<{ type: string; result?: { entry_id: string } }>(
    token,
    `/api/config/config_entries/flow/${flow.flow_id}`,
    { body: { url: "http://canvas:8080", access_token: "e2e-token" } },
  );
  if (result.type !== "create_entry" || !result.result) {
    throw new Error(`config flow did not create an entry: ${JSON.stringify(result)}`);
  }
  const entryId = result.result.entry_id;
  const deviceId = await waitFor("the student's device", async () => {
    const devices = await template(
      token,
      `{{ integration_entities('${DOMAIN}') | map('device_id') | reject('none') | first | default('') }}`,
    );
    return devices || undefined;
  });
  return { entryId, deviceId };
}

/** Render a template through the REST API. */
export async function template(token: string, source: string): Promise<string> {
  const response = await fetch(`${HA_URL}/api/template`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify({ template: source }),
  });
  if (!response.ok) throw new Error(`template: ${response.status} ${await response.text()}`);
  return (await response.text()).trim();
}

export function cardConfig(deviceId: string): Record<string, unknown> {
  return { type: "custom:canvas-lms-courses-card", device_id: deviceId, title: "Alice's classes" };
}

/** Write the YAML dashboard's file; Home Assistant reads it on the next load. */
export function writeYamlDashboard(deviceId: string): void {
  const card = cardConfig(deviceId);
  writeFileSync(
    resolve(CONFIG, "dashboards", "canvas.yaml"),
    [
      "views:",
      "  - title: Canvas",
      "    cards:",
      `      - type: ${String(card.type)}`,
      `        device_id: ${deviceId}`,
      `        title: "${String(card.title)}"`,
      "",
    ].join("\n"),
  );
}

/** The browser's saved login, as the frontend keeps it in localStorage. */
export function writeStorageState(state: State): void {
  const hassTokens = {
    access_token: state.accessToken,
    refresh_token: state.refreshToken,
    token_type: "Bearer",
    expires_in: state.expiresIn,
    expires: Date.now() + state.expiresIn * 1000,
    hassUrl: HA_URL,
    clientId: CLIENT_ID,
  };
  writeFileSync(
    STORAGE_STATE,
    JSON.stringify({
      cookies: [],
      origins: [
        {
          origin: HA_URL,
          localStorage: [
            { name: "hassTokens", value: JSON.stringify(hassTokens) },
            // Skip the "keep me logged in" and analytics prompts.
            { name: "selectedLanguage", value: JSON.stringify("en") },
          ],
        },
      ],
    }),
  );
}

export function readState(): State {
  return JSON.parse(readFileSync(STATE, "utf8")) as State;
}

/** Send one websocket command and return its result. */
export async function ws<T = unknown>(token: string, message: Record<string, unknown>): Promise<T> {
  const socket = new WebSocket(`${HA_URL.replace(/^http/, "ws")}/api/websocket`);
  try {
    return await new Promise<T>((resolvePromise, reject) => {
      const timer = setTimeout(() => reject(new Error(`websocket ${String(message.type)} timed out`)), 30_000);
      socket.addEventListener("error", () => reject(new Error("websocket error")));
      socket.addEventListener("message", (event) => {
        const data = JSON.parse(String(event.data)) as {
          type: string;
          id?: number;
          success?: boolean;
          result?: T;
          error?: unknown;
          message?: string;
        };
        if (data.type === "auth_required") {
          socket.send(JSON.stringify({ type: "auth", access_token: token }));
        } else if (data.type === "auth_invalid") {
          reject(new Error(`websocket auth: ${data.message}`));
        } else if (data.type === "auth_ok") {
          socket.send(JSON.stringify({ id: 1, ...message }));
        } else if (data.type === "result" && data.id === 1) {
          clearTimeout(timer);
          if (data.success) resolvePromise(data.result as T);
          else reject(new Error(`${String(message.type)}: ${JSON.stringify(data.error)}`));
        }
      });
    });
  } finally {
    socket.close();
  }
}

export interface Resource {
  id: string;
  type: string;
  url: string;
}

/** The dashboard resources that point at the card's copy in config/www. */
export async function cardResources(token: string): Promise<Resource[]> {
  const resources = await ws<Resource[]>(token, { type: "lovelace/resources" });
  return resources.filter((r) => r.url.split("?")[0] === LOCAL_PATH);
}

/**
 * Create a dashboard managed in the UI and put the card on it. Recent releases
 * send the default dashboard's URL to the new Overview, so it gets its own.
 */
export async function saveUiDashboard(token: string, deviceId: string): Promise<void> {
  await ws(token, {
    type: "lovelace/dashboards/create",
    url_path: UI_DASHBOARD,
    title: "Canvas UI",
    mode: "storage",
    show_in_sidebar: false,
    require_admin: false,
  });
  await ws(token, {
    type: "lovelace/config/save",
    url_path: UI_DASHBOARD,
    config: { views: [{ title: "Canvas", path: "canvas", cards: [cardConfig(deviceId)] }] },
  });
}
