// Bundles the card into the integration, so installs need no Node.js.
//
//   node build.mjs            write the bundle
//   node build.mjs --watch    rebuild on change
//   node build.mjs --check    fail if the committed bundle is not a fresh build
import { readFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { fileURLToPath, pathToFileURL } from "node:url";

import * as esbuild from "esbuild";

const here = dirname(fileURLToPath(import.meta.url));

export const BUNDLE = resolve(
  here,
  "../custom_components/canvas_lms_edu/frontend/canvas-lms-courses-card.js",
);

export const options = {
  absWorkingDir: here,
  entryPoints: ["src/canvas-lms-courses-card.ts"],
  outfile: BUNDLE,
  bundle: true,
  format: "esm",
  // Phones and tablets often run an older WebView than desktop browsers. Newer
  // syntax, such as class static blocks (iOS 16.4+), makes the whole module
  // fail to parse there, so the card would never register.
  target: "es2019",
  minify: true,
  legalComments: "eof",
  logLevel: "info",
};

/** Build in memory and return the bundle text. */
export async function buildText() {
  const result = await esbuild.build({ ...options, write: false, logLevel: "silent" });
  return result.outputFiles[0].text;
}

/** Return whether the committed bundle equals a fresh build. */
export async function bundleIsFresh() {
  let committed;
  try {
    committed = await readFile(BUNDLE, "utf8");
  } catch {
    return false;
  }
  return committed === (await buildText());
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  if (process.argv.includes("--check")) {
    if (!(await bundleIsFresh())) {
      console.error(
        "The committed bundle does not match the source. Run `npm run build` and commit the result.",
      );
      process.exit(1);
    }
    console.log("The committed bundle matches the source.");
  } else if (process.argv.includes("--watch")) {
    const context = await esbuild.context(options);
    await context.watch();
  } else {
    await esbuild.build(options);
  }
}
