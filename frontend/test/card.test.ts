import { afterEach, describe, expect, it } from "vitest";

import "../src/canvas-lms-courses-card";
import type { CanvasLmsCoursesCard } from "../src/canvas-lms-courses-card";
import type { CanvasLmsCoursesCardEditor } from "../src/editor";
import { DASH } from "../src/format";
import type { CardConfig, HomeAssistant } from "../src/types";
import { DEVICE, ENTRY, assignment, fakeHass, type FakeCourse } from "./fake-hass";

const FOUR: FakeCourse[] = [
  { id: 103, name: "Chemistry", state: "88", teachers: ["Dr Lindqvist"], grade: "B+" },
  { id: 101, name: "Algebra", state: "91.5", teachers: ["Ms Rivera"], grade: "A-" },
  { id: 104, name: "drama", state: "unknown", teachers: [] },
  { id: 102, name: "Biology", state: "77.0", teachers: ["Mr Okafor", "Dr Lindqvist"] },
];

const ALGEBRA = `sensor.${DEVICE}_101_grade`;

async function mount(
  hass: HomeAssistant,
  config: Partial<CardConfig> = { device_id: DEVICE },
): Promise<CanvasLmsCoursesCard> {
  const card = document.createElement("canvas-lms-courses-card") as CanvasLmsCoursesCard;
  card.setConfig({ type: "custom:canvas-lms-courses-card", ...config });
  card.hass = hass;
  document.body.append(card);
  await card.updateComplete;
  return card;
}

/** Let the action's promise settle and the card render the result. */
async function settle(card: CanvasLmsCoursesCard): Promise<void> {
  await new Promise((resolve) => setTimeout(resolve, 0));
  await card.updateComplete;
}

const all = <T extends Element = HTMLElement>(card: Element, selector: string): T[] =>
  [...card.shadowRoot!.querySelectorAll<T>(selector)];
const one = <T extends Element = HTMLElement>(card: Element, selector: string): T | null =>
  card.shadowRoot!.querySelector<T>(selector);
const text = (element: Node | null | undefined): string =>
  (element?.textContent ?? "").replace(/\s+/g, " ").trim();
const courseNames = (card: Element) => all(card, ".course .name").map(text);
const assignmentNames = (card: Element) => all(card, ".assignment .name").map(text);

async function open(card: CanvasLmsCoursesCard, name: string): Promise<void> {
  const row = all<HTMLButtonElement>(card, "button.course").find(
    (button) => text(button.querySelector(".name")) === name,
  );
  row!.click();
  await settle(card);
}

afterEach(() => {
  document.body.replaceChildren();
});

describe("configuration", () => {
  it("registers the card for the picker", () => {
    expect(customElements.get("canvas-lms-courses-card")).toBeDefined();
    const listed = window.customCards!.filter(
      (card) => card.type === "canvas-lms-courses-card",
    );
    expect(listed).toHaveLength(1);
    expect(listed[0].name).toBe("Canvas LMS courses");
  });

  it("shows a configuration error when no student is configured", async () => {
    const card = await mount(fakeHass(FOUR), {});
    expect(text(one(card, "[role=alert]"))).toContain("Choose a student");
    expect(all(card, ".course")).toHaveLength(0);
  });

  it("shows a configuration error when the student no longer exists", async () => {
    const card = await mount(fakeHass(FOUR), { device_id: "gone" });
    expect(text(one(card, "[role=alert]"))).toContain("no longer exists");
    expect(all(card, ".course")).toHaveLength(0);
  });

  it("rejects a configuration that is not an object", () => {
    const card = document.createElement("canvas-lms-courses-card") as CanvasLmsCoursesCard;
    expect(() => card.setConfig(undefined as unknown as CardConfig)).toThrow();
  });

  it("offers the first student as the picker's starting configuration", () => {
    const Card = customElements.get("canvas-lms-courses-card") as unknown as {
      getStubConfig(hass: HomeAssistant): Partial<CardConfig>;
    };
    expect(Card.getStubConfig(fakeHass(FOUR))).toEqual({ device_id: DEVICE });
  });

  it("reports a size that grows with the classes", async () => {
    const card = await mount(fakeHass(FOUR));
    expect(card.getCardSize()).toBe(5);
    expect((await mount(fakeHass([]))).getCardSize()).toBe(2);
  });

  it("titles the card with the student, or the configured title", async () => {
    expect(text(one(await mount(fakeHass(FOUR)), ".title"))).toBe("Alice Student");
    const titled = await mount(fakeHass(FOUR), { device_id: DEVICE, title: "Classes" });
    expect(text(one(titled, ".title"))).toBe("Classes");
  });
});

