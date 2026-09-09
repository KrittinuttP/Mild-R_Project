"use client";

import { useState } from "react";
import { ExternalLink, Heart, Repeat2 } from "lucide-react";

import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogTitle,
} from "@/components/ui/dialog";
import { META_MUTED_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type { XPost, XQuotedTweet } from "@/types/x-post";

type XFeedProps = {
  posts: XPost[];
  retweets: XPost[];
  className?: string;
};

type TabId = "posts" | "retweets";

/** Timeline column lock — X-like readable width inside Connect max-w-6xl */
const FEED_COL = "mx-auto w-full max-w-xl";

function isLikelyImageUrl(url: string) {
  const u = url.toLowerCase();
  return (
    u.includes("pbs.twimg.com") ||
    u.includes("twimg.com") ||
    u.includes("video.twimg.com") ||
    /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u)
  );
}

function firstImageUrl(urls: string[] | null | undefined) {
  return (urls ?? []).find((u) => u && isLikelyImageUrl(u)) ?? null;
}

function formatPostedAt(iso: string | null) {
  if (!iso) return null;
  try {
    return new Intl.DateTimeFormat("th-TH", {
      timeZone: "Asia/Bangkok",
      day: "numeric",
      month: "short",
    }).format(new Date(iso));
  } catch {
    return null;
  }
}

function QuoteCard({ nested }: { nested: XQuotedTweet }) {
  return (
    <div className="mt-2.5 rounded-xl border border-[#f3b8c4]/15 bg-[#140a0d]/40 px-3 py-2.5">
      <p className="text-[0.8rem] text-[#f3b8c4]/70">
        <span className="font-medium text-[#fff5f7]/90">
          {nested.author_name ?? "ผู้ใช้"}
        </span>
        {nested.author_username ? (
          <span className="text-[#f3b8c4]/45"> @{nested.author_username}</span>
        ) : null}
      </p>
      {nested.text ? (
        <p className="mt-1 line-clamp-4 whitespace-pre-wrap text-[0.85rem] leading-snug text-[#f7d7de]/80">
          {nested.text}
        </p>
      ) : null}
    </div>
  );
}

function PostCard({
  post,
  variant,
  onOpenImage,
}: {
  post: XPost;
  variant: TabId;
  onOpenImage: (url: string) => void;
}) {
  const dateLabel = formatPostedAt(post.posted_at);
  const href = post.original_url || "https://x.com/MildRWorldEnd";
  const media =
    firstImageUrl(post.media_urls) ||
    (post.post_type === "retweet" || post.is_quote
      ? firstImageUrl(post.quoted_tweet?.media_urls)
      : null);
  const showQuote =
    post.is_quote && post.quoted_tweet && post.post_type !== "retweet";

  const bodyText =
    post.post_type === "retweet"
      ? post.quoted_tweet?.text || post.text
      : post.text;

  return (
    <article className="rounded-2xl border border-[#f3b8c4]/20 bg-[#1a0c12]/55 transition hover:border-[#e85a7a]/35 hover:bg-[#1a0c12]/80">
      <div className="flex gap-3 p-3.5 sm:p-4">
        <div className="shrink-0">
          {post.author_avatar ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.author_avatar}
              alt=""
              className="size-10 rounded-full object-cover"
              loading="lazy"
              referrerPolicy="no-referrer"
            />
          ) : (
            <span className="block size-10 rounded-full bg-[#e85a7a]/20" />
          )}
        </div>

        <div className="min-w-0 flex-1">
          {variant === "retweets" ? (
            <p className="mb-0.5 flex items-center gap-1 text-xs text-[#f3b8c4]/55">
              <Repeat2 className="size-3.5" aria-hidden />
              Mild-R รีทวีต
            </p>
          ) : null}

          <div className="flex flex-wrap items-baseline gap-x-1.5 gap-y-0.5 text-[0.95rem] leading-tight">
            <span className="font-bold text-[#fff5f7]">
              {post.author_name ?? "Mild-R"}
            </span>
            {post.author_username ? (
              <span className="text-[#f3b8c4]/50">@{post.author_username}</span>
            ) : null}
            {dateLabel ? (
              <>
                <span className="text-[#f3b8c4]/35">·</span>
                <span className="text-[#f3b8c4]/50">{dateLabel}</span>
              </>
            ) : null}
          </div>

          {bodyText ? (
            <p className="mt-1 whitespace-pre-wrap text-[0.95rem] leading-relaxed text-[#f7d7de]/92">
              {bodyText}
            </p>
          ) : null}

          {showQuote && post.quoted_tweet ? (
            <QuoteCard nested={post.quoted_tweet} />
          ) : null}

          {media ? (
            <button
              type="button"
              onClick={() => onOpenImage(media)}
              className="mt-2.5 block w-full overflow-hidden rounded-xl border border-[#f3b8c4]/12 bg-[#12070c] text-left transition hover:border-[#e85a7a]/35"
              aria-label="ดูรูปขนาดใหญ่"
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={media}
                alt=""
                className="max-h-48 w-full object-cover sm:max-h-56"
                loading="lazy"
                referrerPolicy="no-referrer"
              />
            </button>
          ) : null}

          <div className="mt-3 flex items-center justify-between gap-3">
            <div className="flex min-w-0 items-center gap-3 text-xs text-[#f3b8c4]/55">
              {post.likes_count != null ? (
                <span className="inline-flex items-center gap-1.5">
                  <Heart className="size-3.5 shrink-0" aria-hidden />
                  {post.likes_count.toLocaleString("th-TH")}
                </span>
              ) : null}
              {post.retweets_count != null ? (
                <span className="inline-flex items-center gap-1.5">
                  <Repeat2 className="size-3.5 shrink-0" aria-hidden />
                  {post.retweets_count.toLocaleString("th-TH")}
                </span>
              ) : null}
            </div>
            <a
              href={href}
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex shrink-0 items-center gap-1 rounded-full border border-[#e85a7a]/40 bg-[#e85a7a]/15 px-2.5 py-1 text-[0.7rem] font-medium text-[#f3b8c4] transition hover:border-[#e85a7a]/65 hover:bg-[#e85a7a]/25 hover:text-[#fff5f7] sm:gap-1.5 sm:px-3 sm:py-1.5 sm:text-xs"
            >
              ดูบน X
              <ExternalLink className="size-3 sm:size-3.5" aria-hidden />
            </a>
          </div>
        </div>
      </div>
    </article>
  );
}

