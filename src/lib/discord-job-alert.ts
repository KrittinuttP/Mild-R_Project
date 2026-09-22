/**
 * Ops Discord alerts after sync/job runs.
 * Uses DISCORD_WEBHOOK_URL (separate from LIVE_DISCORD_WEBHOOK_URL).
 */

export type DiscordJobAlertInput = {
  source: string;
  status: string;
  message?: string | null;
  saved_count?: number;
  meta?: Record<string, unknown> | null;
};

const STATUS_COLOR: Record<string, number> = {
  success: 5763719, // green
  skipped: 9807270, // gray
  error: 15548997, // red
};

const STATUS_EMOJI: Record<string, string> = {
  success: "✅",
  skipped: "⏭️",
  error: "❌",
};

/** Title: Thai short | English */
const SOURCE_TITLE: Record<string, string> = {
  "edge-main": "YouTube · อัปเดตช่องหลัก | Main Channel Update",
  "edge-search": "YouTube · ค้นหาช่องที่เกี่ยวข้อง | Related Channels Search",
  "edge-refresh": "YouTube · รีเฟรชสถิติ | Stream Refresh",
  "edge-live-monitor": "YouTube · ระบบเฝ้าระวังไลฟ์ | Live Monitor",
  "edge-x-incremental": "X · ซิงค์ข้อมูลล่าสุด | Incremental Sync",
  "edge-x-backfill": "X · เติมข้อมูลย้อนหลัง | Backfill",
  "edge-x-unknown": "X · คำสั่งไม่ถูกต้อง | Invalid Action",
  "edge-x-error": "X · ข้อผิดพลาดระบบ | System Error",
  "edge-unknown": "YouTube · คำสั่งไม่ถูกต้อง | Invalid Action",
  "edge-error": "YouTube · ข้อผิดพลาดระบบ | System Error",
  "agent-live-schedule": "Live Schedule Agent",
  "test-discord-webhook": "ทดสอบระบบ | Smoke Test",
};

function titleFor(source: string, status: string): string {
  const emoji = STATUS_EMOJI[status] ?? "•";
  const label = SOURCE_TITLE[source] ?? source;
  return `${emoji} ${label}`;
}

