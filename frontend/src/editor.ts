import { LitElement, html } from "lit";

import { DOMAIN, type CardConfig, type HomeAssistant } from "./types";

export const EDITOR_TYPE = "canvas-lms-courses-card-editor";

const SCHEMA = [
  {
    name: "device_id",
    required: true,
    // Only this integration's devices, which are its students.
    selector: { device: { filter: { integration: DOMAIN } } },
  },
  { name: "title", selector: { text: {} } },
];

const LABELS: Record<string, string> = {
  device_id: "Student",
  title: "Title (optional)",
};

/** The card's visual editor: a student device and an optional title. */
export class CanvasLmsCoursesCardEditor extends LitElement {
  static override properties = {
    hass: { attribute: false },
    _config: { state: true },
  };

  declare hass?: HomeAssistant;
  declare _config?: CardConfig;

  setConfig(config: CardConfig): void {
    this._config = config;
  }

  protected override render() {
    if (!this._config) return html``;
    return html`<ha-form
      .hass=${this.hass}
      .data=${this._config}
      .schema=${SCHEMA}
      .computeLabel=${(field: { name: string }) => LABELS[field.name] ?? field.name}
      @value-changed=${this._changed}
    ></ha-form>`;
  }

  private _changed(event: CustomEvent<{ value: CardConfig }>): void {
    event.stopPropagation();
    const config: CardConfig = { ...this._config, ...event.detail.value };
    if (!config.title) delete config.title;
    this._config = config;
    this.dispatchEvent(
      new CustomEvent("config-changed", {
        detail: { config },
        bubbles: true,
        composed: true,
      }),
    );
  }
}

if (!customElements.get(EDITOR_TYPE)) {
  customElements.define(EDITOR_TYPE, CanvasLmsCoursesCardEditor);
}
