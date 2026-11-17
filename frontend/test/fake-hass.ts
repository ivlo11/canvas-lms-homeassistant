import { vi } from "vitest";

import type { Assignment, HomeAssistant } from "../src/types";

export const DEVICE = "device-alice";
export const ENTRY = "entry-parent";

export interface FakeCourse {
  id: number;
  name: string;
  state?: string;
  teachers?: string[];
  grade?: string | null;
  available?: boolean;
  device?: string;
  student?: number;
}

export const assignment = (
  id: number,
  overrides: Partial<Assignment> = {},
): Assignment => ({
  student_id: 21,
  course_id: 101,
  assignment_id: id,
  name: `Assignment ${id}`,
  due_at: "2026-11-20T23:59:00+00:00",
  points_possible: 10,
  html_url: `https://canvas.example.edu/courses/101/assignments/${id}`,
  missing: false,
  graded: false,
  score: null,
  ...overrides,
});

/**
 * A fake `hass` holding course sensors, with the action answering from
 * `assignments`. Each call builds new objects, as Home Assistant does when
 * state changes.
 */
export function fakeHass(
  courses: FakeCourse[],
  assignments: Assignment[] | (() => Promise<{ response?: unknown }>) = [],
): HomeAssistant & { callService: ReturnType<typeof vi.fn> } {
  const states: HomeAssistant["states"] = {};
  const entities: HomeAssistant["entities"] = {};
  for (const course of courses) {
    const device = course.device ?? DEVICE;
    const entity_id = `sensor.${device}_${course.id}_grade`;
    entities[entity_id] = {
      entity_id,
      platform: "canvas_lms_edu",
      device_id: device,
      translation_key: "course_grade",
    };
    states[entity_id] =
      course.available === false
        ? {
            entity_id,
            state: "unavailable",
            attributes: { friendly_name: `Alice Student ${course.name} grade` },
          }
        : {
            entity_id,
            state: course.state ?? "unknown",
            attributes: {
              friendly_name: `Alice Student ${course.name} grade`,
              course_id: course.id,
              course_name: course.name,
              student_id: course.student ?? 21,
              teachers: course.teachers ?? [],
              grade: course.grade ?? null,
            },
          };
  }
  // Entities the card must ignore: the student sensor and another integration.
  entities["sensor.alice_unsubmitted"] = {
    entity_id: "sensor.alice_unsubmitted",
    platform: "canvas_lms_edu",
    device_id: DEVICE,
    translation_key: "unsubmitted_assignments",
  };
  states["sensor.alice_unsubmitted"] = {
    entity_id: "sensor.alice_unsubmitted",
    state: "5",
    attributes: {},
  };
  entities["sensor.other"] = {
    entity_id: "sensor.other",
    platform: "other",
    device_id: DEVICE,
    translation_key: "course_grade",
  };
  states["sensor.other"] = { entity_id: "sensor.other", state: "1", attributes: {} };

  return {
    states,
    entities,
    devices: {
      [DEVICE]: {
        id: DEVICE,
        name: "Alice Student",
        primary_config_entry: ENTRY,
        config_entries: [ENTRY],
        identifiers: [["canvas_lms_edu", "canvas.example.edu_21"]],
      },
      "device-bob": {
        id: "device-bob",
        name: "Bob Student",
        primary_config_entry: ENTRY,
        config_entries: [ENTRY],
        identifiers: [["canvas_lms_edu", "canvas.example.edu_22"]],
      },
    },
    locale: { language: "en-US", time_zone: "server" },
    config: { time_zone: "America/Denver" },
    callService: vi.fn(
      typeof assignments === "function"
        ? assignments
        : async () => ({ response: { assignments } }),
    ),
  };
}
