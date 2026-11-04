"use client";

import { useMemo, useState } from "react";
import { Calculator } from "lucide-react";

import {
  R_CARD_CLASS,
  R_EYEBROW_CLASS,
  R_PILL_ACTIVE_CLASS,
} from "@/lib/site-ui";
import { cn } from "@/lib/utils";
import {
  CREDITS_PER_TWEET,
  CREDITS_PER_USD,
  MIN_CREDITS_PER_CALL,
  TIMELINE_CREDITS_PER_PAGE,
  expectedSearchRunCredits,
} from "@/lib/x-credits-pricing";

const DISPLAY = "font-[family-name:var(--font-display)]";
const INTERVALS = [1, 3, 6, 12, 24] as const;
const DAYS_PER_MONTH = 30;

const fmt = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });
const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 3,
});

function lifetimeLabel(months: number): string {
  if (!Number.isFinite(months)) return "ไม่จำกัด";
  if (months < 1) return `${fmt.format(months * DAYS_PER_MONTH)} วัน`;
  if (months < 24) return `${months.toFixed(1)} เดือน`;
  return `${(months / 12).toFixed(1)} ปี`;
}

type Props = {
  balance: number | null;
  postsPerDay: number | null;
};

export function XCreditSimulator({ balance, postsPerDay }: Props) {
  const [intervalHours, setIntervalHours] = useState<number>(1);
  const [posts, setPosts] = useState<number>(
    postsPerDay != null ? Math.round(postsPerDay * 2) / 2 : 2
  );
  const [credits, setCredits] = useState<number>(
    balance != null && balance > 0 ? balance : CREDITS_PER_USD
  );
  const [nowMs] = useState(() => Date.now());

  const result = useMemo(() => {
    const runsPerMonth = (24 / intervalHours) * DAYS_PER_MONTH;
    const postsPerRun = (posts * intervalHours) / 24;
    const catchupMonthly =
      intervalHours < 24
        ? DAYS_PER_MONTH * Math.max(MIN_CREDITS_PER_CALL, posts * CREDITS_PER_TWEET)
        : 0;
    const searchMonthly =
      runsPerMonth * expectedSearchRunCredits(postsPerRun) + catchupMonthly;
    const fallbackMaxMonthly = DAYS_PER_MONTH * TIMELINE_CREDITS_PER_PAGE;
    const months = searchMonthly > 0 ? credits / searchMonthly : Infinity;
    const runOut = Number.isFinite(months)
      ? new Date(nowMs + months * DAYS_PER_MONTH * 24 * 60 * 60 * 1000)
      : null;
    return { runsPerMonth, searchMonthly, fallbackMaxMonthly, months, runOut };
  }, [intervalHours, posts, credits, nowMs]);

  return (
    <section className={cn(R_CARD_CLASS, "p-5 sm:p-6")}>
      <div className="flex items-center gap-2">
        <Calculator className="size-4 text-r-pri" />
        <p className={R_EYEBROW_CLASS}>Simulator</p>
      </div>
      <h2 className={cn(DISPLAY, "mt-1 text-xl font-normal text-r-text")}>
        จำลองการใช้เครดิต
      </h2>

      <div className="mt-5 grid gap-5 sm:grid-cols-3">
        <div>
          <p className="text-xs font-semibold text-r-text-2/80">รอบซิงค์</p>
          <div className="mt-2 flex flex-wrap gap-1.5">
            {INTERVALS.map((h) => (
              <button
                key={h}
                type="button"
                onClick={() => setIntervalHours(h)}
                aria-pressed={intervalHours === h}
                className={cn(
                  "rounded-full border px-3 py-1 text-xs transition",
                  intervalHours === h
                    ? cn("border-transparent", R_PILL_ACTIVE_CLASS)
                    : "border-r-text-2/20 text-r-text-2/80 hover:border-r-pri/50"
                )}
              >
                ทุก {h} ชม.
              </button>
            ))}
          </div>
        </div>

        <label className="block">
          <span className="text-xs font-semibold text-r-text-2/80">
            โพสต์ใหม่ต่อวัน: {posts}
          </span>
          <input
            type="range"
            min={0}
            max={20}
            step={0.5}
            value={posts}
            onChange={(e) => setPosts(Number(e.target.value))}
            className="mt-3 w-full accent-r-pri"
          />
          {postsPerDay != null ? (
            <span className="mt-1 block text-[0.7rem] text-r-text-2/55">
              เฉลี่ยจริง 30 วัน ≈ {postsPerDay.toFixed(1)} โพสต์/วัน
            </span>
          ) : null}
        </label>

        <label className="block">
          <span className="text-xs font-semibold text-r-text-2/80">เครดิตตั้งต้น</span>
          <input
            type="number"
            min={0}
            step={10_000}
            value={credits}
            onChange={(e) => setCredits(Math.max(0, Number(e.target.value) || 0))}
            className="mt-2 w-full rounded-xl bg-white/[0.03] ring-1 ring-r-line ring-inset px-3 py-2 text-sm text-r-text outline-none focus:border-r-pri/70"
          />
          <span className="mt-1 block text-[0.7rem] text-r-text-2/55">
            ≈ {usd.format(credits / CREDITS_PER_USD)}
          </span>
        </label>
      </div>

      <dl className="mt-6 grid gap-3 sm:grid-cols-4">
        <div className="rounded-2xl bg-white/[0.03] ring-1 ring-r-line ring-inset p-4">
          <dt className="text-[0.7rem] text-r-text-2/60">รอบต่อเดือน</dt>
          <dd className="mt-1 text-lg font-semibold text-r-text">
            {fmt.format(result.runsPerMonth)}
          </dd>
        </div>
        <div className="rounded-2xl border border-r-pri/30 bg-r-pri/10 p-4">
          <dt className="text-[0.7rem] text-r-text-2/70">เครดิต/เดือน (ค้นหา)</dt>
          <dd className="mt-1 text-lg font-semibold text-r-text">
            {fmt.format(result.searchMonthly)}
          </dd>
          <dd className="text-[0.7rem] text-r-text-2/60">
            ≈ {usd.format(result.searchMonthly / CREDITS_PER_USD)}
          </dd>
        </div>
        <div className="rounded-2xl bg-white/[0.03] ring-1 ring-r-line ring-inset p-4">
          <dt className="text-[0.7rem] text-r-text-2/60">สำรองสูงสุด (ถ้าค้นหาพัง)</dt>
          <dd className="mt-1 text-lg font-semibold text-r-text/80">
            +{fmt.format(result.fallbackMaxMonthly)}
          </dd>
          <dd className="text-[0.7rem] text-r-text-2/60">
            แบบเดิมวันละครั้ง ตอนเที่ยงคืน · 300/ครั้ง
          </dd>
        </div>
        <div className="rounded-2xl bg-white/[0.03] ring-1 ring-r-line ring-inset p-4">
          <dt className="text-[0.7rem] text-r-text-2/60">ใช้ได้อีก</dt>
          <dd className="mt-1 text-lg font-semibold text-r-text">
            {lifetimeLabel(result.months)}
          </dd>
          {result.runOut ? (
            <dd className="text-[0.7rem] text-r-text-2/60">
              หมดราว{" "}
              {result.runOut.toLocaleDateString("en-GB", {
                dateStyle: "medium",
                timeZone: "Asia/Bangkok",
              })}
            </dd>
          ) : null}
        </div>
      </dl>

      <p className="mt-4 text-[0.7rem] leading-relaxed text-r-text-2/55">
        คิด 15 เครดิตต่อโพสต์ที่ได้ ขั้นต่ำ 15 เครดิตต่อรอบแม้ไม่มีโพสต์ใหม่ ·
        รวมรอบเที่ยงคืนที่ค้นย้อน 24 ชม. เพื่อเก็บโพสต์ตกหล่นแล้ว
      </p>
    </section>
  );
}
