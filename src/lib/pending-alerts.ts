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
        title: "🎂 การ์ดอวยพรใหม่",
        description: [`จาก **${name}**`, link ? `👉 [ตรวจ / approve](${link})` : null]
          .filter(Boolean)
          .join("\n"),
        color: PINK,
        footer: { text: "source: hbd-submit" },
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

/** Null when nothing is waiting (no message is sent). */
export function buildPendingDigestPayload(counts: PendingCounts) {
  const lines: string[] = [];
  const line = (emoji: string, label: string, queue: PendingQueue, path: string) => {
    if (queue.count <= 0) return;
    const link = adminLink(path);
    const oldest = queue.oldestAt ? ` · เก่าสุด ${formatBangkokShort(queue.oldestAt)}` : "";
    lines.push(
      `${emoji} ${label.replace("{n}", `**${queue.count}**`)}${oldest}${link ? ` · [เปิด](${link})` : ""}`
    );
  };
  line("🎨", "แฟนอาร์ต {n} รูป", counts.fanart, "/admin/fanart");
  line("🎂", "การ์ด HBD {n} ใบ", counts.hbd, "/admin/hbd");
  if (!lines.length) return null;

  return {
    embeds: [
      {
        title: "📋 รอตรวจตอนนี้",
        description: lines.join("\n"),
        color: PINK,
        footer: { text: "source: pending-digest · 09:00 / 21:00" },
      },
    ],
  };
}
