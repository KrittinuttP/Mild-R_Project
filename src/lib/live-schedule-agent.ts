import type { SupabaseClient } from "@supabase/supabase-js";

import { resolveLuminaChannel } from "@/data/lumina-channels";
import { buildLiveAgentPrompt } from "@/lib/live-agent-prompt";
import {
  bangkokDateFromIso,
  previewLocalDate,
  type PreviewLikeRow,
} from "@/lib/live-preview-match";
import type { XLiveScheduleStatus } from "@/lib/x-live-schedules";

export type XLiveScheduleRow = {
  id: string;
  tweet_id: string;
  image_url: string | null;
  image_source_url: string | null;
  posted_at: string | null;
  status: XLiveScheduleStatus;
};

export type LiveAgentManualItem = {
  title: string;
  channel: string;
  date: string;
  time: string;
  member: boolean;
  own: boolean;
  collab: boolean;
};

export type ProcessScheduleResult = {
  tweet_id: string;
  status: XLiveScheduleStatus;
  items: LiveAgentManualItem[];
  /** Items that would be / were posted (after day-dedupe). */
  toInsert?: LiveAgentManualItem[];
  skippedDates?: string[];
  imported?: number;
  error?: string;
  dryRun?: boolean;
};

function addDaysYmd(ymd: string, days: number): string {
  const [y, m, d] = ymd.split("-").map(Number);
  const dt = new Date(Date.UTC(y, m - 1, d + days));
  const yy = dt.getUTCFullYear();
  const mm = String(dt.getUTCMonth() + 1).padStart(2, "0");
  const dd = String(dt.getUTCDate()).padStart(2, "0");
  return `${yy}-${mm}-${dd}`;
}

/**
 * Dates (Asia/Bangkok) that already have any live_streams row.
 * Used so Agent skips days that are already on the calendar.
 */
export async function loadExistingLiveDates(
  supabase: SupabaseClient,
  dates: string[]
): Promise<Set<string>> {
  const unique = [...new Set(dates.filter((d) => /^\d{4}-\d{2}-\d{2}$/.test(d)))].sort();
  const existing = new Set<string>();
  if (unique.length === 0) return existing;

  const fromYmd = addDaysYmd(unique[0], -1);
  const toYmd = addDaysYmd(unique[unique.length - 1], 2);
  const fromIso = new Date(`${fromYmd}T00:00:00+07:00`).toISOString();
  const toIso = new Date(`${toYmd}T00:00:00+07:00`).toISOString();

  const selectCols =
    "video_id, channel_id, channel_name, source_title, is_own_channel, scheduled_start, scheduled_start_first, actual_start, actual_end, metadata";

  const [byScheduled, byFirst, byActual] = await Promise.all([
    supabase
      .from("mild_r_live_streams")
      .select(selectCols)
      .gte("scheduled_start", fromIso)
      .lt("scheduled_start", toIso),
    supabase
      .from("mild_r_live_streams")
      .select(selectCols)
      .gte("scheduled_start_first", fromIso)
      .lt("scheduled_start_first", toIso),
    supabase
      .from("mild_r_live_streams")
      .select(selectCols)
      .gte("actual_start", fromIso)
      .lt("actual_start", toIso),
  ]);

  for (const res of [byScheduled, byFirst, byActual]) {
    if (res.error) throw res.error;
  }

  const byId = new Map<string, PreviewLikeRow>();
  for (const row of [
    ...(byScheduled.data ?? []),
    ...(byFirst.data ?? []),
    ...(byActual.data ?? []),
  ] as PreviewLikeRow[]) {
    byId.set(row.video_id, row);
  }

  const wanted = new Set(unique);
  for (const row of byId.values()) {
    const d =
      previewLocalDate(row) ||
      bangkokDateFromIso(
        row.scheduled_start_first ?? row.scheduled_start ?? row.actual_start
      );
    if (d && wanted.has(d)) existing.add(d);
  }
  return existing;
}

