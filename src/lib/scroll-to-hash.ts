/** Scroll to a hash target; `#top` always goes to the document top. */
export function scrollToHashTarget(hash: string, behavior: ScrollBehavior = "smooth") {
  if (!hash || hash === "#") return false;

  if (hash === "#top") {
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

  el.scrollIntoView({ behavior, block: "start" });
  return true;
}
