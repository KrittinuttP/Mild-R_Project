/**
 * Fan-facing Discord alerts for upcoming / live streams.
 * Uses LIVE_DISCORD_WEBHOOK_URL (falls back to Live_DISCORD_WEBHOOK_URL).
 * Separate from ops job alerts (DISCORD_WEBHOOK_URL).
 */

export type LiveDiscordAlertKind =
  | "scheduled_new"
  | "rescheduled"
  | "soon_30min"
  | "live_now";

export type LiveDiscordAlertInput = {
  kind: LiveDiscordAlertKind;
  title: string;
  videoUrl: string;
  scheduledStart?: string | null;
  previousStart?: string | null;
  channelName?: string | null;
  /** Prefer cached Storage URL, then YouTube CDN, then hqdefault from videoId. */
  thumbnailUrl?: string | null;
  videoId?: string | null;
};

/** Public cover URL Discord can fetch (https). */
export function resolveLiveCoverUrl(entry: {
  thumbnailUrl?: string | null;
  videoId?: string | null;
  videoUrl?: string | null;
}): string | null {
  const direct = entry.thumbnailUrl?.trim();
  if (direct && /^https?:\/\//i.test(direct)) return direct;

  const fromField = entry.videoId?.trim();
  const fromUrl = entry.videoUrl
    ? entry.videoUrl.match(
        /(?:youtu\.be\/|v=|\/live\/|\/shorts\/)([A-Za-z0-9_-]{6,})/
      )?.[1]
    : undefined;
  const id = fromField || fromUrl;
  if (id && !id.startsWith("manual-")) {
    return `https://i.ytimg.com/vi/${id}/hqdefault.jpg`;
  }
  return null;
}

/** Discord embed colors (decimal) */
const COLORS: Record<LiveDiscordAlertKind, number> = {
  scheduled_new: 3447003, // blue
  rescheduled: 15105570, // orange
  soon_30min: 15844367, // gold
  live_now: 15158332, // red
};

const TITLES: Record<LiveDiscordAlertKind, string> = {
  scheduled_new: "📅 ประกาศตารางไลฟ์ใหม่",
  rescheduled: "⏳ แจ้งการเปลี่ยนแปลงเวลาไลฟ์",
  soon_30min: "⏰ เตรียมรับชม · ไลฟ์จะเริ่มในอีก ~30 นาที",
  live_now: "🔴 LIVE NOW · การถ่ายทอดสดเริ่มต้นแล้ว!",
};

function liveWebhookUrl(): string | undefined {
  return (
    Deno.env.get("LIVE_DISCORD_WEBHOOK_URL")?.trim() ||
    Deno.env.get("Live_DISCORD_WEBHOOK_URL")?.trim() ||
    undefined
  );
}

function bangkokParts(iso: string | null | undefined): {
  date: string;
  time: string;
  full: string;
} | null {
  if (!iso) return null;
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;

  const date = d.toLocaleDateString("th-TH", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("th-TH", {
    timeZone: "Asia/Bangkok",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
  });

  return {
    date,
    time: `${time} น.`,
    full: `${date} · ${time} น. (BKK)`,
  };
}

export function buildLiveDiscordPayload(entry: LiveDiscordAlertInput) {
  const when = bangkokParts(entry.scheduledStart);
  const prev = bangkokParts(entry.previousStart);
  const lines: string[] = [`**${entry.title}**`];

  if (entry.channelName) {
    lines.push(`ช่อง ${entry.channelName}`);
  }

  if (entry.kind === "rescheduled") {
    if (prev && when) {
      lines.push(`เปลี่ยนเป็น ${when.time} (จากเดิม ${prev.time})`);
    } else if (when) {
      lines.push(`เวลาใหม่: ${when.full}`);
    }
  } else if (entry.kind !== "live_now" && when) {
    lines.push(when.full);
  }

  lines.push(entry.videoUrl);

  const coverUrl = resolveLiveCoverUrl(entry);
  const embed: Record<string, unknown> = {
    title: TITLES[entry.kind],
    description: lines.join("\n"),
    color: COLORS[entry.kind],
    timestamp: new Date().toISOString(),
  };
  if (coverUrl) {
    // Full-width cover under the text (YouTube 16:9)
    embed.image = { url: coverUrl };
  }

  return {
    username: "Mild-R Live",
    embeds: [embed],
  };
}

/** Never throws. No-ops if LIVE webhook unset. */
export async function notifyLiveDiscord(
  entry: LiveDiscordAlertInput
): Promise<boolean> {
  const webhookUrl = liveWebhookUrl();
  if (!webhookUrl) {
    console.warn("[live-discord] LIVE_DISCORD_WEBHOOK_URL unset — skip");
    return false;
  }

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildLiveDiscordPayload(entry)),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        "[live-discord] webhook HTTP",
        res.status,
        body.slice(0, 200)
      );
      return false;
    }
    return true;
  } catch (err) {
    console.error(
      "[live-discord]",
      err instanceof Error ? err.message : err
    );
    return false;
  }
}
