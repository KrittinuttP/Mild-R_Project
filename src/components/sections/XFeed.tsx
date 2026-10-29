"use client";

import { Fragment, useRef, useState, type ReactNode } from "react";
import { ChevronRight, ChevronUp, ExternalLink, Heart, Repeat2 } from "lucide-react";

import { ImageLightbox } from "@/components/media/ImageLightbox";
import { cn } from "@/lib/utils";
import type { XPost, XQuotedTweet } from "@/types/x-post";

type XFeedProps = {
  posts: XPost[];
  retweets: XPost[];
  profileUrl: string;
  className?: string;
};

type TabId = "posts" | "retweets";

/** Tablet/desktop box: 3 first, then +3, then the rest (FW1-b). */
const WIDE_STEPS = [3, 3];
/** Phones: 2 first, then everything else at once (FO1-b). */
const PHONE_FIRST = 2;

function isLikelyImageUrl(url: string) {
  const u = url.toLowerCase();
  return u.includes("twimg.com") || /\.(jpe?g|png|webp|gif)(\?|$)/i.test(u);
}

function firstImageUrl(urls: string[] | null | undefined) {
  return (urls ?? []).find((u) => u && isLikelyImageUrl(u)) ?? null;
}

/** "25 Oct" in Bangkok time (dates stay in English). */
function formatPostedAt(iso: string | null) {
  if (!iso) return null;
  const ms = Date.parse(iso);
  if (!Number.isFinite(ms)) return null;
  return new Intl.DateTimeFormat("en-GB", { timeZone: "Asia/Bangkok", day: "numeric", month: "short" }).format(ms);
}

/** Post text with #hashtags in pink. */
function RichText({ text }: { text: string }) {
  const parts = text.split(/(#[\p{L}\p{N}_]+)/u);
  return (
    <>
      {parts.map((part, i) =>
        part.startsWith("#") ? (
          <span key={i} className="text-r-pri">
            {part}
          </span>
        ) : (
          <Fragment key={i}>{part}</Fragment>
        )
      )}
    </>
  );
}

function QuoteCard({ nested }: { nested: XQuotedTweet }) {
  return (
    <div className="mt-3 rounded-[14px] bg-r-bg/50 px-3.5 py-2.5 ring-1 ring-r-text-2/15 ring-inset">
      <p className="text-[0.8125rem] text-r-text-3">
        <span className="text-r-text/90">{nested.author_name ?? "ผู้ใช้"}</span>
        {nested.author_username ? <span> @{nested.author_username}</span> : null}
      </p>
      {nested.text ? (
        <p className="mt-1 line-clamp-4 text-sm leading-snug whitespace-pre-wrap text-r-text/80">{nested.text}</p>
      ) : null}
    </div>
  );
}

function PostCard({ post, tab, onOpenImage, fallbackUrl }: { post: XPost; tab: TabId; onOpenImage: (url: string) => void; fallbackUrl: string }) {
  const dateLabel = formatPostedAt(post.posted_at);
  const href = post.original_url || fallbackUrl;
  const retweet = post.post_type === "retweet";
  const media =
    firstImageUrl(post.media_urls) || (retweet || post.is_quote ? firstImageUrl(post.quoted_tweet?.media_urls) : null);
  const showQuote = post.is_quote && post.quoted_tweet && !retweet;
  const bodyText = retweet ? post.quoted_tweet?.text || post.text : post.text;

  return (
    <article className="rounded-[20px] bg-r-bg/55 px-4 py-4 ring-1 ring-r-text-2/18 ring-inset sm:px-5 sm:py-[18px]">
      {tab === "retweets" ? (
        <p className="mb-2 flex items-center gap-1 text-xs text-r-text-3">
          <Repeat2 aria-hidden className="size-3.5" />
          รีโพสต์
        </p>
      ) : null}
      <div className="flex items-center gap-3">
        {post.author_avatar ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img
            src={post.author_avatar}
            alt=""
            loading="lazy"
            referrerPolicy="no-referrer"
            className="size-10 shrink-0 rounded-full bg-r-text object-cover object-[50%_20%]"
          />
        ) : (
          <span aria-hidden className="size-10 shrink-0 rounded-full bg-r-pri/20" />
        )}
        <div className="min-w-0">
          <p className="truncate text-[0.9375rem] font-semibold text-r-text">{post.author_name ?? "Mild-R"}</p>
          <p className="truncate text-[0.8125rem] text-r-text-3">
            {[post.author_username ? `@${post.author_username}` : null, dateLabel].filter(Boolean).join(" · ")}
          </p>
        </div>
      </div>

      {bodyText ? (
        <p className="mt-3 text-[0.9375rem] leading-[1.7] whitespace-pre-wrap text-r-text/92">
          <RichText text={bodyText} />
        </p>
      ) : null}

      {showQuote && post.quoted_tweet ? <QuoteCard nested={post.quoted_tweet} /> : null}

      {media ? (
        <button
          type="button"
          onClick={() => onOpenImage(media)}
          aria-label="ดูรูปขนาดใหญ่"
          className="mt-3 block w-full overflow-hidden rounded-[14px] bg-r-bg ring-1 ring-r-text-2/15 ring-inset focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-acc"
        >
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={media} alt="" loading="lazy" referrerPolicy="no-referrer" className="mx-auto max-h-[420px] w-full object-contain" />
        </button>
      ) : null}

      <div className="mt-3 flex items-center justify-between gap-3 text-[0.8125rem] text-r-text-3">
        <span className="inline-flex gap-3.5">
          <span className="inline-flex items-center gap-[5px]">
            <Heart aria-hidden className="size-3.5" />
            {post.likes_count != null ? post.likes_count.toLocaleString("en-US") : "—"}
          </span>
          <span className="inline-flex items-center gap-[5px]">
            <Repeat2 aria-hidden className="size-3.5" />
            {post.retweets_count != null ? post.retweets_count.toLocaleString("en-US") : "—"}
          </span>
        </span>
        <a
          href={href}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center gap-[5px] rounded text-r-text-2 transition-colors hover:text-r-text focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-acc"
        >
          ดูบน X
          <ExternalLink aria-hidden className="size-3.5" />
        </a>
      </div>
    </article>
  );
}

function MoreButton({ onClick, title, hint }: { onClick: () => void; title: string; hint: string }) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="flex h-[58px] w-full flex-col items-center justify-center gap-0.5 rounded-2xl bg-white/[0.02] text-sm text-r-text ring-1 ring-r-text-2/15 ring-inset transition-colors hover:bg-r-pri/8 hover:ring-r-pri/35 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-acc"
    >
      <span className="inline-flex items-center gap-2">
        {title}
        <ChevronRight aria-hidden className="size-4 rotate-90" />
      </span>
      <span className="text-xs text-r-text-3">{hint}</span>
    </button>
  );
}

