"use client";

import { useCallback, useEffect, useState, type ReactNode } from "react";
import { CheckCircle2, ExternalLink, Eye, EyeOff, Pin, RefreshCw } from "lucide-react";

import { KeyholePlate } from "@/components/cafe/board/brass";
import { LABEL, SERIF, THAI, TYPE } from "@/components/cafe/board/pieces";
import { SocialPlatformIcon } from "@/components/icons/SocialPlatformIcon";
import {
  CAFE_X_HANDLE,
  CAFE_YOUTUBE_HANDLE,
  feedDate,
  feedDateTime,
  noticeHeadline,
  tapeDuration,
  type CafeFeed,
  type CafeFeedState,
  type CafeNotice,
  type CafeTape,
} from "@/lib/cafe-feeds";
import { getYoutubeThumbnailUrl } from "@/lib/youtube";
import { cn } from "@/lib/utils";

type FeedsData = {
  ready: boolean;
  notices: CafeNotice[];
  tapes: CafeTape[];
  state: CafeFeedState[];
};

/** Rows shown before "ดูทั้งหมด". */
const ROWS_FIRST = 8;

const PAPER = "relative bg-cafe-cream text-cafe-ink shadow-[0_18px_34px_rgba(0,0,0,0.5)]";
const FOCUS =
  "focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cafe-gold";
const SMALL_BUTTON = cn(
  FOCUS,
  "inline-flex h-[34px] shrink-0 items-center justify-center gap-1.5 border border-cafe-ink/20 px-2.5 text-[13px] font-semibold text-cafe-ink-soft transition hover:border-cafe-ink/45 hover:text-cafe-ink disabled:opacity-50"
);
const ICON_BUTTON = cn(SMALL_BUTTON, "w-[34px] px-0");

function AutoSwitch({
  on,
  busy,
  label,
  sub,
  onToggle,
}: {
  on: boolean;
  busy: boolean;
  label: string;
  sub: string;
  onToggle: () => void;
}) {
  return (
    <div className="flex items-start gap-3.5">
      <button
        type="button"
        role="switch"
        aria-checked={on}
        aria-label={label}
        disabled={busy}
        onClick={onToggle}
        className={cn(
          FOCUS,
          "relative mt-0.5 h-6 w-11 flex-none rounded-full transition disabled:opacity-50",
          on
            ? "bg-cafe-gold shadow-[inset_0_0_0_1px_var(--color-cafe-gold-deep)]"
            : "bg-cafe-ink/25 shadow-[inset_0_0_0_1px_rgba(20,33,28,0.3)]"
        )}
      >
        <span
          className={cn(
            "absolute top-[3px] left-[3px] size-[18px] rounded-full bg-cafe-cream-light shadow-[0_1px_2px_rgba(0,0,0,0.3)] transition-transform",
            on && "translate-x-5"
          )}
        />
      </button>
      <div className="min-w-0">
        <p className={cn(THAI, "text-[14.5px] font-semibold")}>{label}</p>
        <p className={cn(THAI, "mt-0.5 text-[12.5px] leading-relaxed text-cafe-ink-soft")}>{sub}</p>
      </div>
    </div>
  );
}

