"use client";

import { useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { ExternalLink, Eye, EyeOff } from "lucide-react";

import { BackLink } from "@/components/layout/BackLink";
import { ADMIN_X_GALLERY_LOGIN } from "@/lib/admin-next";
import { feedDate } from "@/lib/cafe-feeds";
import { R_EYEBROW_CLASS, R_PILL_ACTIVE_CLASS } from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import type { XGalleryPost } from "@/lib/x-gallery";

type Tab = "all" | "shown" | "hidden";

const TABS: { key: Tab; label: string }[] = [
  { key: "all", label: "ทั้งหมด" },
  { key: "shown", label: "แสดงอยู่" },
  { key: "hidden", label: "ซ่อนไว้" },
];

const EMPTY_TEXT: Record<Tab, string> = {
  all: "ยังไม่มีโพสต์ X ที่มีรูป",
  shown: "ไม่มีโพสต์ที่แสดงอยู่",
  hidden: "ไม่มีโพสต์ที่ซ่อนไว้",
};

type Props = {
  posts: XGalleryPost[];
  /** False until migration 20261117120000_x_posts_gallery_hidden.sql has run. */
  hideSupported: boolean;
};

/** /admin/x-gallery · hide or show X posts' photos in the Moments gallery. */
export function AdminXGalleryClient({ posts: initialPosts, hideSupported }: Props) {
  const router = useRouter();
  const [posts, setPosts] = useState(initialPosts);
  const [tab, setTab] = useState<Tab>("all");
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const counts = useMemo(() => {
    const hidden = posts.filter((p) => p.hidden).length;
    return { all: posts.length, shown: posts.length - hidden, hidden };
  }, [posts]);

  const visible = useMemo(
    () =>
      posts.filter((p) => (tab === "all" ? true : tab === "hidden" ? p.hidden : !p.hidden)),
    [posts, tab]
  );

  async function toggle(post: XGalleryPost) {
    setError(null);
    setBusy(post.tweetId);
    try {
      const res = await fetch("/api/admin/x-gallery", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tweetId: post.tweetId, hidden: !post.hidden }),
      });
      if (res.status === 401) {
        router.replace(ADMIN_X_GALLERY_LOGIN);
        return;
      }
      if (!res.ok) {
        const data = (await res.json().catch(() => ({}))) as { error?: string };
        setError(data.error ?? "อัปเดตไม่สำเร็จ");
        return;
      }
      setPosts((list) =>
        list.map((p) => (p.tweetId === post.tweetId ? { ...p, hidden: !p.hidden } : p))
      );
    } catch {
      setError("เชื่อมต่อไม่ได้ กรุณาลองใหม่");
    } finally {
      setBusy(null);
    }
  }

  return (
    <div className="relative mx-auto max-w-6xl">
      <header>
        <BackLink href="/admin" className="mb-6">
          Control desk
        </BackLink>
        <p className={R_EYEBROW_CLASS}>Moments from X</p>
        <h1 className="mt-1.5 font-[family-name:var(--font-display)] text-3xl text-r-text sm:text-4xl">
          รูปจาก X ใน Moments
        </h1>
        <p className="mt-2 max-w-2xl text-sm text-r-text-2/75">
          รูปจากโพสต์ของ @MildRWorldEnd (ไม่รวมรีโพสต์ โควต ตารางไลฟ์ และปกไลฟ์) ต่อท้ายแกลเลอรี
          Moments เอง ซ่อนแล้วรูปทุกรูปในโพสต์นั้นจะหายจากหน้าเว็บ
        </p>
      </header>

      {!hideSupported ? (
        <p className="mt-4 rounded-2xl bg-r-pri/15 px-4 py-3 text-sm" role="status">
          ยังซ่อนรูปไม่ได้ ต้องรัน <code>npm run db:migrate:x-gallery-hidden</code> ก่อน
        </p>
      ) : null}
      {error ? (
        <p className="mt-4 rounded-2xl bg-r-pri/15 px-4 py-3 text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex flex-wrap gap-2">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            aria-pressed={tab === item.key}
            onClick={() => setTab(item.key)}
            className={cn(
              "min-h-11 rounded-full px-4 text-sm",
              tab === item.key ? R_PILL_ACTIVE_CLASS : "bg-white/5 text-r-text-2"
            )}
          >
            {item.label} · {counts[item.key]}
          </button>
        ))}
      </div>

      {visible.length === 0 ? (
        <p className="mt-10 text-sm text-r-text-3">{EMPTY_TEXT[tab]}</p>
      ) : (
        <ul className="mt-6 grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {visible.map((post) => (
            <li
              key={post.tweetId}
              className={cn(
                "flex flex-col overflow-hidden rounded-2xl bg-white/[0.04] ring-1 ring-white/10",
                post.hidden && "opacity-60"
              )}
            >
              <div className="relative aspect-square bg-white/[0.03]">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={post.photos[0].thumb}
                  alt=""
                  loading="lazy"
                  className="size-full object-cover"
                />
                {post.photos.length > 1 ? (
                  <span className="absolute top-2 right-2 rounded-full bg-r-bg/80 px-2 py-0.5 text-xs text-r-text">
                    {post.photos.length} รูป
                  </span>
                ) : null}
                {post.hidden ? (
                  <span className="absolute top-2 left-2 rounded-full bg-r-bg/80 px-2 py-0.5 text-xs text-r-text-2">
                    ซ่อนอยู่
                  </span>
                ) : null}
              </div>
              <div className="flex flex-1 flex-col gap-1.5 p-3">
                <p className="text-xs text-r-text-3">
                  {post.postedAt ? feedDate(post.postedAt) : "ไม่ทราบวันที่"}
                </p>
                <p className="line-clamp-2 text-[13px] leading-snug text-r-text-2">
                  {post.text || "—"}
                </p>
                <div className="mt-auto flex items-center justify-between gap-2 pt-1.5">
                  <a
                    href={post.postUrl}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="inline-flex min-h-11 items-center gap-1 text-xs text-r-text-2 hover:text-r-text"
                  >
                    ดูโพสต์
                    <ExternalLink className="size-3.5" aria-hidden />
                  </a>
                  <button
                    type="button"
                    disabled={!hideSupported || busy !== null}
                    onClick={() => void toggle(post)}
                    className="inline-flex min-h-11 items-center gap-1.5 rounded-full bg-white/5 px-3 text-xs text-r-text ring-1 ring-white/10 hover:bg-white/10 disabled:opacity-50"
                  >
                    {post.hidden ? (
                      <Eye className="size-3.5" aria-hidden />
                    ) : (
                      <EyeOff className="size-3.5" aria-hidden />
                    )}
                    {busy === post.tweetId ? "กำลังบันทึก…" : post.hidden ? "แสดง" : "ซ่อน"}
                  </button>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
