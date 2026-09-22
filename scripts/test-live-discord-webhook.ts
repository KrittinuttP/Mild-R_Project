/**
 * Smoke-test LIVE Discord webhook (fan-facing).
 *   npx tsx --env-file=.env scripts/test-live-discord-webhook.ts
 */
async function main() {
  const webhookUrl =
    process.env.LIVE_DISCORD_WEBHOOK_URL?.trim() ||
    process.env.Live_DISCORD_WEBHOOK_URL?.trim();

  if (!webhookUrl) {
    console.error("Missing LIVE_DISCORD_WEBHOOK_URL (or Live_DISCORD_WEBHOOK_URL)");
    process.exit(1);
  }

  const res = await fetch(webhookUrl, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      username: "Mild-R Live",
      embeds: [
        {
          title: "🧪 Live webhook smoke test",
          description:
            "ทดสอบ LIVE_DISCORD_WEBHOOK_URL · ระบบแจ้งเตือนไลฟ์พร้อมใช้งาน",
          color: 0x5865f2,
          timestamp: new Date().toISOString(),
        },
      ],
    }),
  });

  if (!res.ok) {
    const body = await res.text().catch(() => "");
    throw new Error(`Discord HTTP ${res.status}: ${body.slice(0, 200)}`);
  }

  console.log("OK: Live Discord test alert sent");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