function ProfileButton({ href }: { href: string }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="mt-3.5 flex h-[46px] items-center justify-center gap-2 rounded-2xl bg-r-pri/10 text-sm text-r-text ring-1 ring-r-pri/30 ring-inset transition-colors hover:bg-r-pri/18 focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-acc"
    >
      เปิดโปรไฟล์บน X
      <ExternalLink aria-hidden className="size-3.5" />
    </a>
  );
}

const XLogo = () => (
  <svg viewBox="0 0 24 24" aria-hidden className="size-4 fill-current">
    <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
  </svg>
);

/** Feed header: title + posts / reposts switch. */
function FeedHeader({ tab, setTab, posts, retweets }: { tab: TabId; setTab: (t: TabId) => void; posts: number; retweets: number }) {
  const tabBtn = (id: TabId, label: string, count: number) => (
    <button
      type="button"
      role="tab"
      aria-selected={tab === id}
      onClick={() => setTab(id)}
      className={cn(
        "rounded-full px-4 py-1.5 text-[0.8125rem] transition-colors focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-acc",
        tab === id ? "bg-r-pri text-r-on-pri" : "text-r-text/85 hover:text-r-text"
      )}
    >
      {label} <span className="opacity-60">{count}</span>
    </button>
  );
  return (
    <div className="mb-4 flex flex-wrap items-end justify-between gap-3">
      <div>
        <h3 className="inline-flex items-center gap-[9px] font-[family-name:var(--font-display)] text-lg text-r-text">
          <span className="text-r-text-2">
            <XLogo />
          </span>
          อัปเดตจาก X
        </h3>
      </div>
      <div role="tablist" aria-label="ฟีด X" className="inline-flex gap-1 rounded-full p-1 ring-1 ring-r-text-2/15 ring-inset">
        {tabBtn("posts", "โพสต์", posts)}
        {tabBtn("retweets", "รีโพสต์", retweets)}
      </div>
    </div>
  );
}

function EmptyFeed({ tab }: { tab: TabId }) {
  return (
    <p className="rounded-2xl border border-dashed border-r-text-2/20 px-5 py-10 text-center text-sm text-r-text-3">
      {tab === "posts" ? "ยังไม่มีโพสต์ในคลัง" : "ยังไม่มีรีโพสต์ในคลัง — จะขึ้นเมื่อดึงเจอรายการใหม่"}
    </p>
  );
}

/**
 * Follow · X feed (project R). Tablet/desktop: a 600 px scroll box that grows 3 → +3 → rest.
 * Phones: no inner scroll — 2 posts, then the rest at once with a sticky "ย่อฟีด" pill.
 */
