import { css } from "lit";

// Only Home Assistant theme variables are used, so the card follows light,
// dark and custom themes.
export const styles = css`
  :host {
    display: block;
  }
  ha-card {
    display: block;
    overflow: hidden;
    color: var(--primary-text-color);
  }
  .header {
    display: flex;
    align-items: center;
    gap: 8px;
    padding: 16px 16px 8px;
  }
  .title {
    flex: 1;
    min-width: 0;
    margin: 0;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
    font-family: var(--ha-card-header-font-family, inherit);
    font-size: var(--ha-card-header-font-size, 1.5rem);
    font-weight: 400;
    line-height: 1.3;
    color: var(--ha-card-header-color, var(--primary-text-color));
  }
  ul {
    margin: 0;
    padding: 0 0 8px;
    list-style: none;
  }
  button,
  a {
    font: inherit;
    color: inherit;
  }
  button {
    border: 0;
    background: none;
    cursor: pointer;
  }
  .row {
    display: flex;
    align-items: center;
    gap: 16px;
    box-sizing: border-box;
    width: 100%;
    min-height: 56px;
    padding: 8px 16px;
    text-align: start;
    text-decoration: none;
  }
  .row:hover {
    background: var(--secondary-background-color);
  }
  .text {
    flex: 1;
    min-width: 0;
  }
  .primary,
  .secondary {
    display: block;
    overflow: hidden;
    text-overflow: ellipsis;
    white-space: nowrap;
  }
  .primary {
    font-size: 1rem;
    line-height: 1.4;
  }
  .secondary {
    min-height: 1.4em;
    font-size: 0.85rem;
    line-height: 1.4;
    color: var(--secondary-text-color);
  }
  .grade {
    flex: none;
    font-size: 1.15rem;
    font-variant-numeric: tabular-nums;
    white-space: nowrap;
  }
  .points {
    flex: none;
    font-size: 0.9rem;
    color: var(--secondary-text-color);
    white-space: nowrap;
  }
  .missing {
    margin-inline-end: 6px;
    padding: 0 6px;
    border-radius: 8px;
    font-size: 0.75rem;
    font-weight: 500;
    color: var(--text-primary-color, #fff);
    background: var(--error-color);
  }
  .back {
    flex: none;
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 40px;
    height: 40px;
    margin-inline-start: -8px;
    border-radius: 50%;
  }
  .back:hover {
    background: var(--secondary-background-color);
  }
  .back svg {
    width: 24px;
    height: 24px;
    fill: currentColor;
  }
  .sort {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 6px;
    padding: 0 16px 8px;
    font-size: 0.85rem;
    color: var(--secondary-text-color);
  }
  .sort button {
    min-height: 32px;
    padding: 0 12px;
    border: 1px solid var(--divider-color);
    border-radius: 16px;
    color: var(--primary-text-color);
  }
  .sort button[aria-pressed="true"] {
    border-color: var(--primary-color);
    color: var(--text-primary-color, #fff);
    background: var(--primary-color);
  }
  .message {
    margin: 0;
    padding: 8px 16px 24px;
    color: var(--secondary-text-color);
  }
  .error {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    gap: 12px;
    color: var(--error-color);
  }
  .config-error {
    padding: 16px;
  }
  .retry {
    min-height: 32px;
    padding: 0 12px;
    border: 1px solid currentColor;
    border-radius: 16px;
    color: var(--primary-color);
  }
  button:focus-visible,
  a:focus-visible {
    outline: 2px solid var(--primary-color);
    outline-offset: -2px;
  }
`;
