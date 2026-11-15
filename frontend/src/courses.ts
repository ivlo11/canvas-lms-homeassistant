import {
  COURSE_TRANSLATION_KEY,
  DOMAIN,
  type CourseRow,
  type DeviceRegistryEntry,
  type HomeAssistant,
} from "./types";

const asNumber = (value: unknown): number | undefined =>
  typeof value === "number" ? value : undefined;

/** The config entry a student device belongs to. */
export function configEntryId(device: DeviceRegistryEntry): string | undefined {
  return (
    device.primary_config_entry ??
    device.config_entry_id ??
    device.config_entries?.[0] ??
    undefined
  );
}

export function deviceName(device: DeviceRegistryEntry): string {
  return device.name_by_user || device.name || "";
}

/**
 * The course name inside a sensor's friendly name, "<student> <course> grade".
 * Used only for a sensor that has been unavailable since the page loaded.
 */
function nameFromFriendlyName(
  friendlyName: unknown,
  device: DeviceRegistryEntry | undefined,
): string {
  if (typeof friendlyName !== "string") return "";
  let name = friendlyName;
  for (const prefix of [device?.name_by_user, device?.name]) {
    if (prefix && name.startsWith(`${prefix} `)) {
      name = name.slice(prefix.length + 1);
      break;
    }
  }
  return name.replace(/ grade$/, "");
}

/**
 * The class rows of one student device, ordered by course name.
 *
 * Course sensors are the entities of this integration on the device with the
 * course grade translation key. An unavailable sensor has no attributes, so
 * `remembered` supplies what the row last showed.
 */
export function findCourses(
  hass: HomeAssistant,
  deviceId: string,
  remembered: Map<string, CourseRow> = new Map(),
): CourseRow[] {
  const rows: CourseRow[] = [];
  for (const entry of Object.values(hass.entities)) {
    if (
      entry.platform !== DOMAIN ||
      entry.device_id !== deviceId ||
      entry.translation_key !== COURSE_TRANSLATION_KEY
    ) {
      continue;
    }
    const state = hass.states[entry.entity_id];
    if (!state) continue;
    const attributes = state.attributes;
    const previous = remembered.get(entry.entity_id);
    const teachers = attributes.teachers;
    const row: CourseRow = {
      entityId: entry.entity_id,
      name:
        (typeof attributes.course_name === "string" && attributes.course_name) ||
        previous?.name ||
        nameFromFriendlyName(attributes.friendly_name, hass.devices[deviceId]) ||
        entry.entity_id,
      teachers: Array.isArray(teachers)
        ? teachers.filter((t): t is string => typeof t === "string")
        : (previous?.teachers ?? []),
      state: state.state,
      courseId: asNumber(attributes.course_id) ?? previous?.courseId,
      studentId: asNumber(attributes.student_id) ?? previous?.studentId,
    };
    remembered.set(entry.entity_id, row);
    rows.push(row);
  }
  const locale = hass.locale?.language || undefined;
  return rows.sort(
    (a, b) =>
      a.name.localeCompare(b.name, locale, { sensitivity: "base" }) ||
      a.entityId.localeCompare(b.entityId),
  );
}
