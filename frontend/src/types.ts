// The parts of Home Assistant's frontend objects the card reads. Home
// Assistant publishes no types for custom cards, so these are kept minimal.

export const DOMAIN = "canvas_lms_edu";
export const COURSE_TRANSLATION_KEY = "course_grade";
export const SERVICE = "get_unsubmitted_assignments";
export const CARD_TYPE = "canvas-lms-courses-card";

export interface HassEntityState {
  entity_id: string;
  state: string;
  attributes: Record<string, unknown>;
}

export interface EntityRegistryDisplayEntry {
  entity_id: string;
  platform?: string;
  device_id?: string;
  translation_key?: string;
}

export interface DeviceRegistryEntry {
  id: string;
  name?: string | null;
  name_by_user?: string | null;
  primary_config_entry?: string | null;
  config_entry_id?: string | null;
  config_entries?: string[];
  identifiers?: [string, string][];
}

export interface HomeAssistant {
  states: Record<string, HassEntityState>;
  entities: Record<string, EntityRegistryDisplayEntry>;
  devices: Record<string, DeviceRegistryEntry>;
  locale?: { language?: string; time_zone?: string };
  config?: { time_zone?: string };
  callService(
    domain: string,
    service: string,
    serviceData?: Record<string, unknown>,
    target?: unknown,
    notifyOnError?: boolean,
    returnResponse?: boolean,
  ): Promise<{ response?: unknown }>;
}

export interface CardConfig {
  type: string;
  device_id?: string;
  title?: string;
}

/** One item of the get_unsubmitted_assignments response. */
export interface Assignment {
  student_id: number;
  course_id: number;
  assignment_id: number;
  name: string | null;
  due_at: string | null;
  points_possible: number | null;
  html_url: string | null;
  missing: boolean;
}

/** A class row: one course grade sensor of the configured student. */
export interface CourseRow {
  entityId: string;
  name: string;
  teachers: string[];
  state: string | undefined;
  courseId: number | undefined;
  studentId: number | undefined;
}

export type SortOrder = "due" | "points" | "name";
