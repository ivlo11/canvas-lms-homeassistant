import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { BOOT_ELEMENT, FALLBACK_MS, defineElement } from "../src/define";

/** A registry like the browser's, enough for `defineElement`. */
class FakeRegistry {
  readonly defined = new Map<string, CustomElementConstructor>();
  private readonly waiting = new Map<string, Array<() => void>>();
  refuse = false;

  get(tag: string): CustomElementConstructor | undefined {
    return this.defined.get(tag);
  }

  define(tag: string, constructor: CustomElementConstructor): void {
    if (this.refuse) throw new Error("refused");
    if (this.defined.has(tag)) throw new Error(`${tag} already defined`);
    this.defined.set(tag, constructor);
    for (const resolve of this.waiting.get(tag) ?? []) resolve();
    this.waiting.delete(tag);
  }

  whenDefined(tag: string): Promise<CustomElementConstructor> {
    if (this.defined.has(tag)) return Promise.resolve(this.defined.get(tag)!);
    return new Promise((resolve) => {
      const list = this.waiting.get(tag) ?? [];
      list.push(() => resolve(this.defined.get(tag)!));
      this.waiting.set(tag, list);
    });
  }
}

class Card extends HTMLElement {
  static getStubConfig(): object {
    return { stub: true };
  }
}

const TAG = "test-card";
const flush = () => new Promise((resolve) => setTimeout(resolve, 0));

describe("defineElement", () => {
  let native: FakeRegistry;
  let scoped: FakeRegistry;
  let registry: FakeRegistry;
  const current = () => registry;

  beforeEach(() => {
    native = new FakeRegistry();
    scoped = new FakeRegistry();
    registry = native;
    vi.spyOn(console, "info").mockImplementation(() => undefined);
    vi.spyOn(console, "warn").mockImplementation(() => undefined);
  });

  afterEach(() => {
    vi.useRealTimers();
    vi.restoreAllMocks();
  });

  /** The dashboard swaps registries, then defines its app element in both. */
  const bootWithSwap = (): void => {
    registry = scoped;
    scoped.define(BOOT_ELEMENT, class extends HTMLElement {});
    native.define(BOOT_ELEMENT, class extends HTMLElement {});
  };

  it("defines the element in the registry seen at load", () => {
    defineElement(TAG, Card, current);
    expect(native.get(TAG)).toBe(Card);
  });

  it("repairs when the dashboard app boots after a registry swap", async () => {
    defineElement(TAG, Card, current);
    bootWithSwap();
    await flush();

    const repaired = scoped.get(TAG)!;
    expect(repaired).toBeDefined();
    expect(repaired.prototype).toBeInstanceOf(Card);
    expect((repaired as unknown as typeof Card).getStubConfig()).toEqual({ stub: true });
    expect(console.info).toHaveBeenCalledOnce();
    expect(vi.mocked(console.info).mock.calls[0][0]).toContain(`<${TAG}>`);
    expect(vi.mocked(console.info).mock.calls[0][0]).toContain(BOOT_ELEMENT);
  });

  it("repairs from the fallback timer when the boot signal is missed", () => {
    vi.useFakeTimers();
    defineElement(TAG, Card, current);
    registry = scoped;

    vi.advanceTimersByTime(FALLBACK_MS - 1);
    expect(scoped.get(TAG)).toBeUndefined();
    vi.advanceTimersByTime(1);

    expect(scoped.get(TAG)).toBeDefined();
    expect(vi.mocked(console.info).mock.calls[0][0]).toContain("fallback");
  });

  it("does nothing when the element is still in the registry", async () => {
    vi.useFakeTimers();
    defineElement(TAG, Card, current);
    native.define(BOOT_ELEMENT, class extends HTMLElement {});
    await vi.runAllTimersAsync();

    expect(native.get(TAG)).toBe(Card);
    expect(console.info).not.toHaveBeenCalled();
    expect(console.warn).not.toHaveBeenCalled();
  });

  it("does nothing on a second load", () => {
    defineElement(TAG, Card, current);
    expect(() => defineElement(TAG, class extends HTMLElement {}, current)).not.toThrow();
    expect(native.get(TAG)).toBe(Card);
  });

  it("repairs and logs once, even when both triggers fire", async () => {
    vi.useFakeTimers();
    defineElement(TAG, Card, current);
    bootWithSwap();
    await vi.runAllTimersAsync();

    expect(scoped.defined.size).toBe(2);
    expect(console.info).toHaveBeenCalledOnce();
    expect(vi.getTimerCount()).toBe(0);
  });

  it("logs a warning without throwing when the repair fails", async () => {
    defineElement(TAG, Card, current);
    registry = scoped;
    scoped.define(BOOT_ELEMENT, class extends HTMLElement {});
    scoped.refuse = true;
    native.define(BOOT_ELEMENT, class extends HTMLElement {});
    await flush();

    expect(scoped.get(TAG)).toBeUndefined();
    expect(console.warn).toHaveBeenCalledOnce();
    expect(console.info).not.toHaveBeenCalled();
  });
});
