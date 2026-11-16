import { expect, it } from "vitest";

import { buildText, bundleIsFresh } from "../build.mjs";

it("the committed bundle matches a fresh build of the source", async () => {
  expect(
    await bundleIsFresh(),
    "Run `npm run build` in frontend/ and commit the bundle",
  ).toBe(true);
});

it("the bundle avoids syntax that older phone WebViews cannot parse", async () => {
  const text: string = await buildText();
  // Class static blocks, logical assignment, and private fields.
  expect(text).not.toMatch(/static\s*\{/);
  expect(text).not.toMatch(/\?\?=|\|\|=|&&=/);
  expect(text).not.toMatch(/[.\s{;]#[A-Za-z_]\w*\s*[=(;]/);
});
