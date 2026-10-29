/**
 * Home splash → hero hand-off.
 * The hero intro (and the "tap me" hint) wait until the splash starts to fade,
 * so people see them — they used to finish underneath the splash.
 */
const EXIT_EVENT = "mildr:splash-exit";
let showing = false;

/** SiteSplash: the overlay is up and will fade later. */
export function markSplashShowing() {
  showing = true;
}

/** SiteSplash: fading starts now (or the splash was skipped / unmounted). */
export function markSplashExit() {
  if (!showing) return;
  showing = false;
  window.dispatchEvent(new Event(EXIT_EVENT));
}

/**
 * Run `run` once the splash starts to fade — right away when no splash is up.
 * `maxWaitMs` is a safety net in case the signal never comes. Returns a cancel function.
 */
export function afterSplash(run: () => void, maxWaitMs = 2500): () => void {
  if (!showing) {
    run();
    return () => {};
  }
  let settled = false;
  const stop = () => {
    settled = true;
    window.removeEventListener(EXIT_EVENT, go);
    window.clearTimeout(timer);
  };
  function go() {
    if (settled) return;
    stop();
    run();
  }
  const timer = window.setTimeout(go, maxWaitMs);
  window.addEventListener(EXIT_EVENT, go);
  return stop;
}
