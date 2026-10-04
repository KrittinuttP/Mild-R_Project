const MAX_CORRECTIONS = 4;
const SETTLE_FALLBACK_MS = 1200;
const TOLERANCE_PX = 4;
const USER_SCROLL_EVENTS = ["wheel", "touchstart", "keydown"] as const;

let cancelPending: (() => void) | null = null;

/**
 * Lazy sections above the target grow while a long smooth scroll is running, so the
 * browser stops short of where the target ends up. Re-aim once each scroll settles,
 * and stop as soon as the user scrolls on their own.
 */
function settleOnTarget(el: HTMLElement, behavior: ScrollBehavior) {
  cancelPending?.();

  let corrections = 0;
  let timer = 0;
  let cancelled = false;

  const cancel = () => {
    cancelled = true;
    window.clearTimeout(timer);
    window.removeEventListener("scrollend", onSettled);
    for (const type of USER_SCROLL_EVENTS) {
      window.removeEventListener(type, cancel);
    }
    if (cancelPending === cancel) cancelPending = null;
  };

  const waitForSettle = () => {
    window.clearTimeout(timer);
    window.addEventListener("scrollend", onSettled, { once: true });
    timer = window.setTimeout(onSettled, SETTLE_FALLBACK_MS);
  };

  function onSettled() {
    if (cancelled) return;
    window.clearTimeout(timer);
    window.removeEventListener("scrollend", onSettled);

    const margin = parseFloat(getComputedStyle(el).scrollMarginTop) || 0;
    const offset = el.getBoundingClientRect().top - margin;
    const atBottom =
      window.scrollY + window.innerHeight >=
      document.documentElement.scrollHeight - 1;

    if (
      Math.abs(offset) <= TOLERANCE_PX ||
      (offset > 0 && atBottom) ||
      corrections >= MAX_CORRECTIONS
    ) {
      cancel();
      return;
    }
    corrections += 1;
    el.scrollIntoView({ behavior, block: "start" });
    waitForSettle();
  }

  for (const type of USER_SCROLL_EVENTS) {
    window.addEventListener(type, cancel, { passive: true, once: true });
  }
  cancelPending = cancel;
  el.scrollIntoView({ behavior, block: "start" });
  waitForSettle();
}

/** Scroll to a hash target; `#top` always goes to the document top. */
export function scrollToHashTarget(hash: string, behavior: ScrollBehavior = "smooth") {
  if (!hash || hash === "#") return false;

  if (hash === "#top") {
    cancelPending?.();
    window.scrollTo({ top: 0, behavior });
    return true;
  }

  const target = document.querySelector(hash);
  if (!(target instanceof HTMLElement)) return false;

  // Prefer visible targets (desktop/mobile branches may duplicate ids)
  const all = document.querySelectorAll(hash);
  let el = target;
  for (const node of all) {
    if (!(node instanceof HTMLElement)) continue;
    if (node.getClientRects().length > 0) {
      el = node;
      break;
    }
  }

  settleOnTarget(el, behavior);
  return true;
}