function bangkokNow(): string {
  return new Date().toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

function num(meta: Record<string, unknown> | null | undefined, key: string): number | null {
  if (!meta) return null;
  const v = meta[key];
  return typeof v === "number" && Number.isFinite(v) ? v : null;
}

function humanSummary(entry: DiscordJobAlertInput): string {
  const status = String(entry.status || "success");
  const saved = entry.saved_count ?? 0;
  const meta = entry.meta ?? null;
  const source = entry.source;

  if (status === "error") {
    const msg = (entry.message || "").toLowerCase();
    if (msg.includes("429") || msg.includes("rate limit") || msg.includes("quota")) {
      return "ติดจำกัดการใช้งาน / Rate limit or quota exceeded";
    }
    if (msg.includes("missing") || msg.includes("secret") || msg.includes("not configured")) {
      return "การตั้งค่าระบบไม่ครบ / Configuration missing";
    }
    return "ไม่สามารถดึงข้อมูลได้ / Failed to fetch or process data";
  }

  if (source === "edge-main") {
    return `บันทึกข้อมูลสตรีม / Saved streams: ${saved}`;
  }
  if (source === "edge-search") {
    if (status === "skipped") {
      return "ไม่พบไลฟ์หรือสตรีมใหม่ / No new live or upcoming streams";
    }
    return `บันทึกสตรีมที่เกี่ยวข้อง / Saved related streams: ${saved}`;
  }
  if (source === "edge-refresh") {
    if (status === "skipped") {
      const days = num(meta, "lookbackDays") ?? 30;
      return `ไม่มีสตรีมให้อัปเดตในช่วง ${days} วัน / No streams to refresh`;
    }
    const scanned = num(meta, "scanned");
    if (scanned != null) {
      return `อัปเดตสตรีม / Refreshed: ${saved}/${scanned}`;
    }
    return `อัปเดตสตรีม / Refreshed: ${saved}`;
  }
  if (source === "edge-live-monitor") {
    const n30 = num(meta, "notified30") ?? 0;
    const nLive = num(meta, "notifiedLive") ?? 0;
    return `ส่งแจ้งเตือนสำเร็จ / Alerts sent: ${n30 + nLive}`;
  }
  if (source === "edge-x-incremental") {
    if (status === "skipped" || saved === 0) {
      return "ไม่มีโพสต์ใหม่ให้อัปเดต / No new posts to sync";
    }
    const newCount = num(meta, "newCount");
    const scheduleFlagged = num(meta, "scheduleFlagged");
    const scheduleCached = num(meta, "scheduleCached");
    const parts = [`อัปเดต / Upserted: ${saved}`];
    const detail: string[] = [];
    if (newCount != null) detail.push(`ใหม่/New: ${newCount}`);
    if (scheduleFlagged != null && scheduleCached != null) {
      detail.push(`ตาราง/Schedule: ${scheduleCached}`);
    }
    if (detail.length) parts.push(`(${detail.join(", ")})`);
    return parts.join(" ");
  }
  if (source === "edge-x-backfill") {
    return `เติมข้อมูล / Backfill upserted: ${saved}`;
  }
  if (source === "agent-live-schedule") {
    if (status === "skipped" || (num(meta, "processed") === 0 && saved === 0)) {
      return "ไม่มีตารางงานใหม่ให้ประมวลผล / No new schedules to process";
    }
    const processed = num(meta, "processed");
    if (processed != null) {
      return `ประมวลผลตาราง / Processed: ${processed} · บันทึก/Saved: ${saved}`;
    }
    return `บันทึกสล็อต / Saved slots: ${saved}`;
  }

  if (status === "skipped") {
    return "ไม่มีข้อมูลใหม่ / No updates";
  }
  return saved > 0
    ? `บันทึก / Saved: ${saved}`
    : (entry.message?.trim() || "สำเร็จ / Success");
}

function codeDetail(entry: DiscordJobAlertInput): string {
  const status = String(entry.status || "success");
  const raw = (entry.message && entry.message.trim()) || "";
  const meta = entry.meta ?? null;

  if (status === "error") {
    return `[Error: ${raw.slice(0, 400) || "unknown"}]`;
  }

  if (entry.source === "edge-live-monitor" && meta) {
    const n30 = num(meta, "notified30") ?? 0;
    const nLive = num(meta, "notifiedLive") ?? 0;
    const yt = num(meta, "ytPolled") ?? 0;
    return `[Alerts: 30min=${n30}, live=${nLive}, ytPolled=${yt}]`;
  }

  if (entry.source === "edge-x-incremental" && meta) {
    const upserted = num(meta, "upserted") ?? entry.saved_count ?? 0;
    const newCount = num(meta, "newCount") ?? 0;
    const flagged = num(meta, "scheduleFlagged") ?? 0;
    const cached = num(meta, "scheduleCached") ?? 0;
    const stop = typeof meta.stoppedReason === "string" ? meta.stoppedReason : "?";
    return `[Upserted: ${upserted} (new ${newCount}, schedule ${flagged}/${cached}, stop=${stop})]`;
  }

  if (entry.source === "edge-x-backfill" && meta) {
    const upserted = num(meta, "upserted") ?? entry.saved_count ?? 0;
    const pages = num(meta, "pages");
    const flagged = num(meta, "scheduleFlagged");
    const cached = num(meta, "scheduleCached");
    const bits = [`Upserted: ${upserted}`];
    if (pages != null) bits.push(`pages ${pages}`);
    if (flagged != null && cached != null) bits.push(`schedule ${flagged}/${cached}`);
    return `[${bits.join(", ")}]`;
  }

  if (entry.source === "edge-refresh" && meta) {
    const scanned = num(meta, "scanned");
    const days = num(meta, "lookbackDays");
    if (status === "skipped") {
      return `[Status: no streams refreshed in last ${days ?? 30} days]`;
    }
    return `[Refreshed: ${entry.saved_count ?? 0}/${scanned ?? "?"} (${days ?? 30}d)]`;
  }

  if (entry.source === "edge-search") {
    if (status === "skipped") {
      return "[Status: no related live/upcoming/completed streams]";
    }
    return `[Status: saved ${entry.saved_count ?? 0} streams]`;
  }

  if (entry.source === "edge-main") {
    return `[Status: saved ${entry.saved_count ?? 0} streams]`;
  }

  if (entry.source === "agent-live-schedule") {
    if (raw) return `[${raw}]`;
    return `[via=api, processed=${num(meta, "processed") ?? 0}]`;
  }

  if (raw) return `[${raw.slice(0, 500)}]`;
  return `[Status: ${status}, saved ${entry.saved_count ?? 0}]`;
}

/** Build Discord webhook payload (embed) for a job run summary. */
export function buildDiscordJobPayload(entry: DiscordJobAlertInput) {
  const status = String(entry.status || "success");
  const color = STATUS_COLOR[status] ?? 0x5865f2;
  const title = titleFor(entry.source, status);
  const summary = humanSummary(entry);
  const detail = codeDetail(entry);
  const when = bangkokNow();

  const description = [summary, detail, when].join("\n").slice(0, 1800);

  return {
    username: "Mild-R Jobs",
    embeds: [
      {
        title: title.slice(0, 250),
        description,
        color,
        footer: { text: `source: ${entry.source}` },
      },
    ],
  };
}

/**
 * Notify Discord about a sync/job run. Never throws.
 * Uses DISCORD_WEBHOOK_URL from env; no-ops if unset.
 */
export async function notifyJobDiscord(
  entry: DiscordJobAlertInput
): Promise<void> {
  // Temporarily: only surface failures (success/skipped muted)
  if (String(entry.status || "").toLowerCase() !== "error") return;

  const webhookUrl =
    typeof process !== "undefined"
      ? process.env.DISCORD_WEBHOOK_URL?.trim()
      : undefined;
  if (!webhookUrl) return;

  try {
    const res = await fetch(webhookUrl, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(buildDiscordJobPayload(entry)),
    });
    if (!res.ok) {
      const body = await res.text().catch(() => "");
      console.error(
        "[discord] webhook HTTP",
        res.status,
        body.slice(0, 200)
      );
    }
  } catch (err) {
    console.error(
      "[discord] webhook:",
      err instanceof Error ? err.message : err
    );
  }
}
