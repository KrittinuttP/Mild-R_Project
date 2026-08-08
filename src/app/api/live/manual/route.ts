import { NextResponse } from "next/server";

import {
  getLuminaSourceTitle,
  resolveLuminaChannel,
} from "@/data/lumina-channels";
import {
  classifyLiveOwnership,
  MILD_R_CHANNEL_ID,
} from "@/lib/live-stream-classify";
import {
  collectPreviewIdsToDelete,
  isUnlinkedPreview,
  previewLocalDate,
  type PreviewLikeRow,
} from "@/lib/live-preview-match";
import { createAdminClient } from "@/lib/supabase/admin";
import { snapScheduledToHalfHour } from "@/lib/snap-scheduled";
import { getYoutubeVideoId } from "@/lib/youtube";

export const runtime = "nodejs";

type ManualLiveInput = {
  title?: unknown;
  channel?: unknown;
  channelId?: unknown;
  date?: unknown;
  time?: unknown;
  collab?: unknown;
  isCollab?: unknown;
  own?: unknown;
  isOwn?: unknown;
  is_own_channel?: unknown;
  member?: unknown;
  isMember?: unknown;
  is_member?: unknown;
  /** YouTube watch / live URL (required when member) */
  url?: unknown;
  youtubeUrl?: unknown;
  link?: unknown;
};

type BuiltRow = Record<string, unknown> & {
  video_id: string;
  metadata: Record<string, unknown>;
};

type YtVideoPayload = {
  id: string;
  title: string;
  channelId: string;
  channelTitle: string;
  description: string;
  thumbnailUrl: string | null;
  tags: string[];
  scheduledStart: string | null;
  actualStart: string | null;
  actualEnd: string | null;
  viewCount: number;
  likeCount: string | null;
  privacyStatus: string | null;
  liveBroadcastContent: string | null;
};

function isYmd(value: string) {
  return /^\d{4}-\d{2}-\d{2}$/.test(value);
}

function isHm(value: string) {
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(value);
}

function bangkokToIso(date: string, time: string) {
  const iso = new Date(`${date}T${time}:00+07:00`);
  if (!Number.isFinite(iso.getTime())) return null;
  return iso.toISOString();
}

