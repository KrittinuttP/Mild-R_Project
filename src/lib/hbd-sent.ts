/**
 * Rows for the "who has sent a card" list (server only), shared by
 * /hbd/2026/sent (main site) and /upload/hbd/sent (standalone).
 */
import type { HbdSentListRow } from "@/components/hbd/HbdSentList";
import { loadHbdSentNames } from "@/lib/hbd-submissions-store";

/** Every page that shows the list or its count: refresh these after a send or an admin change. */
export const HBD_SENT_PATHS = [
  "/hbd/2026/sent",
  "/hbd/2026/upload",
  "/upload/hbd",
  "/upload/hbd/send",
  "/upload/hbd/sent",
] as const;

/** "22 Nov", Bangkok time (formatted on the server so the browser shows the same text). */
const DAY_MONTH = new Intl.DateTimeFormat("en-GB", {
  day: "2-digit",
  month: "short",
  timeZone: "Asia/Bangkok",
});

export async function loadHbdSentRows(): Promise<HbdSentListRow[]> {
  const names = await loadHbdSentNames();
  return names.map((row, index) => ({
    // Oldest card = 1, so a name keeps its number as new cards arrive.
    number: names.length - index,
    name: row.name,
    date: DAY_MONTH.format(new Date(row.sentAt)),
  }));
}