export function XFeed({ posts, retweets, className }: XFeedProps) {
  const [tab, setTab] = useState<TabId>("posts");
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const items = tab === "posts" ? posts : retweets;

  return (
    <div className={cn(className)}>
      <div className={cn(FEED_COL)}>
        <div>
          <h3 className={META_MUTED_CLASS}>อัปเดตจาก X</h3>
          <p className="mt-1 text-xs text-[#f3b8c4]/50">
            พรีวิวในเว็บ · กด「ดูบน X」เพื่อเปิดโพสต์นั้น
          </p>
        </div>

        <div
          className="mt-3 flex gap-1 rounded-full border border-[#f3b8c4]/15 bg-[#140a0d]/60 p-1"
          role="tablist"
          aria-label="ฟีด X"
        >
          <button
            type="button"
            role="tab"
            aria-selected={tab === "posts"}
            onClick={() => setTab("posts")}
            className={cn(
              "flex-1 rounded-full px-3 py-2 text-sm font-medium transition",
              tab === "posts"
                ? "bg-[#e85a7a]/20 text-[#fff5f7] ring-1 ring-[#e85a7a]/35"
                : "text-[#f3b8c4]/65 hover:text-[#fff5f7]"
            )}
          >
            โพส
            <span className="ml-1.5 text-xs opacity-60">{posts.length}</span>
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={tab === "retweets"}
            onClick={() => setTab("retweets")}
            className={cn(
              "flex-1 rounded-full px-3 py-2 text-sm font-medium transition",
              tab === "retweets"
                ? "bg-[#e85a7a]/20 text-[#fff5f7] ring-1 ring-[#e85a7a]/35"
                : "text-[#f3b8c4]/65 hover:text-[#fff5f7]"
            )}
          >
            รี
            <span className="ml-1.5 text-xs opacity-60">{retweets.length}</span>
          </button>
        </div>
      </div>

      <div className={cn(FEED_COL, "mt-3 space-y-3")} role="tabpanel">
        {items.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-[#f3b8c4]/20 px-5 py-10 text-center">
            <p className="text-sm text-[#f3b8c4]/70">
              {tab === "posts"
                ? "ยังไม่มีโพสต์ในคลัง"
                : "ยังไม่มีรีทวีตในคลัง — จะโชว์เมื่อ sync เจอรายการใหม่"}
            </p>
          </div>
        ) : (
          <ul className="space-y-3">
            {items.map((post) => (
              <li key={post.tweet_id}>
                <PostCard
                  post={post}
                  variant={tab}
                  onOpenImage={setLightboxUrl}
                />
              </li>
            ))}
          </ul>
        )}

        <a
          href="https://x.com/MildRWorldEnd"
          target="_blank"
          rel="noopener noreferrer"
          className="flex items-center justify-center gap-2 rounded-2xl border border-[#f3b8c4]/22 bg-[#e85a7a]/10 px-4 py-3.5 text-sm font-medium text-[#f3b8c4] transition hover:border-[#e85a7a]/45 hover:bg-[#e85a7a]/18 hover:text-[#fff5f7]"
        >
          ไปที่ X ดูต้นฉบับ
          <ExternalLink className="size-3.5 opacity-80" aria-hidden />
        </a>
      </div>

      <Dialog
        open={Boolean(lightboxUrl)}
        onOpenChange={(open) => {
          if (!open) setLightboxUrl(null);
        }}
      >
        <DialogContent
          className="max-h-[90dvh] w-[min(100%,calc(100vw-1.25rem))] max-w-3xl overflow-hidden rounded-3xl border border-[#f3b8c4]/20 bg-[#12070c] p-3 text-[#fff5f7] shadow-[0_24px_60px_rgba(0,0,0,0.7)] sm:p-4"
          overlayClassName="bg-black/70 supports-backdrop-filter:backdrop-blur-sm"
          closeButtonClassName="text-[#f3b8c4] hover:bg-[#e85a7a]/15 hover:text-[#fff5f7]"
        >
          <DialogTitle className="sr-only">ดูรูปจากโพสต์ X</DialogTitle>
          <DialogDescription className="sr-only">
            รูปขนาดใหญ่จากฟีด X ของ Mild-R
          </DialogDescription>
          {lightboxUrl ? (
            <div className="relative mx-auto max-h-[min(78dvh,720px)] w-full overflow-hidden rounded-2xl bg-black/40">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={lightboxUrl}
                alt=""
                className="mx-auto max-h-[min(78dvh,720px)] w-auto max-w-full object-contain"
                referrerPolicy="no-referrer"
              />
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
