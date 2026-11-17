// Start Home Assistant and the stub Canvas, onboard, add the Canvas entry and
// put the card on a UI dashboard and a YAML dashboard.
import { writeFileSync } from "node:fs";

import {
  HA_VERSION,
  STATE,
  addCanvasEntry,
  api,
  compose,
  onboard,
  resetConfig,
  saveUiDashboard,
  waitForRunning,
  writeStorageState,
  writeYamlDashboard,
  type State,
} from "./src/ha";

export default async function globalSetup(): Promise<void> {
  console.log(`Starting Home Assistant ${HA_VERSION}`);
  resetConfig();
  compose("up", "--detach", "--wait", "canvas");
  compose("up", "--detach", "homeassistant");

  const tokens = await onboard();
  await waitForRunning(tokens.accessToken);
  const { entryId, deviceId } = await addCanvasEntry(tokens.accessToken);

  await saveUiDashboard(tokens.accessToken, deviceId);
  writeYamlDashboard(deviceId);

  const state: State = { ...tokens, entryId, deviceId };
  writeFileSync(STATE, JSON.stringify(state));
  writeStorageState(state);

  // Fail early when the integration didn't set up.
  const entries = await api<Array<{ entry_id: string; state: string }>>(
    tokens.accessToken,
    "/api/config/config_entries/entry",
  );
  const entry = entries.find((e) => e.entry_id === entryId);
  if (entry?.state !== "loaded") throw new Error(`Canvas entry is ${entry?.state}`);
}
