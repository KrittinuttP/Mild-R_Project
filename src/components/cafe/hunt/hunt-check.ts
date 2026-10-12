/** Browser-side call to /api/cafe/hunt/check. */

export type HuntCheckResult =
  | { kind: "found"; index: number }
  | { kind: "invalid" }
  /** Offline, timeout, or the hunt is not set up on the server. */
  | { kind: "unreachable" };

const TIMEOUT_MS = 8000;

export async function checkHuntToken(token: string): Promise<HuntCheckResult> {
  const controller = new AbortController();
  const timer = window.setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const response = await fetch("/api/cafe/hunt/check", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ token }),
      signal: controller.signal,
    });
    if (response.status === 404) return { kind: "invalid" };
    if (!response.ok) return { kind: "unreachable" };
    const data = (await response.json().catch(() => null)) as {
      index?: unknown;
    } | null;
    return typeof data?.index === "number"
      ? { kind: "found", index: data.index }
      : { kind: "unreachable" };
  } catch {
    return { kind: "unreachable" };
  } finally {
    window.clearTimeout(timer);
  }
}