describe("class list", () => {
  it("lists four classes ordered by name, ignoring case", async () => {
    const card = await mount(fakeHass(FOUR));
    expect(courseNames(card)).toEqual(["Algebra", "Biology", "Chemistry", "drama"]);
  });

  it("shows only the configured student's classes", async () => {
    const hass = fakeHass([
      ...FOUR,
      { id: 201, name: "Bob's Art", state: "60", device: "device-bob", student: 22 },
    ]);
    expect(courseNames(await mount(hass))).not.toContain("Bob's Art");
    expect(courseNames(await mount(hass, { device_id: "device-bob" }))).toEqual([
      "Bob's Art",
    ]);
  });

  it("says when there are no active classes", async () => {
    const card = await mount(fakeHass([]));
    expect(text(one(card, ".empty"))).toBe("No active classes");
  });

  it("updates rows and grades when hass changes", async () => {
    const card = await mount(fakeHass(FOUR));
    card.hass = fakeHass([
      { id: 101, name: "Algebra", state: "93", teachers: ["Ms Rivera"] },
      { id: 105, name: "Economics", state: "70", teachers: [] },
    ]);
    await card.updateComplete;
    expect(courseNames(card)).toEqual(["Algebra", "Economics"]);
    expect(all(card, ".course .grade").map(text)).toEqual(["93%", "70%"]);
  });

  it("puts the teacher under the name and the grade beside both", async () => {
    const card = await mount(fakeHass(FOUR));
    const row = all(card, "button.course")[0];
    const [block, grade] = [...row.children];
    expect(block.className).toBe("text");
    expect([...block.children].map((line) => line.className)).toEqual([
      "primary name",
      "secondary teachers",
    ]);
    expect(text(block.children[0])).toBe("Algebra");
    expect(text(block.children[1])).toBe("Ms Rivera");
    expect(grade.className).toBe("grade");
    expect(text(grade)).toBe("91.5%");
  });

  it("joins several teachers with commas and keeps an empty line for none", async () => {
    const card = await mount(fakeHass(FOUR));
    const teachers = all(card, ".course .teachers");
    expect(teachers.map(text)).toEqual(["Ms Rivera", "Mr Okafor, Dr Lindqvist", "Dr Lindqvist", ""]);
    // The empty line is still rendered, so the row keeps its two-line layout.
    expect(teachers).toHaveLength(4);
  });

  it("truncates a long name instead of the grade", async () => {
    const name = "Advanced Placement Comparative Government and Politics ".repeat(3).trim();
    const card = await mount(fakeHass([{ id: 101, name, state: "91.5" }]));
    expect(text(one(card, ".course .name"))).toBe(name);
    expect(text(one(card, ".course .grade"))).toBe("91.5%");
    // Layout cannot be measured here; these rules are what keep the grade visible.
    const css = (card.constructor as typeof CanvasLmsCoursesCard).styles!.toString();
    expect(css).toMatch(/\.text\s*{[^}]*flex:\s*1;[^}]*min-width:\s*0/);
    expect(css).toMatch(/\.primary,\s*\.secondary\s*{[^}]*text-overflow:\s*ellipsis/);
    expect(css).toMatch(/\.grade\s*{[^}]*flex:\s*none/);
  });

  it("shows the percentage score, never the letter grade, or a dash", async () => {
    const card = await mount(
      fakeHass([
        { id: 1, name: "A whole", state: "88.0", grade: "B+" },
        { id: 2, name: "B fraction", state: "91.5", grade: "A-" },
        { id: 3, name: "C unknown", state: "unknown" },
        { id: 4, name: "D unavailable", available: false },
      ]),
    );
    const grades = all(card, ".course .grade").map(text);
    expect(grades).toEqual(["88%", "91.5%", DASH, DASH]);
    expect(courseNames(card)).toEqual(["A whole", "B fraction", "C unknown", "D unavailable"]);
    expect(text(card.shadowRoot)).not.toContain("B+");
    expect(text(card.shadowRoot)).not.toContain("A-");
  });

  it("keeps a row's name and teacher while its sensor is unavailable", async () => {
    const card = await mount(fakeHass(FOUR));
    card.hass = fakeHass(FOUR.map((course) => ({ ...course, available: false })));
    await card.updateComplete;
    expect(courseNames(card)).toEqual(["Algebra", "Biology", "Chemistry", "drama"]);
    expect(all(card, ".course .grade").map(text)).toEqual([DASH, DASH, DASH, DASH]);
    expect(text(all(card, ".course .teachers")[0])).toBe("Ms Rivera");
  });
});

