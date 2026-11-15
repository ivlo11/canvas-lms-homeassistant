import type { HomeAssistant } from "./types";

export const DASH = "—";

/**
 * The grade shown on a class row: the percentage score as Canvas reports it,
 * without trailing zeros, or a dash when there is none. Never a letter grade.
 */
export function gradeText(state: string | undefined): string {
  if (state === undefined || state.trim() === "") return DASH;
  const score = Number(state);
  return Number.isFinite(score) ? `${score}%` : DASH;
}

const language = (hass: HomeAssistant | undefined): string | undefined =>
  hass?.locale?.language || undefined;

/** A due date in the viewer's locale and time zone, or "" when there is none. */
export function dueText(dueAt: string | null, hass?: HomeAssistant): string {
  if (!dueAt) return "";
  const date = new Date(dueAt);
  if (Number.isNaN(date.getTime())) return "";
  // Home Assistant lets a user choose the server's time zone over the browser's.
  const timeZone =
    hass?.locale?.time_zone === "server" ? hass.config?.time_zone : undefined;
  const format = (zone: string | undefined) =>
    new Intl.DateTimeFormat(language(hass), {
      dateStyle: "medium",
      timeStyle: "short",
      timeZone: zone,
    }).format(date);
  try {
    return format(timeZone);
  } catch {
    return format(undefined);
  }
}

/** Points possible, such as "10 pts", or "" when the assignment has none. */
export function pointsText(points: number | null, hass?: HomeAssistant): string {
  if (points === null || points === undefined) return "";
  const amount = new Intl.NumberFormat(language(hass), {
    maximumFractionDigits: 2,
  }).format(points);
  return `${amount} ${points === 1 ? "pt" : "pts"}`;
}
