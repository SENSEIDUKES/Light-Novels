/**
 * resolveScrollTarget
 *
 * Return the element that *actually* scrolls for a given content container.
 *
 * The reader viewport is styled `flex-1 overflow-y-auto`, but every ancestor in
 * the layout uses `min-height` (never a fixed height) — App root `min-h-dvh`,
 * `<main>` `min-h-[calc(100dvh-140px)]`, and the reader chamber `min-h-[85dvh]`.
 * Because nothing constrains the viewport's height, it grows to fit its content
 * and never overflows, so `overflow-y-auto` stays dormant and the *document* is
 * what scrolls — not the viewport div.
 *
 * The consequence: writing `viewport.scrollTop` is a silent no-op (its
 * scrollHeight equals its clientHeight), which is why cinematic auto-scroll
 * looked "active" — the pause/resume state machine ran fine — but never moved
 * the page on laptops or mobile.
 *
 * This resolves the correct element to drive: the container itself when it can
 * genuinely scroll (e.g. a future fixed-height / fullscreen layout), otherwise
 * the document scrolling element (window scroll) — exactly where the user's own
 * wheel / touch scrolling lands today.
 */
export function resolveScrollTarget(
  container: HTMLElement | null,
): HTMLElement | null {
  if (container && container.scrollHeight - container.clientHeight > 1) {
    return container;
  }
  if (typeof document !== 'undefined') {
    return (document.scrollingElement as HTMLElement | null) || document.documentElement;
  }
  return container;
}
