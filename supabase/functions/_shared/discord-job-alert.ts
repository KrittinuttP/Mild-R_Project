/** Shared Discord job alert for Edge Functions (Deno). */

export type DiscordJobAlertInput = {
  source: string;
  status: string;
  message?: string | null;
  saved_count?: number;
  meta?: Record<string, unknown> | null;
};

const STATUS_COLOR: Record<string, number> = {
  success: 0x57f287,
  skipped: 0x95a5a6,
  error: 0xed4245,
};

const STATUS_EMOJI: Record<string, string> = {
  success: "✅",
  skipped: "⏭️",
  error: "❌",
};

const SOURCE_LABEL: Record<string, string> = {
  "edge-main": "YouTube · main",
  "edge-search": "YouTube · search",
  "edge-refresh": "YouTube · refresh",
  "edge-x-incremental": "X · incremental",
  "edge-x-backfill": "X · backfill",
  "edge-x-unknown": "X · unknown",
  "edge-x-error": "X · error",
  "edge-unknown": "YouTube · unknown",
  "edge-error": "YouTube · error",
  "agent-live-schedule": "Live Schedule Agent",
};

function labelFor(source: string): string {
  return SOURCE_LABEL[source] ?? source;
}

function bangkokNow(): string {
  return new Date().toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  });
}

export function buildDiscordJobPayload(entry: DiscordJobAlertInput) {
  const status = String(entry.status || "success");
  const emoji = STATUS_EMOJI[status] ?? "•";
  const color = STATUS_COLOR[status] ?? 0x5865f2;
  const title = `${emoji} ${labelFor(entry.source)}`;
  const description =
    (entry.message && entry.message.trim()) || "(no message)";

  return {
    username: "Mild-R Jobs",
    embeds: [
      {
        title,
        description: description.slice(0, 1800),
        color,
        fields: [
          { name: "status", value: status, inline: true },
          {
            name: "saved",
            value: String(entry.saved_count ?? 0),
            inline: true,
          },
          { name: "when (BKK)", value: bangkokNow(), inline: true },
        ],
        footer: { text: `source: ${entry.source}` },
      },
    ],
  };
}

export async function notifyJobDiscord(
  entry: DiscordJobAlertInput
): Promise<void> {
  const webhookUrl = Deno.env.get("DISCORD_WEBHOOK_URL")?.trim();
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
