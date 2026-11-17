// Stop the containers, unless E2E_KEEP is set to look around afterwards.
import { compose } from "./src/ha";

export default function globalTeardown(): void {
  if (process.env.E2E_KEEP) {
    console.log("E2E_KEEP is set: leaving the containers running");
    return;
  }
  if (process.env.CI) console.log(compose("logs", "--no-color", "homeassistant"));
  compose("down", "--volumes", "--remove-orphans");
}