function FeedCard({
  feed,
  eyebrow,
  title,
  state,
  count,
  unit,
  switchLabel,
  switchSub,
  note,
  busy,
  onAuto,
  onPull,
  children,
}: {
  feed: CafeFeed;
  eyebrow: string;
  title: string;
  state: CafeFeedState | undefined;
  count: number;
  unit: string;
  switchLabel: string;
  switchSub: string;
  note: string;
  busy: string | null;
  onAuto: (feed: CafeFeed, on: boolean) => void;
  onPull: (feed: CafeFeed) => void;
  children: ReactNode;
}) {
  const auto = state?.autoSync ?? true;
  const pulling = busy === `pull-${feed}`;
  return (
    <section className={cn(PAPER, "mt-10 px-4 pt-7 pb-4 sm:px-6")}>
      <KeyholePlate className="top-0 left-1/2 -translate-x-1/2 -translate-y-[60%]" />
      <p className={cn(LABEL, "flex items-center gap-2 text-[10px] text-cafe-gold-deep sm:text-[11px]")}>
        <SocialPlatformIcon platform={feed} className="size-3.5" />
        {eyebrow}
      </p>
      <h3 className={cn(SERIF, "mt-2 text-xl font-bold sm:text-[22px]")}>{title}</h3>

      <div className="mt-4 bg-cafe-ink/[0.06] p-3.5 shadow-[inset_0_0_0_1px_rgba(20,33,28,0.12)]">
        <AutoSwitch
          on={auto}
          busy={busy === `auto-${feed}`}
          label={switchLabel}
          sub={switchSub}
          onToggle={() => onAuto(feed, !auto)}
        />
        <div className="mt-3 flex flex-wrap items-center justify-between gap-2.5 border-t border-cafe-ink/12 pt-3">
          <p className={cn(THAI, "text-[12.5px] text-cafe-ink-soft")}>
            {state?.lastSyncedAt ? (
              <>
                ดึงล่าสุด <span className={TYPE}>{feedDateTime(state.lastSyncedAt)}</span> · {count} {unit}
              </>
            ) : (
              "ยังไม่เคยดึง · กด “ดึงตอนนี้” เพื่อดึงครั้งแรก"
            )}
          </p>
          <button
            type="button"
            disabled={busy !== null}
            onClick={() => onPull(feed)}
            className={SMALL_BUTTON}
          >
            <RefreshCw className={cn("size-3.5", pulling && "animate-spin")} aria-hidden />
            {pulling ? "กำลังดึง…" : "ดึงตอนนี้"}
          </button>
        </div>
        {state?.lastError ? (
          <p className={cn(THAI, "mt-2.5 border-l-[3px] border-cafe-wax bg-cafe-wax/10 px-2.5 py-1.5 text-[12.5px] text-cafe-wax")}>
            ดึงรอบล่าสุดไม่สำเร็จ: {state.lastError}
          </p>
        ) : null}
      </div>

      <p className={cn(THAI, "mt-4 text-[12.5px] leading-relaxed text-cafe-ink-soft")}>{note}</p>
      <div className="mt-2">{children}</div>
    </section>
  );
}

function ShowAll({
  total,
  open,
  onToggle,
}: {
  total: number;
  open: boolean;
  onToggle: () => void;
}) {
  if (total <= ROWS_FIRST) return null;
  return (
    <button
      type="button"
      onClick={onToggle}
      className={cn(FOCUS, THAI, "mt-2 min-h-10 text-[13px] text-cafe-forest underline underline-offset-4 hover:text-cafe-ink")}
    >
      {open ? "ย่อรายการ" : `+ อีก ${total - ROWS_FIRST} รายการ · ดูทั้งหมด`}
    </button>
  );
}

function HideButton({
  hidden,
  disabled,
  onClick,
}: {
  hidden: boolean;
  disabled: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      aria-pressed={hidden}
      disabled={disabled}
      onClick={onClick}
      title={hidden ? "ซ่อนอยู่ · กดเพื่อแสดง" : "แสดงอยู่ · กดเพื่อซ่อน"}
      className={cn(SMALL_BUTTON, "min-w-[5.5rem]", hidden && "border-cafe-wax/50 text-cafe-wax hover:text-cafe-wax")}
    >
      {hidden ? <EyeOff className="size-3.5" aria-hidden /> : <Eye className="size-3.5" aria-hidden />}
      {hidden ? "ซ่อนอยู่" : "แสดง"}
    </button>
  );
}

