import type { Assignment, SortOrder } from "./types";

const dueTime = (a: Assignment): number | null => {
  if (!a.due_at) return null;
  const time = Date.parse(a.due_at);
  return Number.isNaN(time) ? null : time;
};

/** Earliest first; undated last. */
const byDue = (a: Assignment, b: Assignment): number => {
  const [x, y] = [dueTime(a), dueTime(b)];
  if (x === y) return 0;
  if (x === null) return 1;
  if (y === null) return -1;
  return x - y;
};

/** Most points first; no points last. */
const byPoints = (a: Assignment, b: Assignment): number => {
  const [x, y] = [a.points_possible, b.points_possible];
  if (x === y) return 0;
  if (x === null || x === undefined) return 1;
  if (y === null || y === undefined) return -1;
  return y - x;
};

const byName =
  (locale?: string) =>
  (a: Assignment, b: Assignment): number =>
    (a.name ?? "").localeCompare(b.name ?? "", locale, { sensitivity: "base" });

/**
 * Return the assignments in the chosen order, without changing the input.
 * Ties fall back to due date, then name, then assignment id so the order is
 * stable between refreshes.
 */
export function sortAssignments(
  items: readonly Assignment[],
  order: SortOrder,
  locale?: string,
): Assignment[] {
  const name = byName(locale);
  const first = order === "points" ? byPoints : order === "name" ? name : byDue;
  return [...items].sort(
    (a, b) =>
      first(a, b) || byDue(a, b) || name(a, b) || a.assignment_id - b.assignment_id,
  );
}