export async function filterItemsMissingOnCalendar(
  supabase: SupabaseClient,
  items: LiveAgentManualItem[]
): Promise<{
  toInsert: LiveAgentManualItem[];
  skipped: LiveAgentManualItem[];
  skippedDates: string[];
}> {
  const existing = await loadExistingLiveDates(
    supabase,
    items.map((i) => i.date)
  );
  const toInsert: LiveAgentManualItem[] = [];
  const skipped: LiveAgentManualItem[] = [];
  for (const item of items) {
    if (existing.has(item.date)) skipped.push(item);
    else toInsert.push(item);
  }
  const skippedDates = [...new Set(skipped.map((s) => s.date))].sort();
  return { toInsert, skipped, skippedDates };
}

export function parseAgentJsonArray(text: string): unknown[] {
  let raw = text.trim();
  if (raw.startsWith("```")) {
    raw = raw.replace(/^```(?:json)?\s*/i, "").replace(/\s*```$/i, "");
  }
  const start = raw.indexOf("[");
  const end = raw.lastIndexOf("]");
  if (start >= 0 && end > start) {
    raw = raw.slice(start, end + 1);
  }
  const parsed = JSON.parse(raw) as unknown;
  if (!Array.isArray(parsed)) {
    throw new Error("Agent response is not a JSON array");
  }
  return parsed;
}

export function normalizeManualItems(raw: unknown[]): LiveAgentManualItem[] {
  const out: LiveAgentManualItem[] = [];
  for (let i = 0; i < raw.length; i++) {
    const row = raw[i];
    if (!row || typeof row !== "object") continue;
    const o = row as Record<string, unknown>;
    const title = typeof o.title === "string" ? o.title.trim() : "";
    const channelRaw =
      typeof o.channel === "string"
        ? o.channel.trim()
        : typeof o.channelId === "string"
          ? o.channelId.trim()
          : "mild-r";
    const date = typeof o.date === "string" ? o.date.trim() : "";
    let time =
      typeof o.time === "string" && o.time.trim() ? o.time.trim() : "20:00";
    if (/^\d:\d{2}$/.test(time)) time = `0${time}`;

    const member =
      o.member === true || o.isMember === true || o.is_member === true;

    let ownFlag: boolean | null =
      typeof o.own === "boolean"
        ? o.own
        : typeof o.isOwn === "boolean"
          ? o.isOwn
          : typeof o.is_own_channel === "boolean"
            ? o.is_own_channel
            : null;

    let collabFlag: boolean | null =
      typeof o.collab === "boolean"
        ? o.collab
        : typeof o.isCollab === "boolean"
          ? o.isCollab
          : null;

    if (!title || !/^\d{4}-\d{2}-\d{2}$/.test(date)) continue;
    if (!/^\d{2}:\d{2}$/.test(time)) continue;

    const channel =
      resolveLuminaChannel(channelRaw) ?? resolveLuminaChannel("mild-r");
    if (!channel) continue;

    if (ownFlag == null) {
      ownFlag =
        Boolean(channel.isMain) ||
        /mild/i.test(channelRaw) ||
        member;
    }
    if (collabFlag == null) {
      collabFlag = !ownFlag;
    }

    out.push({
      title,
      channel: channel.isMain ? "mild-r" : channel.title,
      date,
      time,
      member,
      own: Boolean(ownFlag),
      collab: Boolean(collabFlag),
    });
  }
  return out;
}

async function fetchImageAsBase64(imageUrl: string): Promise<{
  mimeType: string;
  data: string;
}> {
  const res = await fetch(imageUrl, { headers: { Accept: "image/*" } });
  if (!res.ok) {
    throw new Error(`Failed to fetch schedule image: HTTP ${res.status}`);
  }
  const mimeType =
    res.headers.get("content-type")?.split(";")[0]?.trim() || "image/jpeg";
  const buf = Buffer.from(await res.arrayBuffer());
  return { mimeType, data: buf.toString("base64") };
}