describe("class view", () => {
  const WORK = [
    assignment(1, { name: "essay", due_at: "2026-11-20T23:59:00+00:00", points_possible: 50 }),
    assignment(2, { name: "Zoology quiz", due_at: null, points_possible: 100 }),
    assignment(3, { name: "Algebra set", due_at: "2026-11-01T12:00:00+00:00", points_possible: null, missing: true }),
    assignment(9, { name: "Biology lab", course_id: 102 }),
    assignment(10, { name: "Bob's sheet", student_id: 22 }),
  ];

  it("opens a class with only that student's and course's assignments", async () => {
    const hass = fakeHass(FOUR, WORK);
    const card = await mount(hass);
    await open(card, "Algebra");
    expect(text(one(card, ".title"))).toBe("Algebra");
    expect(assignmentNames(card)).toEqual(["Algebra set", "essay", "Zoology quiz"]);
    expect(all(card, ".course")).toHaveLength(0);
    expect(hass.callService).toHaveBeenCalledWith(
      "canvas_lms_edu",
      "get_unsubmitted_assignments",
      { config_entry_id: ENTRY },
      undefined,
      false,
      true,
    );
  });

  it("says when there is nothing to turn in", async () => {
    const card = await mount(fakeHass(FOUR, WORK));
    await open(card, "Chemistry");
    expect(text(one(card, ".empty"))).toBe("Nothing to turn in");
  });

  it("returns to the class list with the back control", async () => {
    const card = await mount(fakeHass(FOUR, WORK));
    await open(card, "Algebra");
    one<HTMLButtonElement>(card, "button.back")!.click();
    await card.updateComplete;
    expect(courseNames(card)).toEqual(["Algebra", "Biology", "Chemistry", "drama"]);
    expect(all(card, ".assignment")).toHaveLength(0);
  });

  it("shows name, localised due date, points and a link to Canvas", async () => {
    const card = await mount(fakeHass(FOUR, WORK));
    await open(card, "Algebra");
    const row = all<HTMLAnchorElement>(card, "a.assignment")[1];
    expect(text(row.querySelector(".name"))).toBe("essay");
    expect(text(row.querySelector(".due"))).toBe("Due Nov 20, 2026, 4:59 PM");
    expect(text(row.querySelector(".points"))).toBe("50 pts");
    expect(row.querySelector(".missing")).toBeNull();
    expect(row.getAttribute("href")).toBe(
      "https://canvas.example.edu/courses/101/assignments/1",
    );
    expect(row.target).toBe("_blank");
    expect(row.rel).toContain("noopener");
  });

  it("leaves out a missing due date or points", async () => {
    const card = await mount(fakeHass(FOUR, WORK));
    await open(card, "Algebra");
    const [noPoints, , noDue] = all(card, ".assignment");
    expect(text(noPoints.querySelector(".name"))).toBe("Algebra set");
    expect(noPoints.querySelector(".points")).toBeNull();
    expect(text(noDue.querySelector(".name"))).toBe("Zoology quiz");
    expect(text(noDue.querySelector(".due"))).toBe("");
    expect(text(noDue.querySelector(".points"))).toBe("100 pts");
  });

  it("shows and marks missing work graded 0 without being turned in", async () => {
    const graded = assignment(4, { name: "Unit test", due_at: "2026-11-02T12:00:00+00:00", missing: true, graded: true, score: 0 });
    const card = await mount(fakeHass(FOUR, [...WORK, graded]));
    await open(card, "Algebra");
    const row = all(card, ".assignment").find((r) => text(r.querySelector(".name")) === "Unit test");
    expect(row).toBeDefined();
    expect(text(row!.querySelector(".missing"))).toBe("Missing");
  });

  it("marks an assignment the integration marks as missing", async () => {
    const card = await mount(fakeHass(FOUR, WORK));
    await open(card, "Algebra");
    const marked = all(card, ".assignment").filter((row) => row.querySelector(".missing"));
    expect(marked.map((row) => text(row.querySelector(".name")))).toEqual(["Algebra set"]);
    expect(text(marked[0].querySelector(".missing"))).toBe("Missing");
  });

  it("sorts by due date by default, and by points or name on request", async () => {
    const card = await mount(fakeHass(FOUR, WORK));
    await open(card, "Algebra");
    const pressed = () =>
      all(card, ".sort button")
        .filter((button) => button.getAttribute("aria-pressed") === "true")
        .map((button) => button.dataset.sort);
    expect(pressed()).toEqual(["due"]);
    expect(assignmentNames(card)).toEqual(["Algebra set", "essay", "Zoology quiz"]);

    one<HTMLButtonElement>(card, '[data-sort="points"]')!.click();
    await card.updateComplete;
    expect(pressed()).toEqual(["points"]);
    expect(assignmentNames(card)).toEqual(["Zoology quiz", "essay", "Algebra set"]);

    one<HTMLButtonElement>(card, '[data-sort="name"]')!.click();
    await card.updateComplete;
    expect(assignmentNames(card)).toEqual(["Algebra set", "essay", "Zoology quiz"]);
  });

  it("keeps the sort choice when another class is opened", async () => {
    const work = [
      ...WORK,
      assignment(11, { name: "Cell quiz", course_id: 102, points_possible: 80, due_at: "2026-12-01T12:00:00+00:00" }),
    ];
    const card = await mount(fakeHass(FOUR, work));
    await open(card, "Algebra");
    one<HTMLButtonElement>(card, '[data-sort="points"]')!.click();
    await card.updateComplete;
    one<HTMLButtonElement>(card, "button.back")!.click();
    await card.updateComplete;
    await open(card, "Biology");
    expect(one(card, '[data-sort="points"]')!.getAttribute("aria-pressed")).toBe("true");
    expect(assignmentNames(card)).toEqual(["Cell quiz", "Biology lab"]);
  });

  it("drops an assignment turned in when the open class's sensor updates", async () => {
    const card = await mount(fakeHass(FOUR, WORK));
    await open(card, "Algebra");
    expect(assignmentNames(card)).toContain("essay");

    const refreshed = fakeHass(
      FOUR,
      WORK.filter((item) => item.assignment_id !== 1),
    );
    card.hass = refreshed;
    await settle(card);
    expect(refreshed.callService).toHaveBeenCalledTimes(1);
    expect(assignmentNames(card)).toEqual(["Algebra set", "Zoology quiz"]);
  });

  it("does not refetch when the open class's sensor is unchanged", async () => {
    const hass = fakeHass(FOUR, WORK);
    const card = await mount(hass);
    await open(card, "Algebra");
    // Another entity changed: a new hass object with the same Algebra state.
    card.hass = { ...hass, states: { ...hass.states, "sensor.other": { ...hass.states["sensor.other"], state: "2" } } };
    await settle(card);
    expect(hass.callService).toHaveBeenCalledTimes(1);
  });

  it("returns to the list when the open class is no longer active", async () => {
    const card = await mount(fakeHass(FOUR, WORK));
    await open(card, "Algebra");
    card.hass = fakeHass(FOUR.filter((course) => course.id !== 101), WORK);
    await settle(card);
    expect(courseNames(card)).toEqual(["Biology", "Chemistry", "drama"]);
  });

  it("shows an error with retry and leaves the list usable", async () => {
    let fail = true;
    const hass = fakeHass(FOUR, async () => {
      if (fail) throw new Error("entry not loaded");
      return { response: { assignments: WORK } };
    });
    const card = await mount(hass);
    await open(card, "Algebra");
    expect(text(one(card, "[role=alert]"))).toContain("Could not load");
    expect(all(card, ".assignment")).toHaveLength(0);

    // The list still works: back, then open a class again.
    one<HTMLButtonElement>(card, "button.back")!.click();
    await card.updateComplete;
    expect(courseNames(card)).toHaveLength(4);
    await open(card, "Algebra");
    expect(one(card, "button.retry")).not.toBeNull();

    fail = false;
    one<HTMLButtonElement>(card, "button.retry")!.click();
    await settle(card);
    expect(one(card, "[role=alert]")).toBeNull();
    expect(assignmentNames(card)).toEqual(["Algebra set", "essay", "Zoology quiz"]);
  });

  it("uses native buttons and links, so the keyboard can reach and activate them", async () => {
    const card = await mount(fakeHass(FOUR, WORK));
    const focusable = (element: HTMLElement) => {
      expect(["BUTTON", "A"]).toContain(element.tagName);
      expect(element.tabIndex).toBe(0);
      expect(element.hasAttribute("disabled")).toBe(false);
      element.focus();
      expect(card.shadowRoot!.activeElement).toBe(element);
    };
    all(card, ".course").forEach(focusable);
    await open(card, "Algebra");
    focusable(one(card, "button.back")!);
    expect(one(card, "button.back")!.getAttribute("aria-label")).toBe("Back to classes");
    all(card, ".sort button").forEach(focusable);
    all(card, "a.assignment").forEach(focusable);
    const css = (card.constructor as typeof CanvasLmsCoursesCard).styles!.toString();
    expect(css).toMatch(/button:focus-visible,\s*a:focus-visible\s*{[^}]*outline:/);
  });

  it("styles with theme variables only", () => {
    const Card = customElements.get("canvas-lms-courses-card") as typeof CanvasLmsCoursesCard;
    const css = Card.styles!.toString();
    const colours = [...css.matchAll(/(?:^|[\s;{])(?:color|background|border(?:-color)?|outline|fill):\s*([^;]+);/g)].map(
      (match) => match[1],
    );
    expect(colours.length).toBeGreaterThan(10);
    for (const value of colours) {
      // Literal colours appear only as a fallback inside var().
      expect(value.replace(/var\([^()]*\)/g, "")).not.toMatch(/#[0-9a-f]{3,8}|rgb|hsl/i);
    }
  });
});

describe("visual editor", () => {
  it("is the card's config element", () => {
    const Card = customElements.get("canvas-lms-courses-card") as unknown as {
      getConfigElement(): HTMLElement;
    };
    expect(Card.getConfigElement().tagName).toBe("CANVAS-LMS-COURSES-CARD-EDITOR");
  });

  it("limits the student to this integration's devices and emits config-changed", async () => {
    const editor = document.createElement(
      "canvas-lms-courses-card-editor",
    ) as CanvasLmsCoursesCardEditor;
    editor.hass = fakeHass(FOUR);
    editor.setConfig({ type: "custom:canvas-lms-courses-card", device_id: DEVICE });
    document.body.append(editor);
    await editor.updateComplete;

    const form = editor.shadowRoot!.querySelector("ha-form") as HTMLElement & {
      schema: { name: string; selector: Record<string, unknown> }[];
      data: CardConfig;
    };
    expect(form.schema.map((field) => field.name)).toEqual(["device_id", "title"]);
    expect(form.schema[0].selector).toEqual({
      device: { filter: { integration: "canvas_lms_edu" } },
    });
    expect(form.data.device_id).toBe(DEVICE);

    const events: CardConfig[] = [];
    editor.addEventListener("config-changed", (event) =>
      events.push((event as CustomEvent).detail.config),
    );
    form.dispatchEvent(
      new CustomEvent("value-changed", {
        detail: { value: { type: "custom:canvas-lms-courses-card", device_id: "device-bob", title: "" } },
      }),
    );
    expect(events).toEqual([
      { type: "custom:canvas-lms-courses-card", device_id: "device-bob" },
    ]);

    form.dispatchEvent(
      new CustomEvent("value-changed", {
        detail: { value: { type: "custom:canvas-lms-courses-card", device_id: "device-bob", title: "Bob" } },
      }),
    );
    expect(events[1].title).toBe("Bob");
  });
});

it("does not use the open class's entity id across students", async () => {
  // Changing the student closes any open class.
  const card = await mount(fakeHass(FOUR, []));
  await open(card, "Algebra");
  expect(card._open).toBe(ALGEBRA);
  card.setConfig({ type: "custom:canvas-lms-courses-card", device_id: "device-bob" });
  await card.updateComplete;
  expect(card._open).toBeUndefined();
});