function bangkokDateFromIso(iso: string | null | undefined): string | null {
  if (!iso) return null;
  const t = new Date(iso).getTime();
  if (!Number.isFinite(t)) return null;
  return new Intl.DateTimeFormat("en-CA", {
    timeZone: "Asia/Bangkok",
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(new Date(iso));
}

function parseBoolFlag(...values: unknown[]): boolean | null {
  for (const raw of values) {
    if (typeof raw === "boolean") return raw;
    if (typeof raw === "string") {
      const v = raw.trim().toLowerCase();
      if (v === "true" || v === "1" || v === "yes") return true;
      if (v === "false" || v === "0" || v === "no") return false;
    }
  }
  return null;
}

function parseCollabFlag(raw: ManualLiveInput): boolean | null {
  return parseBoolFlag(raw.collab, raw.isCollab);
}

function parseOwnFlag(raw: ManualLiveInput): boolean | null {
  return parseBoolFlag(raw.own, raw.isOwn, raw.is_own_channel);
}

function parseMemberFlag(raw: ManualLiveInput): boolean {
  return parseBoolFlag(raw.member, raw.isMember, raw.is_member) ?? false;
}

function youtubeLinkFromItem(raw: ManualLiveInput): string {
  for (const key of ["url", "youtubeUrl", "link"] as const) {
    const v = raw[key];
    if (typeof v === "string" && v.trim()) return v.trim();
  }
  return "";
}

function resolveVideoId(input: string): string | null {
  const trimmed = input.trim();
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  return getYoutubeVideoId(trimmed);
}

async function parseBody(request: Request): Promise<ManualLiveInput[]> {
  const ctype = request.headers.get("content-type") ?? "";
  if (ctype.includes("multipart/form-data")) {
    const form = await request.formData();
    const rawItems = form.get("items");
    if (typeof rawItems !== "string") {
      throw new Error("multipart ต้องมี field items เป็น JSON string");
    }
    const parsed = JSON.parse(rawItems) as unknown;
    const items = Array.isArray(parsed)
      ? (parsed as ManualLiveInput[])
      : parsed &&
          typeof parsed === "object" &&
          Array.isArray((parsed as { items?: unknown }).items)
        ? ((parsed as { items: ManualLiveInput[] }).items ?? [])
        : null;
    if (!items) throw new Error("items ไม่ถูกต้อง");
    return items;
  }

  const body = (await request.json()) as unknown;
  const items = Array.isArray(body)
    ? (body as ManualLiveInput[])
    : body &&
        typeof body === "object" &&
        Array.isArray((body as { items?: unknown }).items)
      ? ((body as { items: ManualLiveInput[] }).items ?? [])
      : null;
  if (!items) throw new Error("ส่ง array ของไลฟ์ หรือ { items: [...] }");
  return items;
}

async function fetchYoutubeVideos(
  ids: string[]
): Promise<Map<string, YtVideoPayload>> {
  const map = new Map<string, YtVideoPayload>();
  const key = process.env.YOUTUBE_API_KEY?.trim();
  if (!key) {
    throw new Error("Missing YOUTUBE_API_KEY");
  }
  const unique = [...new Set(ids.filter(Boolean))];
  for (let i = 0; i < unique.length; i += 50) {
    const chunk = unique.slice(i, i + 50);
    const url =
      `https://www.googleapis.com/youtube/v3/videos` +
      `?part=snippet,status,contentDetails,liveStreamingDetails,statistics` +
      `&id=${chunk.join(",")}&key=${key}`;
    const res = await fetch(url);
    const data = (await res.json()) as {
      error?: { message?: string };
      items?: Array<Record<string, unknown>>;
    };
    if (!res.ok || data.error) {
      throw new Error(data.error?.message || `YouTube API HTTP ${res.status}`);
    }
    for (const item of data.items ?? []) {
      const id = String(item.id ?? "");
      const snippet = (item.snippet ?? {}) as Record<string, unknown>;
      const status = (item.status ?? {}) as Record<string, unknown>;
      const live = (item.liveStreamingDetails ?? {}) as Record<string, unknown>;
      const stats = (item.statistics ?? {}) as Record<string, unknown>;
      const thumbs = (snippet.thumbnails ?? {}) as Record<
        string,
        { url?: string } | undefined
      >;
      const thumbnailUrl =
        thumbs.maxres?.url ||
        thumbs.standard?.url ||
        thumbs.high?.url ||
        thumbs.medium?.url ||
        thumbs.default?.url ||
        null;
      const viewCount = stats.viewCount
        ? parseInt(String(stats.viewCount), 10)
        : 0;
      map.set(id, {
        id,
        title: String(snippet.title ?? ""),
        channelId: String(snippet.channelId ?? ""),
        channelTitle: String(snippet.channelTitle ?? ""),
        description: String(snippet.description ?? ""),
        thumbnailUrl,
        tags: Array.isArray(snippet.tags)
          ? snippet.tags.map(String)
          : [],
        scheduledStart:
          typeof live.scheduledStartTime === "string"
            ? live.scheduledStartTime
            : null,
        actualStart:
          typeof live.actualStartTime === "string" ? live.actualStartTime : null,
        actualEnd:
          typeof live.actualEndTime === "string" ? live.actualEndTime : null,
        viewCount: Number.isFinite(viewCount) ? viewCount : 0,
        likeCount:
          stats.likeCount != null ? String(stats.likeCount) : null,
        privacyStatus:
          typeof status.privacyStatus === "string"
            ? status.privacyStatus
            : null,
        liveBroadcastContent:
          typeof snippet.liveBroadcastContent === "string"
            ? snippet.liveBroadcastContent
            : null,
      });
    }
  }
  return map;
}

export async function POST(request: Request) {
  let items: ManualLiveInput[];
  try {
    items = await parseBody(request);
  } catch (err) {
    const message = err instanceof Error ? err.message : "Invalid body";
    return NextResponse.json({ error: message }, { status: 400 });
  }

  if (!items || items.length === 0) {
    return NextResponse.json(
      { error: "ส่ง array ของไลฟ์ หรือ { items: [...] }" },
      { status: 400 }
    );
  }

  if (items.length > 50) {
    return NextResponse.json(
      { error: "สูงสุด 50 รายการต่อครั้ง" },
      { status: 400 }
    );
  }

  const memberVideoIds: string[] = [];
  for (let i = 0; i < items.length; i++) {
    if (!parseMemberFlag(items[i])) continue;
    const link = youtubeLinkFromItem(items[i]);
    const id = resolveVideoId(link);
    if (id) memberVideoIds.push(id);
  }

  let ytById = new Map<string, YtVideoPayload>();
  if (memberVideoIds.length > 0) {
    try {
      ytById = await fetchYoutubeVideos(memberVideoIds);
    } catch (err) {
      const message = err instanceof Error ? err.message : String(err);
      return NextResponse.json(
        { error: `ดึง YouTube ไม่สำเร็จ: ${message}` },
        { status: 502 }
      );
    }
  }

  const rows: BuiltRow[] = [];
  const errors: string[] = [];
  const touchedDates = new Set<string>();

  for (let i = 0; i < items.length; i++) {
    const raw = items[i] as ManualLiveInput;
    const is_member = parseMemberFlag(raw);
    const collabFlag = parseCollabFlag(raw);
    const ownFlag = parseOwnFlag(raw);

    if (is_member) {
      const link = youtubeLinkFromItem(raw);
      const videoId = resolveVideoId(link);
      if (!videoId) {
        errors.push(`[${i}] Member ต้องใส่ลิงก์ YouTube ที่ถูกต้อง`);
        continue;
      }
      const yt = ytById.get(videoId);
      if (!yt) {
        errors.push(`[${i}] YouTube ไม่พบวิดีโอ ${videoId}`);
        continue;
      }

      const auto = classifyLiveOwnership(yt.channelId, yt.title);
      const is_own_channel = ownFlag != null ? ownFlag : auto.is_own_channel;
      const is_collab = collabFlag != null ? collabFlag : auto.is_collab;
      const scheduledRaw =
        yt.scheduledStart ?? yt.actualStart ?? new Date().toISOString();
      const scheduled = snapScheduledToHalfHour(scheduledRaw) ?? scheduledRaw;
      const scheduledFirst =
        snapScheduledToHalfHour(yt.scheduledStart ?? yt.actualStart) ??
        scheduled;
      const localDate = bangkokDateFromIso(scheduled);
      if (localDate) touchedDates.add(localDate);

      const sourceTitle = is_own_channel
        ? "Mild-R"
        : (getLuminaSourceTitle(yt.channelId) ??
          resolveLuminaChannel(yt.channelId)?.title ??
          null);

      rows.push({
        video_id: videoId,
        channel_id: yt.channelId || (is_own_channel ? MILD_R_CHANNEL_ID : null),
        channel_name: yt.channelTitle || null,
        source_title: sourceTitle,
        title: yt.title || "Untitled live",
        url: `https://www.youtube.com/watch?v=${videoId}`,
        scheduled_start: yt.scheduledStart
          ? (snapScheduledToHalfHour(yt.scheduledStart) ?? yt.scheduledStart)
          : yt.actualStart,
        scheduled_start_first: scheduledFirst,
        actual_start: yt.actualStart,
        actual_end: yt.actualEnd,
        thumbnail_url: yt.thumbnailUrl,
        thumbnail_cached_url: null,
        views_on_end: yt.actualEnd ? yt.viewCount || null : null,
        latest_views: yt.viewCount,
        is_own_channel,
        is_collab,
        project: "Lumina",
        metadata: {
          source: "manual_member_link",
          preview: false,
          member: true,
          linked_video_id: videoId,
          privacy_status: yt.privacyStatus,
          live_broadcast_content: yt.liveBroadcastContent,
          description: yt.description,
          tags: yt.tags,
          likes: yt.likeCount,
          local_date: localDate,
          timezone: "Asia/Bangkok",
          imported_from: link,
          scheduled_raw: yt.scheduledStart,
          scheduled_snapped:
            Boolean(yt.scheduledStart) &&
            snapScheduledToHalfHour(yt.scheduledStart) !== yt.scheduledStart,
        },
      });
      continue;
    }

    // ——— Non-member manual preview mock ———
    const title = typeof raw.title === "string" ? raw.title.trim() : "";
    const channelKey =
      typeof raw.channel === "string" && raw.channel.trim()
        ? raw.channel.trim()
        : typeof raw.channelId === "string"
          ? raw.channelId.trim()
          : "";
    const date = typeof raw.date === "string" ? raw.date.trim() : "";
    const time =
      typeof raw.time === "string" && raw.time.trim()
        ? raw.time.trim()
        : "20:00";

    if (!title) {
      errors.push(`[${i}] ต้องมี title`);
      continue;
    }
    if (ownFlag !== true && !channelKey) {
      errors.push(`[${i}] ถ้าไม่ใช่ช่องตัวเอง (own: false) ต้องใส่ channel`);
      continue;
    }

    const channel =
      ownFlag === true
        ? (resolveLuminaChannel("mild-r") ??
          resolveLuminaChannel(MILD_R_CHANNEL_ID))
        : resolveLuminaChannel(channelKey);

    if (!channel) {
      errors.push(
        `[${i}] channel ไม่รู้จัก (“${channelKey || "—"}”) — ใช้เช่น mild-r, dea, ashyra, xonebu หรือ own: true`
      );
      continue;
    }
    if (!isYmd(date)) {
      errors.push(`[${i}] date ต้องเป็น YYYY-MM-DD`);
      continue;
    }
    if (!isHm(time)) {
      errors.push(`[${i}] time ต้องเป็น HH:mm`);
      continue;
    }

    const scheduled = bangkokToIso(date, time);
    if (!scheduled) {
      errors.push(`[${i}] แปลงวันเวลาไม่สำเร็จ`);
      continue;
    }

    const auto = classifyLiveOwnership(channel.channelId, title);
    const is_own_channel = ownFlag != null ? ownFlag : auto.is_own_channel;
    const is_collab = collabFlag != null ? collabFlag : auto.is_collab;

    if (!is_own_channel && !channel.channelId) {
      errors.push(`[${i}] ช่องนี้ยังไม่มี channelId ใน roster`);
      continue;
    }

    const videoId = `manual-${crypto.randomUUID()}`;
    touchedDates.add(date);

    rows.push({
      video_id: videoId,
      channel_id: is_own_channel ? MILD_R_CHANNEL_ID : channel.channelId,
      channel_name: is_own_channel
        ? (resolveLuminaChannel("mild-r")?.channelTitle ?? channel.channelTitle)
        : channel.channelTitle,
      source_title: is_own_channel ? "Mild-R" : channel.title,
      title,
      url: null,
      scheduled_start: scheduled,
      scheduled_start_first: scheduled,
      actual_start: null,
      actual_end: null,
      thumbnail_url: null,
      thumbnail_cached_url: null,
      views_on_end: null,
      latest_views: 0,
      is_own_channel,
      is_collab,
      project: "Lumina",
      metadata: {
        source: "manual_preview",
        preview: true,
        linked_video_id: null,
        member: false,
        local_date: date,
        local_time: time,
        timezone: "Asia/Bangkok",
        channel_key: channelKey || "mild-r",
        collab_override: collabFlag,
        own_override: ownFlag,
      },
    });
  }

  if (rows.length === 0) {
    return NextResponse.json(
      { error: "ไม่มีรายการที่ถูกต้อง", details: errors },
      { status: 400 }
    );
  }

  try {
    const supabase = createAdminClient();

    const { data: existingPreviewRows, error: existingError } = await supabase
      .from("mild_r_live_streams")
      .select(
        "video_id, channel_id, is_own_channel, scheduled_start, scheduled_start_first, actual_start, metadata"
      )
      .or("video_id.like.manual-%,metadata->>preview.eq.true");

    if (existingError) {
      console.error("[manual-live] lookup", existingError.message);
      return NextResponse.json(
        { error: existingError.message, details: errors },
        { status: 500 }
      );
    }

    const existingPreviews = (existingPreviewRows ?? []) as PreviewLikeRow[];
    const replaceByDateIds = existingPreviews
      .filter((row) => {
        if (!isUnlinkedPreview(row)) return false;
        const d = previewLocalDate(row);
        return Boolean(d && touchedDates.has(d));
      })
      .map((row) => row.video_id);

    // Real member imports replace matching mocks (date+channel+±3h)
    const matchDeleteIds = collectPreviewIdsToDelete(
      rows.filter((r) => !String(r.video_id).startsWith("manual-")),
      existingPreviews
    );

    const replaceIds = [...new Set([...replaceByDateIds, ...matchDeleteIds])];

    if (replaceIds.length > 0) {
      const { error: delError } = await supabase
        .from("mild_r_live_streams")
        .delete()
        .in("video_id", replaceIds);
      if (delError) {
        console.error("[manual-live] replace delete", delError.message);
        return NextResponse.json(
          { error: delError.message, details: errors },
          { status: 500 }
        );
      }
    }

    // Preserve first-seen locks for non-member real upserts only
    const realIds = rows
      .filter(
        (r) =>
          !r.video_id.startsWith("manual-") &&
          r.metadata?.source !== "manual_member_link"
      )
      .map((r) => r.video_id);
    const existingById = new Map<
      string,
      {
        views_on_end: number | null;
        scheduled_start: string | null;
        scheduled_start_first: string | null;
        actual_start: string | null;
      }
    >();
    if (realIds.length > 0) {
      const { data: existingReals } = await supabase
        .from("mild_r_live_streams")
        .select(
          "video_id, views_on_end, scheduled_start, scheduled_start_first, actual_start"
        )
        .in("video_id", realIds);
      for (const row of existingReals ?? []) {
        existingById.set(row.video_id as string, {
          views_on_end: (row.views_on_end as number | null) ?? null,
          scheduled_start: (row.scheduled_start as string | null) ?? null,
          scheduled_start_first:
            (row.scheduled_start_first as string | null) ?? null,
          actual_start: (row.actual_start as string | null) ?? null,
        });
      }
    }

    // Member link re-import: overwrite the video_id row with fresh YouTube data.
    // (Do not freeze scheduled_* / views from a previous sync.)
    const toInsert = rows.map((row) => {
      if (row.video_id.startsWith("manual-")) return row;
      if (row.metadata?.source === "manual_member_link") return row;
      const existing = existingById.get(row.video_id);
      const started =
        existing?.actual_start != null || row.actual_start != null;
      return {
        ...row,
        views_on_end: existing?.views_on_end ?? row.views_on_end,
        scheduled_start_first:
          existing?.scheduled_start_first ??
          row.scheduled_start ??
          row.scheduled_start_first,
        scheduled_start: started
          ? (existing?.scheduled_start ?? row.scheduled_start)
          : row.scheduled_start,
      };
    });

    // Skip mock insert if a real live already covers that slot
    const { data: allReals } = await supabase
      .from("mild_r_live_streams")
      .select(
        "video_id, channel_id, is_own_channel, scheduled_start, scheduled_start_first, actual_start, metadata"
      )
      .not("video_id", "like", "manual-%");

    const skipMockIds = new Set(
      collectPreviewIdsToDelete(
        (allReals ?? []) as PreviewLikeRow[],
        toInsert.filter((r) =>
          String(r.video_id).startsWith("manual-")
        ) as PreviewLikeRow[]
      )
    );

    // Don't skip a row we're about to upsert as a real video in this batch
    for (const row of toInsert) {
      if (!String(row.video_id).startsWith("manual-")) {
        skipMockIds.delete(row.video_id);
      }
    }

    const finalInsert = toInsert.filter(
      (row) => !skipMockIds.has(row.video_id)
    );
    const skippedMatchedReal = toInsert.length - finalInsert.length;

    if (finalInsert.length > 0) {
      const { error } = await supabase
        .from("mild_r_live_streams")
        .upsert(finalInsert, { onConflict: "video_id" });

      if (error) {
        console.error("[manual-live]", error.message);
        return NextResponse.json(
          { error: error.message, details: errors },
          { status: 500 }
        );
      }
    }

    return NextResponse.json({
      ok: true,
      saved: finalInsert.length,
      replaced: replaceIds.length,
      skippedMatchedReal,
      memberImported: finalInsert.filter(
        (r) => r.metadata?.member === true && r.metadata?.preview === false
      ).length,
      touchedDates: [...touchedDates],
      skippedErrors: errors,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