/** Google AI Studio only (free-tier friendly). Never uses Vertex AI. */
async function generateWithGeminiApiKey(options: {
  prompt: string;
  mimeType: string;
  imageBase64: string;
}): Promise<string> {
  const apiKey = process.env.GEMINI_API_KEY?.trim();
  if (!apiKey) {
    throw new Error(
      "Set GEMINI_API_KEY from Google AI Studio (https://aistudio.google.com/apikey)"
    );
  }
  const modelRaw =
    process.env.GEMINI_MODEL?.trim() || "gemini-flash-lite-latest";
  // Env sometimes includes "models/" — URL already prefixes models/
  const model = modelRaw.replace(/^models\//i, "").trim();
  if (!model || /[/\s]/.test(model)) {
    throw new Error(
      `Invalid GEMINI_MODEL "${modelRaw}". Use e.g. gemini-flash-lite-latest`
    );
  }
  const url =
    `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${apiKey}`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      contents: [
        {
          role: "user",
          parts: [
            { text: options.prompt },
            {
              inline_data: {
                mime_type: options.mimeType,
                data: options.imageBase64,
              },
            },
          ],
        },
      ],
      generationConfig: { temperature: 0.1, maxOutputTokens: 8192 },
    }),
  });

  const body = (await res.json()) as {
    error?: { message?: string };
    candidates?: Array<{
      content?: { parts?: Array<{ text?: string }> };
    }>;
  };
  if (!res.ok) {
    throw new Error(body.error?.message || `Gemini API HTTP ${res.status}`);
  }
  const text = body.candidates?.[0]?.content?.parts
    ?.map((p) => p.text || "")
    .join("")
    .trim();
  if (!text) throw new Error("Gemini API returned empty text");
  return text;
}

export async function extractScheduleItemsFromImage(options: {
  imageUrl: string;
  postedAt?: string | null;
}): Promise<{ rawText: string; items: LiveAgentManualItem[] }> {
  const prompt = buildLiveAgentPrompt({ postedAt: options.postedAt });
  const image = await fetchImageAsBase64(options.imageUrl);

  const rawText = await generateWithGeminiApiKey({
    prompt,
    mimeType: image.mimeType,
    imageBase64: image.data,
  });

  const items = normalizeManualItems(parseAgentJsonArray(rawText));
  return { rawText, items };
}

export async function postManualLiveItems(
  items: LiveAgentManualItem[],
  options?: { apiBase?: string }
): Promise<{ inserted: number; body: unknown }> {
  if (items.length === 0) {
    return { inserted: 0, body: { ok: true, inserted: 0 } };
  }

  const base =
    options?.apiBase?.trim() ||
    process.env.LIVE_AGENT_API_BASE?.trim() ||
    process.env.NEXT_PUBLIC_SITE_URL?.trim() ||
    "http://localhost:3000";
  const url = `${base.replace(/\/$/, "")}/api/live/manual`;

  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(items),
  });
  const body = await res.json().catch(() => ({}));
  if (!res.ok) {
    const message =
      typeof body === "object" &&
      body &&
      "error" in body &&
      typeof (body as { error: unknown }).error === "string"
        ? (body as { error: string }).error
        : `manual API HTTP ${res.status}`;
    throw new Error(message);
  }
  const inserted =
    typeof body === "object" &&
    body &&
    "inserted" in body &&
    typeof (body as { inserted: unknown }).inserted === "number"
      ? (body as { inserted: number }).inserted
      : items.length;
  return { inserted, body };
}

async function markSchedule(
  supabase: SupabaseClient,
  tweetId: string,
  patch: {
    status: XLiveScheduleStatus;
    parsed_json?: unknown;
    error_message?: string | null;
    agent_processed_at?: string | null;
  }
) {
  const now = new Date().toISOString();
  const { error } = await supabase
    .from("mild_r_x_live_schedules")
    .update({
      status: patch.status,
      parsed_json: patch.parsed_json ?? null,
      error_message: patch.error_message ?? null,
      agent_processed_at:
        patch.agent_processed_at === undefined
          ? now
          : patch.agent_processed_at,
      updated_at: now,
    })
    .eq("tweet_id", tweetId);
  if (error) throw error;
}

