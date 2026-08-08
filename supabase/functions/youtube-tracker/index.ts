import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

import {
  LUMINA_RELATED_CHANNEL_IDS,
  MAIN_CHANNEL_ID,
  getLuminaSourceTitle,
} from "./lumina-master.ts";
import { collectPreviewIdsToDelete, type PreviewLikeRow } from "./preview-match.ts";

const YOUTUBE_API_KEY = Deno.env.get("YOUTUBE_API_KEY") || "";
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY =
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const SEARCH_KEYWORD = "@MildRWorldEnd";
const COLLAB_TITLE_RE =
  /\bft\.?\b|\bfeat\.?\b|featuring|collab|コラボ|คอลาบ|ร่วมกับ/i;
const MILD_MENTION_RE = /@?MildRWorldEnd|Mild-?R\b|MildR\b/i;

function classifyLiveOwnership(channelId: string, title: string) {
  const is_own_channel = channelId === MAIN_CHANNEL_ID;
  const is_collab = !is_own_channel || COLLAB_TITLE_RE.test(title);
  return { is_own_channel, is_collab };
}

function mentionsMildR(title: string) {
  return MILD_MENTION_RE.test(title);
}

type StreamRow = {
  video_id: string;
  channel_id: string;
  channel_name: string;
  source_title: string | null;
  title: string;
  url: string;
  scheduled_start: string | null;
  scheduled_start_first: string | null;
  actual_start: string | null;
  actual_end: string | null;
  thumbnail_url: string | null;
  views_on_end: number | null;
  latest_views: number;
  is_own_channel: boolean;
  is_collab: boolean;
  metadata: Record<string, unknown>;
};

