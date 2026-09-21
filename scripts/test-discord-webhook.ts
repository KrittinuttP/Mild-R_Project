/**
 * Smoke-test Discord job webhook from DISCORD_WEBHOOK_URL.
 *   npx tsx --env-file=.env scripts/test-discord-webhook.ts
 */
import { notifyJobDiscord } from "../src/lib/discord-job-alert";

async function main() {
  if (!process.env.DISCORD_WEBHOOK_URL?.trim()) {
    console.error("Missing DISCORD_WEBHOOK_URL");
    process.exit(1);
  }

  await notifyJobDiscord({
    source: "test-discord-webhook",
    status: "success",
    message: "Smoke test · Discord job alerts wired for Mild-R jobs",
    saved_count: 0,
    meta: { via: "scripts/test-discord-webhook.ts" },
  });

  console.log("OK: Discord test alert sent");
}

main().catch((err) => {
  console.error(err);
  process.exit(1);
});
