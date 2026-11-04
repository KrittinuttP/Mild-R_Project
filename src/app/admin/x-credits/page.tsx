import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowUpRight, Coins, Wallet } from "lucide-react";

import { XCreditSimulator } from "@/components/admin/XCreditSimulator";
import { BackLink } from "@/components/layout/BackLink";
import {
  R_CARD_CLASS,
  R_CTA_OUTLINE_CLASS,
  R_CTA_PRIMARY_CLASS,
  R_EYEBROW_CLASS,
  R_H1_CLASS,
} from "@/lib/site-ui";
import { isSiteAdminUnlocked } from "@/lib/site-admin-auth";
import { cn } from "@/lib/utils";
import { loadXCreditBalance, loadXCreditUsage } from "@/lib/x-credits";
import {
  CREDITS_PER_USD,
  TWITTERAPI_PRICING_URL,
  TWITTERAPI_RECHARGE_URL,
} from "@/lib/x-credits-pricing";

export const metadata: Metadata = {
  title: "Admin · X API Credits",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

const LOW_BALANCE_CREDITS = 20_000;

const fmt = new Intl.NumberFormat("th-TH", { maximumFractionDigits: 0 });
const usd = new Intl.NumberFormat("en-US", {
  style: "currency",
  currency: "USD",
  maximumFractionDigits: 3,
});

function bangkokTime(iso: string) {
  return (new Date(iso).toLocaleString("en-GB", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  })).replace("Sept", "Sep");
}