async function saveToDatabase(streams: StreamRow[]) {
  if (streams.length === 0) return;

  const videoIds = streams.map((s) => s.video_id);
  const existingById = new Map<
    string,
    {
      views_on_end: number | null;
      scheduled_start: string | null;
      scheduled_start_first: string | null;
      actual_start: string | null;
    }
  >();

  for (let i = 0; i < videoIds.length; i += 200) {
    const chunk = videoIds.slice(i, i + 200);
    const { data, error: lookupError } = await supabase
      .from("mild_r_live_streams")
      .select(
        "video_id, views_on_end, scheduled_start, scheduled_start_first, actual_start"
      )
      .in("video_id", chunk);

    if (lookupError) {
      console.error("❌ lookup existing streams:", lookupError.message);
      throw lookupError;
    }

    for (const row of data || []) {
      existingById.set(row.video_id as string, {
        views_on_end: (row.views_on_end as number | null) ?? null,
        scheduled_start: (row.scheduled_start as string | null) ?? null,
        scheduled_start_first:
          (row.scheduled_start_first as string | null) ?? null,
        actual_start: (row.actual_start as string | null) ?? null,
      });
    }
  }

  // - views_on_end / scheduled_start_first: first-seen lock
  // - scheduled_start: refresh while not started; freeze once actual_start exists
  const merged = streams.map((row) => {
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

  const { error } = await supabase
    .from("mild_r_live_streams")
    .upsert(merged, { onConflict: "video_id" });

  if (error) {
    console.error("❌ Database Error:", error.message);
    throw error;
  }

  console.log(`💾 บันทึกสำเร็จ: ${merged.length} รายการ`);
  await removeMatchingPreviews(merged);
  await archiveThumbnails(merged);
}

/** When a real live matches a manual mock, keep the real row and delete the mock. */
async function removeMatchingPreviews(reals: StreamRow[]) {
  const realOnly = reals.filter((r) => !r.video_id.startsWith("manual-"));
  if (realOnly.length === 0) return;

  const { data, error } = await supabase
    .from("mild_r_live_streams")
    .select(
      "video_id, channel_id, is_own_channel, scheduled_start, scheduled_start_first, actual_start, metadata"
    )
    .or("video_id.like.manual-%,metadata->>preview.eq.true");

  if (error) {
    console.error("❌ preview lookup:", error.message);
    return;
  }

  const mocks = (data || []) as PreviewLikeRow[];
  const toDelete = collectPreviewIdsToDelete(realOnly, mocks);
  if (toDelete.length === 0) return;

  const { error: delError } = await supabase
    .from("mild_r_live_streams")
    .delete()
    .in("video_id", toDelete);

  if (delError) {
    console.error("❌ preview delete:", delError.message);
    return;
  }

  console.log(
    `🧹 ลบ mock ที่จับคู่ไลฟ์จริงแล้ว: ${toDelete.length} รายการ (${toDelete.join(", ")})`
  );
}

const CANCEL_AFTER_MS = 3 * 60 * 60 * 1000;
const BUCKET = "live-thumbs";

function normalizeThumbSource(url: string | null | undefined) {
  if (!url) return "";
  try {
    const u = new URL(url);
    return `${u.origin}${u.pathname}`;
  } catch {
    return url;
  }
}

function isThumbLocked(row: StreamRow) {
  if (row.actual_end) return true;
  if (row.actual_start) return false;
  const scheduled = row.scheduled_start ?? row.scheduled_start_first;
  if (!scheduled) return false;
  const start = new Date(scheduled).getTime();
  if (!Number.isFinite(start)) return false;
  return Date.now() - start >= CANCEL_AFTER_MS;
}

/** Archive every cover version while upcoming/live; freeze after ended/cancelled. */
async function archiveThumbnails(streams: StreamRow[]) {
  for (const row of streams) {
    const sourceUrl = row.thumbnail_url;
    if (!sourceUrl) continue;

    try {
      const { data: current, error: curErr } = await supabase
        .from("mild_r_live_stream_thumbnails")
        .select("id, source_url")
        .eq("video_id", row.video_id)
        .eq("is_current", true)
        .maybeSingle();

      if (curErr) {
        console.error("thumb current lookup:", curErr.message);
        continue;
      }

      const locked = isThumbLocked(row);
      if (locked && current) continue;

      if (
        current &&
        normalizeThumbSource(current.source_url as string | null) ===
          normalizeThumbSource(sourceUrl)
      ) {
        continue;
      }

      const imgRes = await fetch(sourceUrl);
      if (!imgRes.ok) {
        console.error(
          `thumb fetch ${row.video_id}: HTTP ${imgRes.status}`
        );
        continue;
      }
      const contentType =
        imgRes.headers.get("content-type")?.split(";")[0] || "image/jpeg";
      const ext = contentType.includes("png")
        ? "png"
        : contentType.includes("webp")
          ? "webp"
          : "jpg";
      const bytes = new Uint8Array(await imgRes.arrayBuffer());
      const path = `${row.video_id}/${Date.now()}.${ext}`;

      const { error: upErr } = await supabase.storage
        .from(BUCKET)
        .upload(path, bytes, {
          contentType,
          upsert: false,
          cacheControl: "31536000",
        });

      if (upErr) {
        console.error(`thumb upload ${row.video_id}:`, upErr.message);
        continue;
      }

      const { data: pub } = supabase.storage.from(BUCKET).getPublicUrl(path);
      const publicUrl = pub.publicUrl;

      if (current?.id) {
        await supabase
          .from("mild_r_live_stream_thumbnails")
          .update({ is_current: false })
          .eq("id", current.id);
      }

      const { error: insErr } = await supabase
        .from("mild_r_live_stream_thumbnails")
        .insert({
          video_id: row.video_id,
          storage_path: path,
          public_url: publicUrl,
          source_url: sourceUrl,
          is_current: true,
        });

      if (insErr) {
        console.error(`thumb insert ${row.video_id}:`, insErr.message);
        continue;
      }

      await supabase
        .from("mild_r_live_streams")
        .update({ thumbnail_cached_url: publicUrl })
        .eq("video_id", row.video_id);
    } catch (err) {
      console.error(
        `thumb archive ${row.video_id}:`,
        err instanceof Error ? err.message : err
      );
    }
  }
}

async function getLiveDetails(videoIds: string[]): Promise<StreamRow[]> {
  if (videoIds.length === 0) return [];

  const liveStreams: StreamRow[] = [];

  for (let i = 0; i < videoIds.length; i += 50) {
    const chunk = videoIds.slice(i, i + 50);
    const idsParam = chunk.join(",");
    const url =
      `https://www.googleapis.com/youtube/v3/videos?part=snippet,liveStreamingDetails,statistics&id=${idsParam}&key=${YOUTUBE_API_KEY}`;

    const res = await fetch(url);
    const data = await res.json();

    if (data.error) {
      throw new Error(data.error.message || "YouTube videos.list failed");
    }

    for (const item of data.items || []) {
      if (!item.liveStreamingDetails) continue;

      const viewCount = item.statistics?.viewCount
        ? parseInt(item.statistics.viewCount, 10)
        : 0;
      const channelId = item.snippet.channelId as string;
      const title = item.snippet.title as string;
      const { is_own_channel, is_collab } = classifyLiveOwnership(
        channelId,
        title
      );

      liveStreams.push({
        video_id: item.id,
        channel_id: channelId,
        channel_name: item.snippet.channelTitle,
        source_title: getLuminaSourceTitle(channelId),
        title,
        url: `https://www.youtube.com/watch?v=${item.id}`,
        scheduled_start: item.liveStreamingDetails.scheduledStartTime || null,
        scheduled_start_first:
          item.liveStreamingDetails.scheduledStartTime || null,
        actual_start: item.liveStreamingDetails.actualStartTime || null,
        actual_end: item.liveStreamingDetails.actualEndTime || null,
        thumbnail_url: item.snippet.thumbnails?.high?.url || null,
        views_on_end: item.liveStreamingDetails.actualEndTime
          ? viewCount
          : null,
        latest_views: viewCount,
        is_own_channel,
        is_collab,
        metadata: {
          description: item.snippet.description,
          tags: item.snippet.tags || [],
          likes: item.statistics?.likeCount || "0",
        },
      });
    }
  }

  return liveStreams;
}

/** Step 1: main uploads playlist (low quota) */
async function checkMainChannel() {
  console.log("▶️ [Step 1] กำลังตรวจสอบช่องหลัก...");
  const playlistId = MAIN_CHANNEL_ID.replace(/^UC/, "UU");
  const url =
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=15&key=${YOUTUBE_API_KEY}`;

  const res = await fetch(url);
  const data = await res.json();

  if (data.error) {
    throw new Error(data.error.message || "YouTube playlistItems failed");
  }

  if (!data.items || data.items.length === 0) return { saved: 0 };

  const videoIds = data.items.map(
    (item: { snippet: { resourceId: { videoId: string } } }) =>
      item.snippet.resourceId.videoId
  );
  const results = await getLiveDetails(videoIds);
  await saveToDatabase(results);
  return { saved: results.length };
}

async function searchByEventType(
  eventType: "upcoming" | "live" | "completed",
  options?: { publishedAfter?: string; order?: string }
) {
  const params = new URLSearchParams({
    part: "snippet",
    q: SEARCH_KEYWORD,
    eventType,
    type: "video",
    maxResults: "25",
    key: YOUTUBE_API_KEY,
  });
  if (options?.publishedAfter) {
    params.set("publishedAfter", options.publishedAfter);
  }
  if (options?.order) {
    params.set("order", options.order);
  }

  const res = await fetch(
    `https://www.googleapis.com/youtube/v3/search?${params.toString()}`
  );
  const data = await res.json();

  if (data.error) {
    throw new Error(data.error.message || `YouTube search (${eventType}) failed`);
  }

  return data;
}

async function fetchPlaylistVideoIds(channelId: string, maxResults = 8) {
  const playlistId = channelId.replace(/^UC/, "UU");
  const url =
    `https://www.googleapis.com/youtube/v3/playlistItems?part=snippet&playlistId=${playlistId}&maxResults=${maxResults}&key=${YOUTUBE_API_KEY}`;
  const res = await fetch(url);
  const data = await res.json();
  if (data.error) {
    console.error(`playlist ${channelId}:`, data.error.message);
    return [] as string[];
  }
  return (data.items || []).map(
    (item: { snippet: { resourceId: { videoId: string } } }) =>
      item.snippet.resourceId.videoId
  ) as string[];
}

/**
 * Master Lumina related IDs + any outside-agency hosts already in DB
 * (Search API often lags on ft. tags; playlist poll is the reliable path).
 */
async function loadGuestChannelIds(): Promise<string[]> {
  const ids = new Set<string>(LUMINA_RELATED_CHANNEL_IDS);

  const { data, error } = await supabase
    .from("mild_r_live_streams")
    .select("channel_id")
    .eq("is_own_channel", false)
    .not("channel_id", "is", null)
    .limit(100);

  if (error) {
    console.error("guest channel lookup:", error.message);
  } else {
    for (const row of data || []) {
      if (row.channel_id) ids.add(row.channel_id as string);
    }
  }

  ids.delete(MAIN_CHANNEL_ID);
  return [...ids];
}

/** Poll recent uploads on Lumina master list (+ learned guests). */
async function checkGuestChannelPlaylists() {
  console.log(
    `▶️ [Step 2b] กำลังเช็ค playlist จาก master Lumina (${LUMINA_RELATED_CHANNEL_IDS.length} ช่อง)...`
  );
  const channelIds = await loadGuestChannelIds();
  const videoIds: string[] = [];

  for (const channelId of channelIds) {
    const ids = await fetchPlaylistVideoIds(channelId, 8);
    videoIds.push(...ids);
  }

  const unique = [...new Set(videoIds)];
  const details = await getLiveDetails(unique);
  const guestCollabs = details.filter(
    (row) => !row.is_own_channel && mentionsMildR(row.title)
  );
  await saveToDatabase(guestCollabs);
  return {
    channels: channelIds.length,
    master: LUMINA_RELATED_CHANNEL_IDS.length,
    scanned: unique.length,
    saved: guestCollabs.length,
  };
}

/** Step 2: keyword search upcoming + live + recent completed + recent mentions */
async function searchRelatedChannels() {
  console.log("▶️ [Step 2] กำลังค้นหาช่องอื่นๆ...");

  const publishedAfter = new Date(
    Date.now() - 21 * 24 * 60 * 60 * 1000
  ).toISOString();

  const [upcoming, live, completed, mentions] = await Promise.all([
    searchByEventType("upcoming"),
    searchByEventType("live"),
    searchByEventType("completed", {
      publishedAfter,
      order: "date",
    }),
    (async () => {
      const params = new URLSearchParams({
        part: "snippet",
        q: SEARCH_KEYWORD,
        type: "video",
        maxResults: "25",
        order: "date",
        publishedAfter,
        key: YOUTUBE_API_KEY,
      });
      const res = await fetch(
        `https://www.googleapis.com/youtube/v3/search?${params.toString()}`
      );
      const data = await res.json();
      if (data.error) {
        throw new Error(
          data.error.message || "YouTube search (mentions) failed"
        );
      }
      return data;
    })(),
  ]);

  // Sequential after search — avoids huge parallel playlist fan-out timeouts
  const playlistScan = await checkGuestChannelPlaylists();
  const items = [
    ...(upcoming.items || []),
    ...(live.items || []),
    ...(completed.items || []),
    ...(mentions.items || []),
  ];

  let searchSaved = 0;
  if (items.length > 0) {
    const videoIds = [
      ...new Set(
        items
          .map((item: { id?: { videoId?: string } }) => item.id?.videoId)
          .filter(Boolean) as string[]
      ),
    ];
    const results = await getLiveDetails(videoIds);
    await saveToDatabase(results);
    searchSaved = results.length;
  }

  const saved = searchSaved + playlistScan.saved;
  const skipped = saved === 0;
  if (skipped) {
    console.log("⏭️ [Step 2] ข้ามการทำงาน: ไม่พบไลฟ์ที่เกี่ยวข้องจากช่องอื่น");
  }

  return {
    saved,
    skipped,
    searchSaved,
    playlistSaved: playlistScan.saved,
    playlistChannels: playlistScan.channels,
    upcoming: upcoming.items?.length ?? 0,
    live: live.items?.length ?? 0,
    completed: completed.items?.length ?? 0,
    mentions: mentions.items?.length ?? 0,
  };
}

async function writeSyncLog(entry: {
  source: string;
  status: "success" | "error" | "skipped";
  message?: string;
  saved_count?: number;
  meta?: Record<string, unknown>;
}) {
  const { error } = await supabase.from("mild_r_sync_logs").insert({
    source: entry.source,
    status: entry.status,
    message: entry.message ?? null,
    saved_count: entry.saved_count ?? 0,
    meta: entry.meta ?? null,
  });
  if (error) {
    console.error("❌ Sync log Error:", error.message);
  }
}

Deno.serve(async (req) => {
  try {
    if (!YOUTUBE_API_KEY || !SUPABASE_URL || !SUPABASE_SERVICE_ROLE_KEY) {
      return new Response(
        JSON.stringify({ error: "Missing Edge Function secrets" }),
        { status: 500, headers: { "Content-Type": "application/json" } }
      );
    }

    const { action } = await req.json().catch(() => ({}));

    if (action === "main") {
      const result = await checkMainChannel();
      await writeSyncLog({
        source: "edge-main",
        status: "success",
        message: `Main channel check saved ${result.saved} streams`,
        saved_count: result.saved,
        meta: result,
      });
      return new Response(
        JSON.stringify({ success: true, task: "main", ...result }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    if (action === "search") {
      const result = await searchRelatedChannels();
      await writeSyncLog({
        source: "edge-search",
        status: result.skipped ? "skipped" : "success",
        message: result.skipped
          ? "No related live/upcoming/completed streams"
          : `Related search saved ${result.saved} streams`,
        saved_count: result.saved,
        meta: result,
      });
      return new Response(
        JSON.stringify({ success: true, task: "search", ...result }),
        { headers: { "Content-Type": "application/json" } }
      );
    }

    await writeSyncLog({
      source: "edge-unknown",
      status: "error",
      message: 'Invalid action. Use "main" or "search".',
    });

    return new Response(
      JSON.stringify({ error: 'Invalid action. Use "main" or "search".' }),
      { status: 400, headers: { "Content-Type": "application/json" } }
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    console.error(message);
    await writeSyncLog({
      source: "edge-error",
      status: "error",
      message,
    });
    return new Response(JSON.stringify({ error: message }), {
      status: 500,
      headers: { "Content-Type": "application/json" },
    });
  }
});
