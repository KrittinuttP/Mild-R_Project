/**
 * Moments gallery · photos from Mild-R's own X posts (server only).
 *
 * Reads public.mild_r_x_posts, which the `x-feed-sync` Edge Function fills every
 * day, so new photos reach Moments without any manual step.
 * Kept: post_type "tweet" (no reposts, no quotes), not a Live Schedule poster,
 * not a live cover (already in Live covers, or shaped like one: a YouTube link
 * plus a 16:9 photo of any width; x-feed-sync also needs ≥1280px and keeps only
 * the earliest post per live, so smaller or repeat covers slip past that table),
 * not hidden in /admin/x-gallery,
 * photos only (video thumbnails sit under other pbs paths and are skipped).
 * `gallery_hidden` comes from migration 20261117120000_x_posts_gallery_hidden.sql;
 * before it runs, everything loads and hiding is simply unavailable.
 */
import { createAdminClient } from "@/lib/supabase/admin";
import { isSupabaseConfigured } from "@/lib/supabase/env";
import { createPublicClient } from "@/lib/supabase/public";
import type { GalleryItem, GalleryTileSize } from "@/types/vtuber";

const POST_LIMIT = 500;
const X_CREDIT = "Mild-R · X (@MildRWorldEnd)";
const PHOTO_RE = /^https:\/\/pbs\.twimg\.com\/media\//;
const BASE_COLS = "tweet_id, posted_at, original_url, text, media_urls, raw";
// Live cover shape, from supabase/functions/x-feed-sync/index.ts minus its 1280px floor.
const YOUTUBE_RE =
  /(?:youtu\.be\/|youtube\.com\/(?:watch\?(?:[^"\s]*?&)?v=|live\/|shorts\/))[A-Za-z0-9_-]{11}/;
const LIVE_COVER_RATIO = 16 / 9;
const LIVE_COVER_RATIO_TOLERANCE = 0.03;

type Client = ReturnType<typeof createPublicClient>;

type PostRow = {
  tweet_id: string;
  posted_at: string | null;
  original_url: string | null;
  text: string | null;
  media_urls: string[] | null;
  raw: Record<string, unknown> | null;
  gallery_hidden?: boolean | null;
};

export type XGalleryPhoto = {
  /** Unique per photo: `x-<tweet id>-<n>`. */
  id: string;
  src: string;
  thumb: string;
  width?: number;
  height?: number;
};

export type XGalleryPost = {
  tweetId: string;
  postedAt: string | null;
  postUrl: string;
  text: string;
  hidden: boolean;
  photos: XGalleryPhoto[];
};

/** pbs.twimg.com size variant: `small` for tiles, `large` for the lightbox. */
function sized(url: string, name: "small" | "large") {
  const clean = url.split("?")[0];
  return `${clean}?name=${name}`;
}

/** width/height per photo URL from the stored API tweet (original_info). */
function sizesFromRaw(raw: Record<string, unknown> | null) {
  const sizes = new Map<string, { width: number; height: number }>();
  if (!raw) return sizes;
  const pick = (value: unknown) => (Array.isArray(value) ? value : []);
  const ext = raw.extendedEntities as Record<string, unknown> | undefined;
  const ent = raw.entities as Record<string, unknown> | undefined;
  for (const item of [...pick(ext?.media), ...pick(ent?.media), ...pick(raw.media)]) {
    if (!item || typeof item !== "object") continue;
    const m = item as Record<string, unknown>;
    const url = typeof m.media_url_https === "string" ? m.media_url_https : null;
    const info = m.original_info as { width?: unknown; height?: unknown } | undefined;
    const width = typeof info?.width === "number" ? info.width : 0;
    const height = typeof info?.height === "number" ? info.height : 0;
    if (url && width > 0 && height > 0 && !sizes.has(url)) sizes.set(url, { width, height });
  }
  return sizes;
}

/** True when the post links a YouTube video (entities, card or text). */
function hasYoutubeLink(row: PostRow) {
  const raw = row.raw;
  const haystack = JSON.stringify([raw?.entities, raw?.card, raw?.text, row.text]);
  return YOUTUBE_RE.test(haystack);
}

/** A 16:9 photo: what Mild-R posts as a live cover (some are only 1200x675). */
function isCoverShaped(size?: { width: number; height: number }) {
  if (!size || size.width <= 0 || size.height <= 0) return false;
  const ratio = size.width / size.height;
  return Math.abs(ratio - LIVE_COVER_RATIO) / LIVE_COVER_RATIO <= LIVE_COVER_RATIO_TOLERANCE;
}

function postUrlOf(row: PostRow) {
  return row.original_url?.trim() || `https://x.com/MildRWorldEnd/status/${row.tweet_id}`;
}

/** First line of the post without links, for alt text / admin lists. */
function shortText(text: string | null) {
  const line = (text ?? "")
    .replace(/https?:\/\/\S+/g, "")
    .split("\n")
    .map((s) => s.trim())
    .find(Boolean);
  if (!line) return "";
  return line.length > 90 ? `${line.slice(0, 89)}…` : line;
}

function toPost(row: PostRow, coverSources: Set<string>): XGalleryPost | null {
  const sizes = sizesFromRaw(row.raw);
  const youtube = hasYoutubeLink(row);
  const sizeOf = (url: string) => sizes.get(url.split("?")[0]) ?? sizes.get(url);
  const urls = (row.media_urls ?? []).filter(
    (u) =>
      PHOTO_RE.test(u) &&
      !coverSources.has(u.split("?")[0]) &&
      !(youtube && isCoverShaped(sizeOf(u)))
  );
  if (urls.length === 0) return null;
  return {
    tweetId: row.tweet_id,
    postedAt: row.posted_at,
    postUrl: postUrlOf(row),
    text: shortText(row.text),
    hidden: row.gallery_hidden === true,
    photos: urls.map((url, i) => {
      const size = sizeOf(url);
      return {
        id: `x-${row.tweet_id}-${i + 1}`,
        src: sized(url, "large"),
        thumb: sized(url, "small"),
        width: size?.width,
        height: size?.height,
      };
    }),
  };
}

function isMissingHiddenColumn(error: { message?: string; code?: string } | null) {
  return Boolean(error && (error.code === "42703" || error.message?.includes("gallery_hidden")));
}

/** Tweet ids and photo URLs already shown as live covers (Live covers tab). */
async function liveCovers(supabase: Client) {
  const { data, error } = await supabase
    .from("mild_r_live_stream_x_covers")
    .select("tweet_id, source_url")
    .limit(2000);
  if (error) {
    console.error("[x_gallery] live covers", error.message);
    return { tweetIds: new Set<string>(), sources: new Set<string>() };
  }
  const rows = (data ?? []) as { tweet_id: string; source_url: string | null }[];
  return {
    tweetIds: new Set(rows.map((r) => String(r.tweet_id))),
    sources: new Set(rows.flatMap((r) => (r.source_url ? [r.source_url.split("?")[0]] : []))),
  };
}

/**
 * Posts with photos, newest first. `includeHidden` is for the admin screen.
 * `hideSupported` is false until the migration adds `gallery_hidden`.
 */
async function loadPosts(supabase: Client, includeHidden: boolean) {
  const query = (cols: string, withHiddenFilter: boolean) => {
    let q = supabase
      .from("mild_r_x_posts")
      .select(cols)
      .eq("post_type", "tweet")
      .eq("is_live_schedule", false)
      .order("posted_at", { ascending: false, nullsFirst: false })
      .limit(POST_LIMIT);
    if (withHiddenFilter) q = q.eq("gallery_hidden", false);
    return q;
  };

  let hideSupported = true;
  let res = await query(`${BASE_COLS}, gallery_hidden`, !includeHidden);
  if (isMissingHiddenColumn(res.error)) {
    hideSupported = false;
    res = await query(BASE_COLS, false);
  }
  if (res.error) {
    console.error("[x_gallery]", res.error.message);
    return { posts: [] as XGalleryPost[], hideSupported };
  }

  const covers = await liveCovers(supabase);
  const posts = ((res.data ?? []) as unknown as PostRow[])
    .filter((row) => !covers.tweetIds.has(row.tweet_id))
    .map((row) => toPost(row, covers.sources))
    .filter((post): post is XGalleryPost => post !== null);
  return { posts, hideSupported };
}

/** Same presets as gallery.json: 16:9 → sm (one cell is ~16:9 on desktop), portrait → tall. */
export function tileSize(width?: number, height?: number): GalleryTileSize {
  if (!width || !height) return "sm";
  const ratio = width / height;
  if (ratio >= 1.25) return "sm";
  if (ratio <= 0.8) return "tall";
  return "md";
}

/** Moments tiles from X, newest first (empty when Supabase is not set up). */
export async function loadXGalleryItems(): Promise<GalleryItem[]> {
  if (!isSupabaseConfigured()) return [];
  try {
    const { posts } = await loadPosts(createPublicClient(), false);
    return posts.flatMap((post) =>
      post.photos.map((photo) => ({
        id: photo.id,
        src: photo.src,
        thumb: photo.thumb,
        alt: post.text || "รูปจากโพสต์ของ Mild-R บน X",
        credit: X_CREDIT,
        size: tileSize(photo.width, photo.height),
        width: photo.width,
        height: photo.height,
        // Keeps X tiles after every curated tile in GalleryBoard's sort.
        loadOnDemand: true,
        source: "x" as const,
        postedAt: post.postedAt ?? undefined,
        postUrl: post.postUrl,
      }))
    );
  } catch (err) {
    console.error("[x_gallery]", err);
    return [];
  }
}

/** Every X post with photos, hidden ones included (admin screen). */
export async function loadXGalleryAdmin() {
  if (!isSupabaseConfigured()) return { posts: [] as XGalleryPost[], hideSupported: false };
  return loadPosts(createAdminClient() as unknown as Client, true);
}

/** Hide or show one post's photos in Moments. */
export async function setXPostGalleryHidden(tweetId: string, hidden: boolean) {
  const { error } = await createAdminClient()
    .from("mild_r_x_posts")
    .update({ gallery_hidden: hidden })
    .eq("tweet_id", tweetId);
  if (error) throw new Error(error.message);
}
