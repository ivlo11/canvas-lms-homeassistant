import { expect, it } from "vitest";

import { bundleIsFresh } from "../build.mjs";

it("the committed bundle matches a fresh build of the source", async () => {
  expect(
    await bundleIsFresh(),
    "Run `npm run build` in frontend/ and commit the bundle",
  ).toBe(true);
});