export default async function AdminXCreditsPage() {
  if (!(await isSiteAdminUnlocked())) redirect("/admin");

  const [balance, usage] = await Promise.all([
    loadXCreditBalance(),
    loadXCreditUsage(),
  ]);
  const credits = balance.ok ? balance.credits : null;
  const low = credits != null && credits < LOW_BALANCE_CREDITS;

  const usageCards = [
    { label: "วันนี้", value: usage?.today },
    { label: "7 วัน", value: usage?.last7d },
    { label: "30 วัน", value: usage?.last30d },
    { label: "ทั้งหมด", value: usage?.allTime },
  ];

  return (
    <main className="relative min-h-dvh overflow-x-clip bg-r-bg px-4 py-10 text-r-text sm:px-8 sm:py-14">
      <div className="pointer-events-none absolute -top-24 left-1/2 size-96 -translate-x-1/2 bg-[radial-gradient(circle,rgba(242,67,125,0.12),transparent_70%)]" />

      <div className="relative mx-auto max-w-4xl space-y-8">
        <header className="border-b border-r-text-2/12 pb-6">
          <BackLink href="/admin">กลับ Control Desk</BackLink>
          <div className="mt-5 flex items-center gap-2">
            <Coins className="size-4 text-r-pri" />
            <p className={R_EYEBROW_CLASS}>twitterapi.io · X feed sync</p>
          </div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <h1 className={R_H1_CLASS}>X API Credits</h1>
            <div className="flex flex-wrap gap-2">
              <a
                href={TWITTERAPI_PRICING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  R_CTA_OUTLINE_CLASS,
                  "h-9 px-4 text-sm",
                  "inline-flex items-center gap-1.5"
                )}
              >
                ราคา
                <ArrowUpRight className="size-3.5" />
              </a>
              <a
                href={TWITTERAPI_RECHARGE_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  R_CTA_PRIMARY_CLASS,
                  "h-9 px-4 text-sm",
                  "inline-flex items-center gap-1.5 font-semibold"
                )}
              >
                <Wallet className="size-3.5" />
                เติมเครดิต
                <ArrowUpRight className="size-3.5" />
              </a>
            </div>
          </div>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-r-text-2/80">
            ซิงค์โพสต์ X ทุก 1 ชั่วโมงด้วยการค้นหา (จ่ายเฉพาะโพสต์ใหม่) · ถ้าค้นหาพัง
            จะดึงแบบเดิมสำรองได้วันละครั้งตอนเที่ยงคืน
          </p>
        </header>

        <section
          className={cn(
            R_CARD_CLASS,
            "p-5 sm:p-6",
            low && "border-r-pri/50 bg-r-pri/10"
          )}
        >
          <p className="text-xs font-medium text-r-text-2">เครดิตคงเหลือ</p>
          {balance.ok ? (
            <>
              <p className="mt-2 text-4xl font-semibold text-r-text sm:text-5xl">
                {credits != null ? fmt.format(credits) : "—"}
              </p>
              <p className="mt-1 text-sm text-r-text-2/70">
                {credits != null ? `≈ ${usd.format(credits / CREDITS_PER_USD)} · ` : ""}
                เช็คเมื่อ {bangkokTime(balance.checkedAt)}
              </p>
              <p className="mt-1 text-xs text-r-text-2/55">
                เติมเอง {fmt.format(balance.recharge ?? 0)} (ไม่หมดอายุ) · โบนัส{" "}
                {fmt.format(balance.bonus ?? 0)} (หมดอายุใน 30 วันหลังเติม)
              </p>
              {low ? (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-r-pri/40 bg-r-pri/15 px-3 py-1.5 text-xs text-r-text">
                  <AlertTriangle className="size-3.5 text-r-pri" />
                  เครดิตใกล้หมด ควรเติมเพิ่ม
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-2 flex items-start gap-2 text-sm text-r-text-2/80">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-r-pri" />
              <span>ดึงยอดคงเหลือไม่ได้: {balance.error}</span>
            </p>
          )}
        </section>

        <section>
          <p className="text-xs font-medium text-r-text-2">ใช้ไปแล้ว (ประมาณจาก log การซิงค์)</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {usageCards.map((card) => (
              <div key={card.label} className={cn(R_CARD_CLASS, "p-4")}>
                <dt className="text-xs text-r-text-2/65">{card.label}</dt>
                <dd className="mt-1 text-xl font-semibold text-r-text">
                  {card.value != null ? fmt.format(card.value) : "—"}
                </dd>
                {card.value != null ? (
                  <dd className="text-[0.7rem] text-r-text-2/55">
                    ≈ {usd.format(card.value / CREDITS_PER_USD)}
                  </dd>
                ) : null}
              </div>
            ))}
          </dl>
          {usage?.firstRunAt ? (
            <p className="mt-2 text-[0.7rem] text-r-text-2/55">
              นับตั้งแต่ {bangkokTime(usage.firstRunAt)} · 30 วันล่าสุด {fmt.format(usage.runs30d)} รอบ
            </p>
          ) : null}
        </section>

        <XCreditSimulator balance={credits} postsPerDay={usage?.postsPerDay30d ?? null} />

        {usage && usage.recent.length > 0 ? (
          <section className={cn(R_CARD_CLASS, "overflow-hidden")}>
            <p className="px-5 pt-5 text-xs font-medium text-r-text-2">รอบซิงค์ล่าสุด</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="text-xs text-r-text-2/60">
                  <tr className="border-b border-r-text-2/10">
                    <th className="px-5 py-2 font-medium">เวลา</th>
                    <th className="px-3 py-2 font-medium">วิธี</th>
                    <th className="px-3 py-2 text-right font-medium">โพสต์ใหม่</th>
                    <th className="px-5 py-2 text-right font-medium">เครดิต</th>
                  </tr>
                </thead>
                <tbody>
                  {usage.recent.map((run) => (
                    <tr
                      key={`${run.createdAt}-${run.source}`}
                      className="border-b border-r-text-2/5 last:border-0"
                    >
                      <td className="px-5 py-2 text-r-text-2/85">
                        {bangkokTime(run.createdAt)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[0.7rem]",
                            run.mode === "search"
                              ? "border-r-pri/40 bg-r-pri/12 text-r-text-2"
                              : "border-r-text-2/20 text-r-text-2/70"
                          )}
                        >
                          {run.source === "edge-x-backfill"
                            ? "ย้อนหลัง"
                            : run.mode === "search"
                              ? "ค้นหา"
                              : "แบบเดิม"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-r-text-2/85">
                        {run.newPosts ?? "—"}
                      </td>
                      <td className="px-5 py-2 text-right font-medium text-r-text">
                        {run.estimated ? "~" : ""}
                        {fmt.format(run.credits)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-5 py-3 text-[0.7rem] text-r-text-2/55">
              ~ = รอบก่อนเริ่มบันทึกเครดิต ประมาณจากจำนวนโพสต์ที่ดึง
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
