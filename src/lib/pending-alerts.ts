/**
 * Discord alerts for work waiting in the admin pages (alert channel, DISCORD_WEBHOOK_URL):
 *
 * - New HBD card: one message per card as it is sent (/api/hbd/submit).
 * - Pending digest: fan art + HBD cards still `pending`, twice a day
 *   (09:00 / 21:00 Bangkok, pg_cron → /api/admin/pending-digest). Silent when nothing waits.
 *
 * Server-only. Messages never ping anyone (see postDiscordWebhook).
 */
import { adminSiteOrigin } from "@/lib/cafe-host";
import { postDiscordWebhook } from "@/lib/discord-job-alert";
import { createAdminClient } from "@/lib/supabase/admin";

const PINK = 0xf2437d;
const DISPLAY_NAME_MAX = 80;

/** Discord markdown would turn a fan's name into formatting or a link. */
function escapeMarkdown(text: string) {
  return text.replace(/([\\*_~`|>[\]()#-])/g, "\\$1");
}

function adminLink(path: string): string | null {
  const origin = adminSiteOrigin();
  return origin ? `${origin}${path}` : null;
}

function bangkokParts(date: Date) {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(date);
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return { day: get("day"), month: get("month"), hour: get("hour"), minute: get("minute") };
}

/** "26 Oct" in Bangkok time. */
export function formatBangkokDay(iso: string): string {
  const { day, month } = bangkokParts(new Date(iso));
  return `${day} ${month}`;
}

/** "21:00" in Bangkok time (the cron runs at 09:00 and 21:00). */
function bangkokClock(date: Date): string {
  const { hour, minute } = bangkokParts(date);
  return `${hour}:${minute}`;
}

/** "2 Nov 21:14" in Bangkok time (English month, 24-hour). */
export function formatBangkokShort(iso: string): string {
  const parts = new Intl.DateTimeFormat("en-GB", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  }).formatToParts(new Date(iso));
  const get = (type: Intl.DateTimeFormatPartTypes) => parts.find((p) => p.type === type)?.value ?? "";
  return `${get("day")} ${get("month")} ${get("hour")}:${get("minute")}`;
}

/* ── New HBD card ─────────────────────────────────────────────────── */

export function buildHbdNewCardPayload(input: { id: string; displayName: string }) {
  const name = escapeMarkdown(input.displayName.trim().slice(0, DISPLAY_NAME_MAX));
  // Opens the card in the admin list; approving still needs the admin login and a click.
  const link = adminLink(`/admin/hbd?focus=${encodeURIComponent(input.id)}`);
  return {
    embeds: [
      {
        title: "🎂 New HBD card · รอ Approve",
        description: [`จาก **${name}**`, link ? `→ [Review & Approve](${link})` : null]
          .filter(Boolean)
          .join("\n"),
        color: PINK,
      },
    ],
  };
}

/** Never throws: the card is already saved when this runs. */
export async function notifyHbdNewCard(input: { id: string; displayName: string }): Promise<void> {
  await postDiscordWebhook(buildHbdNewCardPayload(input));
}

/* ── Pending digest ───────────────────────────────────────────────── */

export type PendingQueue = { count: number; oldestAt: string | null };
export type PendingCounts = { fanart: PendingQueue; hbd: PendingQueue };

/** Count + oldest `created_at` of `pending` rows. Throws on a database error (a 0 must mean 0). */
async function pendingQueue(table: string): Promise<PendingQueue> {
  const supabase = createAdminClient();
  const { data, count, error } = await supabase
    .from(table)
    .select("created_at", { count: "exact" })
    .eq("status", "pending")
    .order("created_at", { ascending: true })
    .limit(1);
  if (error) throw new Error(`${table}: ${error.message}`);
  const oldest = (data?.[0] as { created_at?: string } | undefined)?.created_at ?? null;
  return { count: count ?? 0, oldestAt: oldest };
}

export async function loadPendingCounts(): Promise<PendingCounts> {
  const [fanart, hbd] = await Promise.all([
    // One row per picture (a batch of 5 pictures = 5 rows).
    pendingQueue("mild_r_fanart_submissions"),
    pendingQueue("mild_r_hbd_submissions"),
  ]);
  return { fanart, hbd };
}

/** Null when nothing is waiting (no message is sent). `now` sets the "รอบ HH:MM" label. */
export function buildPendingDigestPayload(counts: PendingCounts, now: Date = new Date()) {
  const lines: string[] = [];
  const add = (emoji: string, label: string, unit: string, queue: PendingQueue, path: string) => {
    if (queue.count <= 0) return;
    const link = adminLink(path);
    const since = queue.oldestAt ? ` · ค้างนานสุดตั้งแต่ ${formatBangkokDay(queue.oldestAt)}` : "";
    lines.push(`${emoji} **${label} ${queue.count} ${unit}**${since}`);
    if (link) lines.push(`→ [Review ${label}](${link})`);
  };
  add("🎨", "Fan art", "รูป", counts.fanart, "/admin/fanart");
  add("🎂", "HBD card", "ใบ", counts.hbd, "/admin/hbd");
  if (!lines.length) return null;

  return {
    embeds: [
      {
        title: `📋 Pending approval · รอบ ${bangkokClock(now)}`,
        description: lines.join("\n"),
        color: PINK,
      },
    ],
  };
}