export async function processLiveScheduleRow(
  supabase: SupabaseClient,
  row: XLiveScheduleRow,
  options?: { dryRun?: boolean; apiBase?: string }
): Promise<ProcessScheduleResult> {
  const dryRun = Boolean(options?.dryRun);
  const apiBase = options?.apiBase;
  if (!row.image_url) {
    await markSchedule(supabase, row.tweet_id, {
      status: "failed",
      error_message: "Missing image_url",
      parsed_json: null,
    });
    return {
      tweet_id: row.tweet_id,
      status: "failed",
      items: [],
      error: "Missing image_url",
    };
  }

  try {
    const { items } = await extractScheduleItemsFromImage({
      imageUrl: row.image_url,
      postedAt: row.posted_at,
    });

    if (items.length === 0) {
      if (!dryRun) {
        await markSchedule(supabase, row.tweet_id, {
          status: "skipped",
          parsed_json: [],
          error_message: "No extractable lives",
        });
      }
      return {
        tweet_id: row.tweet_id,
        status: "skipped",
        items: [],
        toInsert: [],
        skippedDates: [],
        dryRun,
      };
    }

    const { toInsert, skippedDates } = await filterItemsMissingOnCalendar(
      supabase,
      items
    );

    if (toInsert.length === 0) {
      if (!dryRun) {
        await markSchedule(supabase, row.tweet_id, {
          status: "skipped",
          parsed_json: items,
          error_message: `All dates already on calendar: ${skippedDates.join(", ")}`,
        });
      }
      return {
        tweet_id: row.tweet_id,
        status: "skipped",
        items,
        toInsert: [],
        skippedDates,
        dryRun,
        error: `All dates already on calendar (${skippedDates.length})`,
      };
    }

    if (dryRun) {
      return {
        tweet_id: row.tweet_id,
        status: "pending",
        items,
        toInsert,
        skippedDates,
        dryRun: true,
      };
    }

    const { inserted } = await postManualLiveItems(toInsert, { apiBase });
    await markSchedule(supabase, row.tweet_id, {
      status: "imported",
      parsed_json: {
        extracted: items,
        imported: toInsert,
        skipped_dates: skippedDates,
      },
      error_message:
        skippedDates.length > 0
          ? `Skipped existing dates: ${skippedDates.join(", ")}`
          : null,
    });
    return {
      tweet_id: row.tweet_id,
      status: "imported",
      items,
      toInsert,
      skippedDates,
      imported: inserted,
    };
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    if (!dryRun) {
      await markSchedule(supabase, row.tweet_id, {
        status: "failed",
        error_message: message.slice(0, 2000),
        parsed_json: null,
      });
    }
    return {
      tweet_id: row.tweet_id,
      status: "failed",
      items: [],
      error: message,
      dryRun,
    };
  }
}

export async function loadPendingLiveSchedules(
  supabase: SupabaseClient,
  options?: { limit?: number; tweetId?: string }
): Promise<XLiveScheduleRow[]> {
  let q = supabase
    .from("mild_r_x_live_schedules")
    .select(
      "id, tweet_id, image_url, image_source_url, posted_at, status"
    )
    .order("posted_at", { ascending: false, nullsFirst: false });

  if (options?.tweetId) {
    q = q.eq("tweet_id", options.tweetId);
  } else {
    q = q.eq("status", "pending");
  }

  const limit = options?.limit ?? 1;
  q = q.limit(Math.max(1, Math.min(limit, 20)));

  const { data, error } = await q;
  if (error) throw error;
  return (data ?? []) as XLiveScheduleRow[];
}
