import { describe, expect, it } from "vitest";

import { DASH, dueText, gradeText, pointsText } from "../src/format";
import { fakeHass } from "./fake-hass";

describe("gradeText", () => {
  it.each([
    ["88", "88%"],
    ["88.0", "88%"],
    ["91.5", "91.5%"],
    ["0", "0%"],
    ["unknown", DASH],
    ["unavailable", DASH],
    ["", DASH],
    [undefined, DASH],
  ])("shows %s as %s", (state, text) => {
    expect(gradeText(state)).toBe(text);
  });
});

describe("dueText", () => {
  it("uses the server time zone when the user chose it", () => {
    const hass = fakeHass([]);
    // 23:59 UTC is 16:59 in Denver in November.
    expect(dueText("2026-11-20T23:59:00+00:00", hass)).toBe("Nov 20, 2026, 4:59 PM");
  });

  it("follows the viewer's language", () => {
    const hass = fakeHass([]);
    hass.locale = { language: "de", time_zone: "server" };
    expect(dueText("2026-11-20T23:59:00+00:00", hass)).toBe("20.11.2026, 16:59");
  });

  it("is empty without a due date", () => {
    expect(dueText(null)).toBe("");
    expect(dueText("not a date")).toBe("");
  });
});

describe("pointsText", () => {
  it.each([
    [10, "10 pts"],
    [1, "1 pt"],
    [2.5, "2.5 pts"],
    [0, "0 pts"],
    [null, ""],
  ])("shows %s as %s", (points, text) => {
    expect(pointsText(points)).toBe(text);
  });
});