export function XFeed({ posts, retweets, profileUrl, className }: XFeedProps) {
  const [tab, setTab] = useState<TabId>("posts");
  const [wideCount, setWideCount] = useState(WIDE_STEPS[0]);
  const [phoneOpen, setPhoneOpen] = useState(false);
  const [lightboxUrl, setLightboxUrl] = useState<string | null>(null);
  const phoneTopRef = useRef<HTMLDivElement>(null);
  const wideBoxRef = useRef<HTMLDivElement>(null);
  const items = tab === "posts" ? posts : retweets;
  const total = items.length;

  function switchTab(next: TabId) {
    // Same tab again: back to the newest post (desktop box), nothing else changes.
    if (next === tab) {
      wideBoxRef.current?.scrollTo({ top: 0, behavior: "smooth" });
      return;
    }
    setTab(next);
    setWideCount(WIDE_STEPS[0]);
    setPhoneOpen(false);
    // New tab always opens on its newest post, not mid-list from the other tab.
    wideBoxRef.current?.scrollTo({ top: 0 });
  }

  const card = (post: XPost) => (
    <li key={post.tweet_id}>
      <PostCard post={post} tab={tab} onOpenImage={setLightboxUrl} fallbackUrl={profileUrl} />
    </li>
  );
  const done = (text: string): ReactNode => (
    <p className="py-1 text-center text-[0.78125rem] text-r-text-3">
      ครบ {total} {tab === "posts" ? "โพสต์" : "รีโพสต์"}ล่าสุดแล้ว · {text}
    </p>
  );

  // wide: next step size (3, then whatever is left)
  const step = wideCount < WIDE_STEPS[0] + WIDE_STEPS[1] ? WIDE_STEPS[1] : total - wideCount;
  const nextCount = Math.min(total, wideCount + step);

  return (
    <div className={className}>
      {/* tablet + desktop */}
      <div className="hidden lg:block">
        <div className="rounded-[26px] bg-white/[0.015] p-[22px] ring-1 ring-r-text-2/15 ring-inset">
          <FeedHeader tab={tab} setTab={switchTab} posts={posts.length} retweets={retweets.length} />
          {total === 0 ? (
            <EmptyFeed tab={tab} />
          ) : (
            <div className="relative -mr-2">
              <div
                ref={wideBoxRef}
                tabIndex={0}
                role="region"
                aria-label="ฟีด X เลื่อนดูได้"
                className="h-[600px] overflow-y-auto overscroll-contain pr-2.5 [scrollbar-color:color-mix(in_srgb,var(--r-pri)_45%,transparent)_transparent] [scrollbar-width:thin] focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-r-acc"
              >
                <ul className="flex flex-col gap-3.5 pb-11">
                  {items.slice(0, wideCount).map(card)}
                  <li>
                    {wideCount < total ? (
                      <MoreButton
                        onClick={() => setWideCount(nextCount)}
                        title="ดูเพิ่มเติม"
                        hint={`โหลดอีก ${nextCount - wideCount} โพสต์ · ${wideCount + 1}–${nextCount}`}
                      />
                    ) : (
                      done("ดูต่อบน X")
                    )}
                  </li>
                </ul>
              </div>
              <span
                aria-hidden
                className="pointer-events-none absolute inset-x-0 right-[18px] bottom-0 h-14 rounded-b-[20px] bg-gradient-to-t from-r-bg to-transparent"
              />
            </div>
          )}
        </div>
        {total > 0 ? (
          <p className="mt-2.5 text-right text-xs text-r-text-3">
            แสดง {Math.min(wideCount, total)} จาก {total}
          </p>
        ) : null}
        <ProfileButton href={profileUrl} />
      </div>

      {/* phones + tablets: no box inside the page scroll */}
      <div ref={phoneTopRef} className="scroll-mt-24 lg:hidden">
        <FeedHeader tab={tab} setTab={switchTab} posts={posts.length} retweets={retweets.length} />
        {total === 0 ? (
          <EmptyFeed tab={tab} />
        ) : (
          <ul className="flex flex-col gap-3">
            {items.slice(0, PHONE_FIRST).map(card)}
            {total > PHONE_FIRST ? (
              phoneOpen ? (
                <>
                  <li className="sticky top-20 z-10 flex justify-center">
                    <button
                      type="button"
                      onClick={() => {
                        setPhoneOpen(false);
                        phoneTopRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
                      }}
                      className="inline-flex h-[38px] items-center gap-2 rounded-full bg-r-bg/92 px-[18px] text-[0.8125rem] text-r-text shadow-[0_8px_24px_rgb(0_0_0/0.4)] ring-1 ring-r-pri/40 ring-inset backdrop-blur-md"
                    >
                      <ChevronUp aria-hidden className="size-4" />
                      ย่อฟีด · เหลือ {PHONE_FIRST} โพสต์
                    </button>
                  </li>
                  {items.slice(PHONE_FIRST).map(card)}
                  <li>{done("อ่านต่อบน X")}</li>
                </>
              ) : (
                <li>
                  <MoreButton onClick={() => setPhoneOpen(true)} title="ดูเพิ่มเติม" hint={`อีก ${total - PHONE_FIRST} โพสต์ · เลื่อนอ่านต่อได้ยาวๆ`} />
                </li>
              )
            ) : null}
          </ul>
        )}
        <ProfileButton href={profileUrl} />
      </div>

      <ImageLightbox
        tone="mild-r"
        items={lightboxUrl ? [{ id: lightboxUrl, src: lightboxUrl, alt: "รูปจากโพสต์ X", caption: "รูปจากโพสต์ X" }] : []}
        activeIndex={lightboxUrl ? 0 : null}
        onActiveIndexChange={(index) => {
          if (index === null) setLightboxUrl(null);
        }}
      />
    </div>
  );
}
