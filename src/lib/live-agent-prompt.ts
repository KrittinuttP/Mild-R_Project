import { readFileSync } from "fs";
import path from "path";

import { LUMINA_CHANNELS, type LuminaChannel } from "@/data/lumina-channels";

const TEMPLATE_REL = path.join("doc", "agent", "live-prompt.txt");

export type LiveAgentPromptContext = {
  /** X post / schedule poster time — used for year-month hints */
  postedAt?: string | null;
  /** Override calendar year when known (e.g. from ops UI) */
  referenceYear?: number | null;
  /** Optional extra hint injected into schedule context */
  weekHint?: string | null;
};

function channelKeyForPrompt(channel: LuminaChannel): string {
  if (channel.isMain) return "mild-r";
  return channel.title
    .normalize("NFD")
    .replace(/\p{M}/gu, "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "");
}

/** Lines for {{ALLOWED_CHANNELS}} — rebuilt from Lumina master each call. */
export function formatAllowedChannelsBlock(
  channels: LuminaChannel[] = LUMINA_CHANNELS
): string {
  return channels
    .map((c) => {
      const key = channelKeyForPrompt(c);
      const aliases = [
        c.title,
        c.name,
        c.handle ? c.handle.replace(/^@/, "") : null,
      ]
        .filter((v): v is string => Boolean(v && v.trim()))
        .filter((v, i, arr) => arr.indexOf(v) === i);

      const flags: string[] = [];
      if (c.isMain) flags.push("MAIN");
      if (c.unit) flags.push(c.unit);
      if (c.project) flags.push(c.project);
      const flagStr = flags.length ? ` [${flags.join(", ")}]` : "";

      return `- "${key}"${flagStr} — aliases: ${aliases.join(" | ")}`;
    })
    .join("\n");
}

export function formatScheduleContextBlock(
  ctx: LiveAgentPromptContext = {}
): string {
  const lines: string[] = ["Schedule context:"];

  if (ctx.postedAt) {
    const d = new Date(ctx.postedAt);
    if (!Number.isNaN(d.getTime())) {
      const ymd = new Intl.DateTimeFormat("en-CA", {
        timeZone: "Asia/Bangkok",
        year: "numeric",
        month: "2-digit",
        day: "2-digit",
      }).format(d);
      lines.push(
        `- Poster / X post time (Asia/Bangkok): ${ymd} (ISO ${d.toISOString()})`
      );
      lines.push(
        `- Prefer this year (${ymd.slice(0, 4)}) when the image omits the year.`
      );
    } else {
      lines.push(`- postedAt (raw): ${ctx.postedAt}`);
    }
  }

  if (ctx.referenceYear != null && Number.isFinite(ctx.referenceYear)) {
    lines.push(`- Reference year: ${ctx.referenceYear}`);
  }

  if (ctx.weekHint?.trim()) {
    lines.push(`- Week hint: ${ctx.weekHint.trim()}`);
  }

  if (lines.length === 1) {
    lines.push(
      "- No poster timestamp provided — assume year 2026 unless the image shows another year."
    );
  }

  return lines.join("\n");
}

export function loadLiveAgentPromptTemplate(
  templatePath = path.join(process.cwd(), TEMPLATE_REL)
): string {
  return readFileSync(templatePath, "utf8");
}

/**
 * Build the full vision/LLM prompt: template from doc/agent/live-prompt.txt
 * + Allowed channels from Lumina master + optional schedule context.
 */
export function buildLiveAgentPrompt(
  ctx: LiveAgentPromptContext = {},
  options?: { template?: string; channels?: LuminaChannel[] }
): string {
  const template = options?.template ?? loadLiveAgentPromptTemplate();
  const channels = options?.channels ?? LUMINA_CHANNELS;

  return template
    .replaceAll("{{SCHEDULE_CONTEXT}}", formatScheduleContextBlock(ctx))
    .replaceAll("{{ALLOWED_CHANNELS}}", formatAllowedChannelsBlock(channels));
}
