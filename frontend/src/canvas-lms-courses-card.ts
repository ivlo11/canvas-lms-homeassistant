import { LitElement, html, nothing, type PropertyValues } from "lit";

import { configEntryId, deviceName, findCourses } from "./courses";
import { defineElement } from "./define";
import { EDITOR_TYPE } from "./editor";
import { dueText, gradeText, pointsText } from "./format";
import { sortAssignments } from "./sort";
import { styles } from "./styles";
import {
  CARD_TYPE,
  DOMAIN,
  SERVICE,
  type Assignment,
  type CardConfig,
  type CourseRow,
  type DeviceRegistryEntry,
  type HassEntityState,
  type HomeAssistant,
  type SortOrder,
} from "./types";

const SORTS: [SortOrder, string][] = [
  ["due", "Due date"],
  ["points", "Points"],
  ["name", "Name"],
];

const BACK_ICON = "M20,11V13H8L13.5,18.5L12.08,19.92L4.16,12L12.08,4.08L13.5,5.5L8,11H20Z";

/**
 * Lists one student's active classes with teacher and current grade, and
 * opens a class to show and sort the assignments the student has not turned in.
 */
export class CanvasLmsCoursesCard extends LitElement {
  static override styles = styles;

  static override properties = {
    hass: { attribute: false },
    _config: { state: true },
    _open: { state: true },
    _sort: { state: true },
    _assignments: { state: true },
    _error: { state: true },
  };

  declare hass?: HomeAssistant;
  declare _config?: CardConfig;
  /** Entity id of the class that is open, if any. */
  declare _open?: string;
  declare _sort: SortOrder;
  /** The open class's assignments; undefined while loading. */
  declare _assignments?: Assignment[];
  declare _error: boolean;

  private _remembered = new Map<string, CourseRow>();
  private _loadedFor?: HassEntityState;
  private _request = 0;

  constructor() {
    super();
    this._sort = "due";
    this._error = false;
  }

  static getConfigElement(): HTMLElement {
    return document.createElement(EDITOR_TYPE);
  }

  /** Start a card added from the picker on the first student. */
  static getStubConfig(hass?: HomeAssistant): Partial<CardConfig> {
    const student = Object.values(hass?.devices ?? {}).find((device) =>
      device.identifiers?.some(([domain]) => domain === DOMAIN),
    );
    return student ? { device_id: student.id } : {};
  }

  setConfig(config: CardConfig): void {
    if (!config || typeof config !== "object") {
      throw new Error("Invalid configuration");
    }
    if (config.device_id !== this._config?.device_id) {
      this._close();
      this._remembered.clear();
    }
    this._config = config;
  }

  getCardSize(): number {
    return Math.max(2, 1 + this._rows().length);
  }

  private get _device(): DeviceRegistryEntry | undefined {
    const id = this._config?.device_id;
    return id ? this.hass?.devices?.[id] : undefined;
  }

  private _rows(): CourseRow[] {
    const id = this._config?.device_id;
    if (!this.hass || !id) return [];
    return findCourses(this.hass, id, this._remembered);
  }

  protected override willUpdate(changed: PropertyValues): void {
    if (!changed.has("hass") || !this._open || !this.hass) return;
    const state = this.hass.states[this._open];
    if (!state) {
      // The class is no longer one of the student's active courses.
      this._close();
    } else if (state !== this._loadedFor) {
      // A refresh wrote the sensor again, so the assignments may have changed.
      void this._load();
    }
  }

  protected override render() {
    if (!this._config || !this.hass) return nothing;
    if (!this._config.device_id) {
      return this._configError("Choose a student in the card's settings.");
    }
    const device = this._device;
    if (!device) {
      return this._configError(
        "The student this card was set up for no longer exists. Choose a student in the card's settings.",
      );
    }
    const rows = this._rows();
    const open = this._open && rows.find((row) => row.entityId === this._open);
    return html`<ha-card>
      ${open ? this._renderClass(open) : this._renderList(rows, device)}
    </ha-card>`;
  }

  private _configError(message: string) {
    return html`<ha-card>
      <p class="message error config-error" role="alert">${message}</p>
    </ha-card>`;
  }

  private _renderList(rows: CourseRow[], device: DeviceRegistryEntry) {
    const title = this._config?.title || deviceName(device);
    return html`
      ${title
        ? html`<div class="header"><h2 class="title">${title}</h2></div>`
        : nothing}
      ${rows.length === 0
        ? html`<p class="message empty">No active classes</p>`
        : html`<ul class="courses">
            ${rows.map(
              (row) =>
                html`<li>
                  <button
                    class="row course"
                    type="button"
                    @click=${() => this._openClass(row.entityId)}
                  >
                    <span class="text">
                      <span class="primary name">${row.name}</span>
                      <span class="secondary teachers"
                        >${row.teachers.join(", ")}</span
                      >
                    </span>
                    <span class="grade">${gradeText(row.state)}</span>
                  </button>
                </li>`,
            )}
          </ul>`}
    `;
  }

