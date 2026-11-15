import { describe, expect, it } from "vitest";

import { sortAssignments } from "../src/sort";
import { assignment } from "./fake-hass";

const ids = (items: { assignment_id: number }[]) => items.map((i) => i.assignment_id);

const ITEMS = [
  assignment(1, { name: "essay", due_at: "2026-11-20T12:00:00+00:00", points_possible: 50 }),
  assignment(2, { name: "Zoology quiz", due_at: null, points_possible: 100 }),
  assignment(3, { name: "Algebra set", due_at: "2026-11-01T12:00:00+00:00", points_possible: null }),
  assignment(4, { name: "Book report", due_at: "2026-12-05T12:00:00+00:00", points_possible: 5 }),
  assignment(5, { name: "apple diagram", due_at: null, points_possible: null }),
];

describe("sortAssignments", () => {
  it("orders by due date, earliest first, undated last", () => {
    expect(ids(sortAssignments(ITEMS, "due"))).toEqual([3, 1, 4, 5, 2]);
  });

  it("orders by points, highest first, no points last", () => {
    expect(ids(sortAssignments(ITEMS, "points"))).toEqual([2, 1, 4, 3, 5]);
  });

  it("orders by name, ignoring case", () => {
    expect(ids(sortAssignments(ITEMS, "name", "en"))).toEqual([3, 5, 4, 1, 2]);
  });

  it("breaks ties by due date, then name", () => {
    const tied = [
      assignment(1, { name: "b", due_at: "2026-11-20T12:00:00+00:00", points_possible: 10 }),
      assignment(2, { name: "a", due_at: "2026-11-20T12:00:00+00:00", points_possible: 10 }),
      assignment(3, { name: "c", due_at: "2026-11-01T12:00:00+00:00", points_possible: 10 }),
      assignment(4, { name: "a", due_at: null, points_possible: 10 }),
    ];
    expect(ids(sortAssignments(tied, "points"))).toEqual([3, 2, 1, 4]);
    expect(ids(sortAssignments(tied, "due"))).toEqual([3, 2, 1, 4]);
    // Same name: the dated one comes before the undated one.
    expect(ids(sortAssignments(tied, "name"))).toEqual([2, 4, 1, 3]);
  });

  it("does not change its input", () => {
    const before = ids(ITEMS);
    sortAssignments(ITEMS, "name");
    expect(ids(ITEMS)).toEqual(before);
  });
});