export function CafeFeedsPanel() {
  const [data, setData] = useState<FeedsData | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [allNotices, setAllNotices] = useState(false);
  const [allTapes, setAllTapes] = useState(false);

  const load = useCallback(async () => {
    try {
      const res = await fetch("/api/cafe/feeds", { cache: "no-store" });
      const body = (await res.json().catch(() => ({}))) as FeedsData & { error?: string };
      if (!res.ok) {
        setLoadError(body.error ?? "โหลดข้อมูลไม่สำเร็จ");
        return;
      }
      setData(body);
      setLoadError(null);
    } catch {
      setLoadError("โหลดข้อมูลไม่สำเร็จ");
    }
  }, []);

  useEffect(() => {
    // Fetch-on-mount: the panel only exists once the settings are unlocked.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    void load();
  }, [load]);

  useEffect(() => {
    if (!status) return;
    const timer = window.setTimeout(() => setStatus(null), 2500);
    return () => window.clearTimeout(timer);
  }, [status]);

  async function send(key: string, method: "PUT" | "POST", payload: object, done: string) {
    setBusy(key);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/cafe/feeds", {
        method,
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const body = (await res.json().catch(() => ({}))) as Partial<FeedsData> & { error?: string };
      if (body.notices && body.tapes && body.state) {
        setData({ ready: body.ready ?? true, notices: body.notices, tapes: body.tapes, state: body.state });
      }
      if (!res.ok) {
        setError(body.error ?? "บันทึกไม่สำเร็จ");
        return;
      }
      setStatus(done);
    } catch {
      setError("เชื่อมต่อไม่ได้ ลองใหม่อีกครั้ง");
    } finally {
      setBusy(null);
    }
  }

  const onAuto = (feed: CafeFeed, on: boolean) =>
    send(
      `auto-${feed}`,
      "PUT",
      { kind: "feed", feed, autoSync: on },
      `${feed === "x" ? "X" : "YouTube"} · ${on ? "ดึงทุกเที่ยงคืน" : "หยุดดึง (ของเดิมยังโชว์)"}`
    );
  const onPull = (feed: CafeFeed) =>
    send(`pull-${feed}`, "POST", { feeds: [feed] }, `${feed === "x" ? "X" : "YouTube"} · ดึงเสร็จแล้ว`);

  if (loadError && !data) {
    return (
      <p className={cn(THAI, "mt-10 border-l-[3px] border-cafe-wax-light bg-cafe-deep/85 px-3.5 py-3 text-sm text-cafe-cream")}>
        ประกาศ / คลิป: {loadError}
      </p>
    );
  }
  if (!data) {
    return <p className={cn(LABEL, "mt-10")}>Loading feeds…</p>;
  }
  if (!data.ready) {
    return (
      <div className={cn(PAPER, "mt-10 px-5 pt-7 pb-5 sm:px-6")}>
        <KeyholePlate className="top-0 left-1/2 -translate-x-1/2 -translate-y-[60%]" />
        <p className={cn(LABEL, "text-[10px] text-cafe-gold-deep sm:text-[11px]")}>Notice Board · Case Tapes</p>
        <p className={cn(THAI, "mt-2 text-sm leading-relaxed text-cafe-ink-soft")}>
          ยังไม่ได้ตั้งค่าฐานข้อมูลของประกาศ / คลิป · รัน <span className={TYPE}>npm run db:setup:cafe-feeds</span> ก่อน
        </p>
      </div>
    );
  }

  const stateOf = (feed: CafeFeed) => data.state.find((row) => row.feed === feed);
  const notices = allNotices ? data.notices : data.notices.slice(0, ROWS_FIRST);
  const tapes = allTapes ? data.tapes : data.tapes.slice(0, ROWS_FIRST);

  return (
    <div>
      <FeedCard
        feed="x"
        eyebrow="Notice Board · ประกาศจาก X"
        title={`โพสต์จาก @${CAFE_X_HANDLE}`}
        state={stateOf("x")}
        count={data.notices.length}
        unit="โพสต์"
        switchLabel="ดึงโพสต์ใหม่ทุกเที่ยงคืน (00:00 เวลาไทย)"
        switchSub={`เปิด = โพสต์ใหม่ของ @${CAFE_X_HANDLE} ขึ้นหน้าคาเฟ่เองหลังเที่ยงคืน · เอาเฉพาะโพสต์ (ไม่รวมรีพลาย · รีโพสต์ · quote) · ปิด = หยุดดึง โพสต์เดิมยังโชว์`}
        note="ปักหมุดได้ทีละ 1 โพสต์ · ซ่อนรายโพสต์ได้ (ดึงใหม่ก็ยังซ่อนอยู่) · แก้ข้อความไม่ได้ ต้องแก้ที่ X"
        busy={busy}
        onAuto={onAuto}
        onPull={onPull}
      >
        {data.notices.length === 0 ? (
          <p className={cn(THAI, "border-t border-cafe-gold-deep/20 py-3 text-[13px] text-cafe-ink-muted")}>
            ยังไม่มีโพสต์ในระบบ
          </p>
        ) : (
          <ul>
            {notices.map((notice) => {
              const key = `notice-${notice.id}`;
              return (
                <li
                  key={notice.id}
                  className={cn(
                    "flex items-center gap-2.5 border-t border-cafe-gold-deep/20 py-3",
                    notice.hidden && "opacity-55"
                  )}
                >
                  <SocialPlatformIcon platform="x" className="size-3.5 flex-none text-cafe-ink" />
                  <div className="min-w-0 flex-1">
                    <p className={cn(TYPE, "text-[11px] tracking-[0.06em] text-cafe-ink-muted uppercase")}>
                      {feedDate(notice.postedAt)}
                      {notice.pinned ? <span className="ml-2 text-cafe-wax">· Pinned</span> : null}
                    </p>
                    <p className={cn(THAI, "mt-0.5 truncate text-[14.5px]")}>
                      {noticeHeadline(notice.text) || "(โพสต์รูปอย่างเดียว)"}
                    </p>
                  </div>
                  <button
                    type="button"
                    aria-label={notice.pinned ? "เลิกปักหมุด" : "ปักหมุด"}
                    title={notice.pinned ? "เลิกปักหมุด" : "ปักหมุด (แทนโพสต์ที่ปักอยู่)"}
                    aria-pressed={notice.pinned}
                    disabled={busy !== null || notice.hidden}
                    onClick={() =>
                      send(
                        key,
                        "PUT",
                        { kind: "notice", id: notice.id, pinned: !notice.pinned },
                        notice.pinned ? "เลิกปักหมุดแล้ว" : "ปักหมุดแล้ว"
                      )
                    }
                    className={cn(
                      ICON_BUTTON,
                      notice.pinned &&
                        "border-cafe-wax bg-cafe-wax text-[#f6d9d0] hover:border-cafe-wax hover:text-[#f6d9d0]"
                    )}
                  >
                    <Pin className="size-[15px]" aria-hidden />
                  </button>
                  <HideButton
                    hidden={notice.hidden}
                    disabled={busy !== null}
                    onClick={() =>
                      send(
                        key,
                        "PUT",
                        { kind: "notice", id: notice.id, hidden: !notice.hidden },
                        notice.hidden ? "โพสต์นี้แสดงแล้ว" : "ซ่อนโพสต์นี้แล้ว"
                      )
                    }
                  />
                  <a
                    href={notice.url}
                    target="_blank"
                    rel="noopener noreferrer"
                    aria-label="เปิดโพสต์บน X"
                    title="เปิดโพสต์บน X"
                    className={cn(ICON_BUTTON, "max-[420px]:hidden")}
                  >
                    <ExternalLink className="size-[15px]" aria-hidden />
                  </a>
                </li>
              );
            })}
          </ul>
        )}
        <ShowAll total={data.notices.length} open={allNotices} onToggle={() => setAllNotices((v) => !v)} />
      </FeedCard>

      <FeedCard
        feed="youtube"
        eyebrow="Case Tapes · คลิป YouTube"
        title={`คลิปจากช่อง ${CAFE_YOUTUBE_HANDLE}`}
        state={stateOf("youtube")}
        count={data.tapes.length}
        unit="คลิป"
        switchLabel="ดึงคลิปใหม่ทุกเที่ยงคืน (00:00 เวลาไทย)"
        switchSub="เปิด = คลิปใหม่จากช่องขึ้นหน้าคาเฟ่เองหลังเที่ยงคืน (รอบเดียวกับ X) · ปิด = หยุดดึง คลิปเดิมยังโชว์"
        note="ซ่อนรายคลิปได้ · คลิปที่ซ่อนไม่ขึ้นหน้าคาเฟ่ แม้ดึงใหม่ก็ยังซ่อนอยู่"
        busy={busy}
        onAuto={onAuto}
        onPull={onPull}
      >
        {data.tapes.length === 0 ? (
          <p className={cn(THAI, "border-t border-cafe-gold-deep/20 py-3 text-[13px] text-cafe-ink-muted")}>
            ยังไม่มีคลิปในระบบ
          </p>
        ) : (
          <ul>
            {tapes.map((tape) => (
              <li
                key={tape.id}
                className={cn(
                  "flex items-center gap-3 border-t border-cafe-gold-deep/20 py-2.5",
                  tape.hidden && "opacity-55"
                )}
              >
                <a
                  href={`https://www.youtube.com/watch?v=${tape.id}`}
                  target="_blank"
                  rel="noopener noreferrer"
                  title="เปิดคลิปบน YouTube"
                  className="relative block aspect-video w-24 flex-none overflow-hidden bg-cafe-deep"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={tape.thumbnailUrl ?? getYoutubeThumbnailUrl(tape.id)}
                    alt=""
                    loading="lazy"
                    className="size-full object-cover"
                  />
                  {tapeDuration(tape.durationSeconds) ? (
                    <span className={cn(TYPE, "absolute right-1 bottom-1 bg-cafe-deep/85 px-1 text-[10px] text-cafe-cream")}>
                      {tapeDuration(tape.durationSeconds)}
                    </span>
                  ) : null}
                </a>
                <div className="min-w-0 flex-1">
                  <p className={cn(SERIF, "truncate text-sm")}>{tape.title}</p>
                  <p className="mt-0.5 flex items-center gap-1.5">
                    <span className={cn(TYPE, "text-[11px] tracking-[0.06em] text-cafe-ink-muted uppercase")}>
                      {feedDate(tape.publishedAt)}
                    </span>
                    {tape.isShort ? (
                      <span className={cn(SERIF, "bg-cafe-heart px-1.5 pt-0.5 text-[9px] tracking-[0.14em] text-white")}>
                        SHORT
                      </span>
                    ) : null}
                  </p>
                </div>
                <HideButton
                  hidden={tape.hidden}
                  disabled={busy !== null}
                  onClick={() =>
                    send(
                      `tape-${tape.id}`,
                      "PUT",
                      { kind: "tape", id: tape.id, hidden: !tape.hidden },
                      tape.hidden ? "คลิปนี้แสดงแล้ว" : "ซ่อนคลิปนี้แล้ว"
                    )
                  }
                />
              </li>
            ))}
          </ul>
        )}
        <ShowAll total={data.tapes.length} open={allTapes} onToggle={() => setAllTapes((v) => !v)} />
      </FeedCard>

      {error ? (
        <p
          role="alert"
          className={cn(THAI, "mt-4 border-l-[3px] border-cafe-wax-light bg-cafe-deep/85 px-3.5 py-3 text-sm text-cafe-cream")}
        >
          {error}
        </p>
      ) : null}
      {status ? (
        <p
          role="status"
          className="mt-4 flex items-center gap-2 border-l-[3px] border-cafe-gold bg-cafe-deep/85 px-3.5 py-3 text-sm text-cafe-text"
        >
          <CheckCircle2 className="size-4 shrink-0 text-cafe-gold" aria-hidden />
          {status}
        </p>
      ) : null}
    </div>
  );
}
