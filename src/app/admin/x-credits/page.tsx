import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { AlertTriangle, ArrowUpRight, Coins, Wallet } from "lucide-react";

import { XCreditSimulator } from "@/components/admin/XCreditSimulator";
import { BackLink } from "@/components/layout/BackLink";
import { buttonVariants } from "@/components/ui/button";
import {
  CTA_OUTLINE_CLASS,
  CTA_PRIMARY_CLASS,
  DISPLAY_H1_CLASS,
  GLASS_CARD_CLASS,
  META_CLASS,
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
  return new Date(iso).toLocaleString("th-TH", {
    timeZone: "Asia/Bangkok",
    dateStyle: "medium",
    timeStyle: "short",
  });
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
    <main className="relative min-h-dvh bg-[#0c0709] px-4 py-10 text-[#fff5f7] sm:px-8 sm:py-14">
      <div className="pointer-events-none absolute -top-24 left-1/2 size-96 -translate-x-1/2 bg-[radial-gradient(circle,rgba(232,90,122,0.12),transparent_70%)]" />

      <div className="relative mx-auto max-w-4xl space-y-8">
        <header className="border-b border-[#f3b8c4]/12 pb-6">
          <BackLink href="/admin">กลับ Control Desk</BackLink>
          <div className="mt-5 flex items-center gap-2">
            <Coins className="size-4 text-[#e85a7a]" />
            <p className={META_CLASS}>twitterapi.io · X feed sync</p>
          </div>
          <div className="mt-2 flex flex-wrap items-end justify-between gap-4">
            <h1 className={DISPLAY_H1_CLASS}>X API Credits</h1>
            <div className="flex flex-wrap gap-2">
              <a
                href={TWITTERAPI_PRICING_URL}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  buttonVariants({ variant: "outline", size: "sm" }),
                  CTA_OUTLINE_CLASS,
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
                  buttonVariants({ size: "sm" }),
                  CTA_PRIMARY_CLASS,
                  "inline-flex items-center gap-1.5 font-semibold"
                )}
              >
                <Wallet className="size-3.5" />
                เติมเครดิต
                <ArrowUpRight className="size-3.5" />
              </a>
            </div>
          </div>
          <p className="mt-2 max-w-xl text-sm leading-relaxed text-[#f7d7de]/80">
            ซิงค์โพสต์ X ทุก 1 ชั่วโมงด้วยการค้นหา (จ่ายเฉพาะโพสต์ใหม่) · ถ้าค้นหาพัง
            จะดึงแบบเดิมสำรองได้วันละครั้งตอนเที่ยงคืน
          </p>
        </header>

        <section
          className={cn(
            GLASS_CARD_CLASS,
            "p-5 sm:p-6",
            low && "border-[#e85a7a]/50 bg-[#e85a7a]/10"
          )}
        >
          <p className={META_CLASS}>เครดิตคงเหลือ</p>
          {balance.ok ? (
            <>
              <p className="mt-2 text-4xl font-semibold text-[#fff5f7] sm:text-5xl">
                {credits != null ? fmt.format(credits) : "—"}
              </p>
              <p className="mt-1 text-sm text-[#f3b8c4]/70">
                {credits != null ? `≈ ${usd.format(credits / CREDITS_PER_USD)} · ` : ""}
                เช็คเมื่อ {bangkokTime(balance.checkedAt)}
              </p>
              <p className="mt-1 text-xs text-[#f3b8c4]/55">
                เติมเอง {fmt.format(balance.recharge ?? 0)} (ไม่หมดอายุ) · โบนัส{" "}
                {fmt.format(balance.bonus ?? 0)} (หมดอายุใน 30 วันหลังเติม)
              </p>
              {low ? (
                <p className="mt-3 inline-flex items-center gap-1.5 rounded-xl border border-[#e85a7a]/40 bg-[#e85a7a]/15 px-3 py-1.5 text-xs text-[#fff5f7]">
                  <AlertTriangle className="size-3.5 text-[#e85a7a]" />
                  เครดิตใกล้หมด ควรเติมเพิ่ม
                </p>
              ) : null}
            </>
          ) : (
            <p className="mt-2 flex items-start gap-2 text-sm text-[#f7d7de]/80">
              <AlertTriangle className="mt-0.5 size-4 shrink-0 text-[#e85a7a]" />
              <span>ดึงยอดคงเหลือไม่ได้: {balance.error}</span>
            </p>
          )}
        </section>

        <section>
          <p className={META_CLASS}>ใช้ไปแล้ว (ประมาณจาก log การซิงค์)</p>
          <dl className="mt-3 grid grid-cols-2 gap-3 sm:grid-cols-4">
            {usageCards.map((card) => (
              <div key={card.label} className={cn(GLASS_CARD_CLASS, "p-4")}>
                <dt className="text-xs text-[#f3b8c4]/65">{card.label}</dt>
                <dd className="mt-1 text-xl font-semibold text-[#fff5f7]">
                  {card.value != null ? fmt.format(card.value) : "—"}
                </dd>
                {card.value != null ? (
                  <dd className="text-[0.7rem] text-[#f3b8c4]/55">
                    ≈ {usd.format(card.value / CREDITS_PER_USD)}
                  </dd>
                ) : null}
              </div>
            ))}
          </dl>
          {usage?.firstRunAt ? (
            <p className="mt-2 text-[0.7rem] text-[#f3b8c4]/55">
              นับตั้งแต่ {bangkokTime(usage.firstRunAt)} · 30 วันล่าสุด {fmt.format(usage.runs30d)} รอบ
            </p>
          ) : null}
        </section>

        <XCreditSimulator balance={credits} postsPerDay={usage?.postsPerDay30d ?? null} />

        {usage && usage.recent.length > 0 ? (
          <section className={cn(GLASS_CARD_CLASS, "overflow-hidden")}>
            <p className={cn(META_CLASS, "px-5 pt-5")}>รอบซิงค์ล่าสุด</p>
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[32rem] text-left text-sm">
                <thead className="text-xs text-[#f3b8c4]/60">
                  <tr className="border-b border-[#f3b8c4]/10">
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
                      className="border-b border-[#f3b8c4]/5 last:border-0"
                    >
                      <td className="px-5 py-2 text-[#f7d7de]/85">
                        {bangkokTime(run.createdAt)}
                      </td>
                      <td className="px-3 py-2">
                        <span
                          className={cn(
                            "rounded-full border px-2 py-0.5 text-[0.7rem]",
                            run.mode === "search"
                              ? "border-[#e85a7a]/40 bg-[#e85a7a]/12 text-[#f3b8c4]"
                              : "border-[#f3b8c4]/20 text-[#f3b8c4]/70"
                          )}
                        >
                          {run.source === "edge-x-backfill"
                            ? "ย้อนหลัง"
                            : run.mode === "search"
                              ? "ค้นหา"
                              : "แบบเดิม"}
                        </span>
                      </td>
                      <td className="px-3 py-2 text-right text-[#f7d7de]/85">
                        {run.newPosts ?? "—"}
                      </td>
                      <td className="px-5 py-2 text-right font-medium text-[#fff5f7]">
                        {run.estimated ? "~" : ""}
                        {fmt.format(run.credits)}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="px-5 py-3 text-[0.7rem] text-[#f3b8c4]/55">
              ~ = รอบก่อนเริ่มบันทึกเครดิต ประมาณจากจำนวนโพสต์ที่ดึง
            </p>
          </section>
        ) : null}
      </div>
    </main>
  );
}
