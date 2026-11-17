/**
 * Define the card's custom elements, and define them again if the dashboard's
 * element registry loses them.
 *
 * Home Assistant 2026.8 to 2026.10 install a scoped custom element registry
 * polyfill while the page boots, replacing `window.customElements`. A module
 * that runs before the swap defines its elements in the browser's own
 * registry, which the dashboard no longer reads, so the card shows
 * "Configuration error". Fixed in Home Assistant 2026.11:
 * https://github.com/home-assistant/frontend/issues/52960
 *
 * The dashboard app defines `home-assistant` after the swap, so that signal,
 * or a fallback timer, triggers one check of the registry in use by then.
 */

/** How long to wait for the dashboard app before checking anyway. */
export const FALLBACK_MS = 5000;

/** The element the dashboard app defines once its registry is in place. */
export const BOOT_ELEMENT = "home-assistant";

type Registry = Pick<CustomElementRegistry, "define" | "get" | "whenDefined">;

/**
 * Define `tag` and arm a single check that defines it again where it's missing.
 *
 * `current` returns the registry in use now; tests replace it.
 */
export function defineElement(
  tag: string,
  constructor: CustomElementConstructor,
  current: () => Registry = () => window.customElements,
  fallbackMs: number = FALLBACK_MS,
): void {
  const loadRegistry = current();
  // The module ran before, for example from a dashboard resource and an extra
  // module both. The first load already armed its check.
  if (loadRegistry.get(tag)) return;
  loadRegistry.define(tag, constructor);

  let checked = false;
  const check = (trigger: string): void => {
    if (checked) return;
    checked = true;
    clearTimeout(timer);
    const registry = current();
    if (registry.get(tag)) return;
    try {
      // A registry may refuse a constructor another registry already holds.
      registry.define(tag, class extends constructor {});
      console.info(`Canvas LMS: defined <${tag}> again in the dashboard's registry (${trigger})`);
    } catch (err) {
      console.warn(`Canvas LMS: could not define <${tag}> again (${trigger})`, err);
    }
  };

  const timer = setTimeout(() => check("fallback"), fallbackMs);
  loadRegistry.whenDefined(BOOT_ELEMENT).then(
    () => check(BOOT_ELEMENT),
    () => undefined,
  );
}