  private _renderClass(row: CourseRow) {
    return html`
      <div class="header">
        <button
          class="back"
          type="button"
          aria-label="Back to classes"
          title="Back to classes"
          @click=${this._back}
        >
          <svg viewBox="0 0 24 24" aria-hidden="true"><path d=${BACK_ICON}></path></svg>
        </button>
        <h2 class="title">${row.name}</h2>
        <span class="grade">${gradeText(row.state)}</span>
      </div>
      <div class="sort" role="group" aria-label="Sort assignments">
        <span aria-hidden="true">Sort by</span>
        ${SORTS.map(
          ([order, label]) =>
            html`<button
              type="button"
              data-sort=${order}
              aria-pressed=${this._sort === order ? "true" : "false"}
              @click=${() => {
                this._sort = order;
              }}
            >
              ${label}
            </button>`,
        )}
      </div>
      ${this._renderAssignments()}
    `;
  }

  private _renderAssignments() {
    if (this._error) {
      return html`<p class="message error" role="alert">
        <span>Could not load this class's assignments.</span>
        <button class="retry" type="button" @click=${() => this._load()}>
          Try again
        </button>
      </p>`;
    }
    if (this._assignments === undefined) {
      return html`<p class="message loading">Loading…</p>`;
    }
    if (this._assignments.length === 0) {
      return html`<p class="message empty">Nothing to turn in</p>`;
    }
    const sorted = sortAssignments(
      this._assignments,
      this._sort,
      this.hass?.locale?.language || undefined,
    );
    return html`<ul class="assignments">
      ${sorted.map((item) => {
        const due = dueText(item.due_at, this.hass);
        const points = pointsText(item.points_possible, this.hass);
        const content = html`
          <span class="text">
            <span class="primary name">${item.name ?? "Untitled assignment"}</span>
            <span class="secondary"
              >${item.missing
                ? html`<span class="missing">Missing</span>`
                : nothing}<span class="due">${due ? `Due ${due}` : ""}</span></span
            >
          </span>
          ${points ? html`<span class="points">${points}</span>` : nothing}
        `;
        return html`<li>
          ${item.html_url
            ? html`<a
                class="row assignment"
                href=${item.html_url}
                target="_blank"
                rel="noopener noreferrer"
                >${content}</a
              >`
            : html`<div class="row assignment">${content}</div>`}
        </li>`;
      })}
    </ul>`;
  }

  private _openClass(entityId: string): void {
    this._open = entityId;
    void this._load();
  }

  private _back(): void {
    this._close();
  }

  private _close(): void {
    this._request += 1;
    this._open = undefined;
    this._assignments = undefined;
    this._error = false;
    this._loadedFor = undefined;
  }

  /** Read the open class's assignments from the integration's last refresh. */
  private async _load(): Promise<void> {
    const hass = this.hass;
    const entityId = this._open;
    if (!hass || !entityId) return;
    const request = ++this._request;
    this._loadedFor = hass.states[entityId];
    this._error = false;
    const row = this._remembered.get(entityId);
    const device = this._device;
    const entryId = device && configEntryId(device);
    try {
      if (!entryId || row?.courseId === undefined || row.studentId === undefined) {
        throw new Error("The class's details are not available");
      }
      const result = await hass.callService(
        DOMAIN,
        SERVICE,
        { config_entry_id: entryId },
        undefined,
        false,
        true,
      );
      if (request !== this._request) return;
      const all = (result?.response as { assignments?: Assignment[] } | undefined)
        ?.assignments;
      if (!Array.isArray(all)) throw new Error("Unexpected response");
      this._assignments = all.filter(
        (item) => item.student_id === row.studentId && item.course_id === row.courseId,
      );
    } catch {
      if (request !== this._request) return;
      this._assignments = undefined;
      this._error = true;
    }
  }
}

defineElement(CARD_TYPE, CanvasLmsCoursesCard);

declare global {
  interface Window {
    customCards?: Record<string, unknown>[];
  }
}

window.customCards = window.customCards ?? [];
if (!window.customCards.some((card) => card.type === CARD_TYPE)) {
  window.customCards.push({
    type: CARD_TYPE,
    name: "Canvas LMS courses",
    description:
      "A student's classes with teacher and current grade; open a class to see what has not been turned in.",
    documentationURL:
      "https://github.com/ivlo11/canvas-lms-homeassistant/blob/main/docs/courses-card.md",
  });
}
