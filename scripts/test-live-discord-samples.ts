/**
 * Send all 4 LIVE Discord alert styles using a stream from a Bangkok date.
 *   npx tsx --env-file=.env scripts/test-live-discord-samples.ts
 *   npx tsx --env-file=.env scripts/test-live-discord-samples.ts 2026-09-20
 */
import { createClient } from "@supabase/supabase-js";

type Kind = "scheduled_new" | "rescheduled" | "soon_30min" | "live_now";

const COLORS: Record<Kind, number> = {
  scheduled_new: 3447003,
  rescheduled: 15105570,
  soon_30min: 15844367,
  live_now: 15158332,
};

const TITLES: Record<Kind, string> = {
  scheduled_new: "📅 ประกาศตารางไลฟ์ใหม่",
  rescheduled: "⏳ แจ้งการเปลี่ยนแปลงเวลาไลฟ์",
  soon_30min: "⏰ เตรียมรับชม · ไลฟ์จะเริ่มในอีก ~30 นาที",
  live_now: "🔴 LIVE NOW · การถ่ายทอดสดเริ่มต้นแล้ว!",
};

function bangkokParts(iso: string | null | undefined) {
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

function resolveCoverUrl(entry: {
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

function buildPayload(
  kind: Kind,
  entry: {
    title: string;
    videoUrl: string;
    scheduledStart: string | null;
    previousStart?: string | null;
    channelName: string | null;
    thumbnailUrl?: string | null;
    videoId?: string | null;
  }
) {
  const when = bangkokParts(entry.scheduledStart);
  const prev = bangkokParts(entry.previousStart);
  const lines = [`**${entry.title}**`];
  if (entry.channelName) lines.push(`ช่อง ${entry.channelName}`);
  if (kind === "rescheduled") {
    if (prev && when) {
      lines.push(`เปลี่ยนเป็น ${when.time} (จากเดิม ${prev.time})`);
    } else if (when) {
      lines.push(`เวลาใหม่: ${when.full}`);
    }
  } else if (kind !== "live_now" && when) {
    lines.push(when.full);
  }
  lines.push(entry.videoUrl);

  const coverUrl = resolveCoverUrl(entry);
  const embed: Record<string, unknown> = {
    title: TITLES[kind],
    description: lines.join("\n"),
    color: COLORS[kind],
    timestamp: new Date().toISOString(),
  };
  if (coverUrl) {
    embed.image = { url: coverUrl };
  }

  return {
    username: "Mild-R Live",
    embeds: [embed],
  };
}

async function main() {
  const day = (process.argv[2] || "2026-09-20").trim();
  const webhook =
    process.env.LIVE_DISCORD_WEBHOOK_URL?.trim() ||
    process.env.Live_DISCORD_WEBHOOK_URL?.trim();
  if (!webhook) {
    console.error("Missing LIVE_DISCORD_WEBHOOK_URL");
    process.exit(1);
  }

  // Bangkok calendar day → UTC window (UTC+7)
  const fromIso = `${day}T00:00:00+07:00`;
  const toIso = `${day}T23:59:59.999+07:00`;
  const from = new Date(fromIso).toISOString();
  const to = new Date(toIso).toISOString();

  const supabase = createClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.SUPABASE_SERVICE_ROLE_KEY!
  );

  const { data: rows, error } = await supabase
    .from("mild_r_live_streams")
    .select(
      "video_id, title, url, channel_name, scheduled_start, actual_start, actual_end, is_own_channel, thumbnail_url, thumbnail_cached_url"
    )
    .not("video_id", "like", "manual-%")
    .or(
      `and(scheduled_start.gte.${from},scheduled_start.lte.${to}),and(actual_start.gte.${from},actual_start.lte.${to})`
    )
    .order("actual_start", { ascending: false, nullsFirst: false })
    .order("scheduled_start", { ascending: false, nullsFirst: false })
    .limit(10);

  if (error) throw error;

  const list = rows ?? [];
  // Prefer own channel + has actual_start
  const pick =
    list.find((r) => r.is_own_channel && r.actual_start) ||
    list.find((r) => r.actual_start) ||
    list[0];

  if (!pick) {
    console.error(`No real streams found for BKK date ${day}`);
    process.exit(1);
  }

  const scheduledStart =
    (pick.scheduled_start as string | null) ||
    (pick.actual_start as string | null);
  const previousStart = scheduledStart
    ? new Date(new Date(scheduledStart).getTime() - 30 * 60 * 1000).toISOString()
    : null;

  const thumbnailUrl =
    (pick.thumbnail_cached_url as string | null) ||
    (pick.thumbnail_url as string | null);

  const base = {
    title: (pick.title as string) || (pick.video_id as string),
    videoUrl:
      (pick.url as string) ||
      `https://www.youtube.com/watch?v=${pick.video_id}`,
    scheduledStart,
    channelName: (pick.channel_name as string) || "Mild-R",
    thumbnailUrl,
    videoId: pick.video_id as string,
  };

  console.log(
    JSON.stringify(
      {
        day,
        video_id: pick.video_id,
        title: pick.title,
        scheduled_start: pick.scheduled_start,
        actual_start: pick.actual_start,
        cover: resolveCoverUrl(base),
      },
      null,
      2
    )
  );

  const kinds: Kind[] = [
    "scheduled_new",
    "rescheduled",
    "soon_30min",
    "live_now",
  ];

  for (const kind of kinds) {
    const payload = buildPayload(kind, {
      ...base,
      previousStart: kind === "rescheduled" ? previousStart : null,
    });
    const res = await fetch(webhook, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      throw new Error(`${kind} HTTP ${res.status}: ${body.slice(0, 200)}`);
    }
    console.log("sent:", kind);
    await new Promise((r) => setTimeout(r, 700));
  }

  console.log("OK: all 4 live alert samples sent (with cover)");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
