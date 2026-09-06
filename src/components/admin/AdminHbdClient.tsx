"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Cake,
  Check,
  CheckCircle2,
  Clock,
  ExternalLink,
  Lock,
  MessageSquare,
  Sparkles,
  X,
  XCircle,
} from "lucide-react";

import { BackLink } from "@/components/layout/BackLink";
import { buttonVariants } from "@/components/ui/button";
import type { HbdSubmissionRow } from "@/lib/hbd-submissions-store";
import {
  CTA_OUTLINE_CLASS,
  CTA_PRIMARY_CLASS,
  DISPLAY_H1_CLASS,
  DISPLAY_H2_CLASS,
  GLASS_CARD_CLASS,
  META_CLASS,
  META_MUTED_CLASS,
} from "@/lib/site-ui";
import { cn } from "@/lib/utils";

const DISPLAY = "font-[family-name:var(--font-display)]";

type Tab = "pending" | "approved";

export function AdminHbdClient() {
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>("pending");
  const [items, setItems] = useState<HbdSubmissionRow[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const load = useCallback(async (status: Tab) => {
    setLoading(true);
    setError(null);
    try {
      const res = await fetch(
        `/api/hbd/admin/submissions?status=${status}`
      );
      const data = (await res.json()) as {
        submissions?: HbdSubmissionRow[];
        pendingCount?: number;
        error?: string;
      };
      if (!res.ok) {
        if (res.status === 401) {
          setUnlocked(false);
          return;
        }
        setError(data.error ?? "โหลดไม่สำเร็จ");
        return;
      }
      setItems(data.submissions ?? []);
      setPendingCount(data.pendingCount ?? 0);
    } catch {
      setError("เครือข่ายมีปัญหา");
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/unlock");
        const data = (await res.json()) as { unlocked?: boolean };
        if (cancelled) return;
        const ok = Boolean(data.unlocked);
        setUnlocked(ok);
        if (ok) await load("pending");
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function switchTab(next: Tab) {
    setTab(next);
    await load(next);
  }

  async function act(id: string, action: "approve" | "reject") {
    setActingId(id);
    setError(null);
    try {
      const res = await fetch(`/api/hbd/admin/submissions/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "อัปเดตไม่สำเร็จ");
        return;
      }
      await load(tab);
    } catch {
      setError("เครือข่ายมีปัญหา");
    } finally {
      setActingId(null);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <span className="size-3 rounded-full bg-[#e85a7a] animate-ping" />
        <p className="text-sm font-medium tracking-[0.2em] text-[#f3b8c4]/70 uppercase">
          Checking clearance…
        </p>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-md pt-8">
        <div className="relative overflow-hidden rounded-3xl border border-[#f3b8c4]/15 bg-gradient-to-b from-[#220e18]/95 via-[#1a0c12]/90 to-[#140a0d] p-7 text-center shadow-[0_20px_50px_rgba(0,0,0,0.6)] sm:p-9">
          <div className="mx-auto flex size-14 items-center justify-center rounded-2xl border border-[#e85a7a]/40 bg-[#e85a7a]/15 text-[#e85a7a] shadow-[0_0_20px_rgba(232,90,122,0.3)]">
            <Lock className="size-6" />
          </div>
          <h1 className={cn(DISPLAY, "mt-4 text-2xl font-normal text-[#fff5f7]")}>
            HBD Approvals
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#f7d7de]/80">
            หน้านี้ต้องการการยืนยันตัวตน กรุณาปลดล็อกที่ Control desk ก่อน
          </p>
          <Link
            href="/admin"
            className={cn(
              buttonVariants({ size: "lg" }),
              CTA_PRIMARY_CLASS,
              "mt-6 inline-flex w-full items-center justify-center font-semibold"
            )}
          >
            ไปที่ Control Desk
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* 🌟 Header */}
      <div className="border-b border-[#f3b8c4]/12 pb-6">
        <BackLink href="/admin" className="mb-4">
          Control desk
        </BackLink>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <div className="flex items-center gap-2">
              <Cake className="size-4 text-[#e85a7a]" />
              <p className={META_CLASS}>Birthday · 12.12.2026</p>
            </div>
            <h1 className={cn(DISPLAY, "mt-1.5 text-3xl font-normal text-[#fff5f7] sm:text-4xl")}>
              HBD Submissions
            </h1>
          </div>

          <Link
            href="/hbd/2026/upload"
            target="_blank"
            className={cn(
              buttonVariants({ variant: "outline", size: "sm" }),
              CTA_OUTLINE_CLASS,
              "inline-flex items-center gap-1.5 text-xs"
            )}
          >
            <span>ดูหน้าอัปโหลด</span>
            <ExternalLink className="size-3.5" />
          </Link>
        </div>
      </div>

      {/* 🏷️ Segmented Pill Tabs */}
      <div className="mt-6 flex items-center gap-2 rounded-2xl border border-[#f3b8c4]/15 bg-[#14080e]/80 p-1.5 shadow-inner">
        <button
          type="button"
          onClick={() => switchTab("pending")}
          className={cn(
            "flex-1 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition sm:text-sm",
            tab === "pending"
              ? "border border-[#e85a7a]/60 bg-[#e85a7a]/25 text-[#fff5f7] shadow-[0_0_16px_rgba(232,90,122,0.3)]"
              : "text-[#f3b8c4]/65 hover:text-[#fff5f7]"
          )}
        >
          <span className="inline-flex items-center gap-1.5">
            <span>รออนุมัติ (Pending)</span>
            {pendingCount > 0 ? (
              <span className="rounded-full bg-[#e85a7a] px-2 py-0.2 text-[0.68rem] font-bold text-white shadow-sm">
                {pendingCount}
              </span>
            ) : null}
          </span>
        </button>
        <button
          type="button"
          onClick={() => switchTab("approved")}
          className={cn(
            "flex-1 rounded-xl px-4 py-2 text-xs font-semibold tracking-wide transition sm:text-sm",
            tab === "approved"
              ? "border border-[#e85a7a]/60 bg-[#e85a7a]/25 text-[#fff5f7] shadow-[0_0_16px_rgba(232,90,122,0.3)]"
              : "text-[#f3b8c4]/65 hover:text-[#fff5f7]"
          )}
        >
          อนุมัติแล้ว (Approved)
        </button>
      </div>

      {error ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200">
          <span className="size-1.5 rounded-full bg-red-400" />
          {error}
        </div>
      ) : null}

      {/* 📋 Submissions List */}
      {loading ? (
        <div className="flex min-h-[30vh] flex-col items-center justify-center gap-3">
          <span className="size-2.5 rounded-full bg-[#e85a7a] animate-ping" />
          <p className="text-xs tracking-widest text-[#f3b8c4]/60 uppercase">
            กำลังโหลดข้อมูล…
          </p>
        </div>
      ) : items.length === 0 ? (
        <div className="mt-8 rounded-3xl border border-dashed border-[#f3b8c4]/20 bg-[#1a0c12]/40 px-6 py-16 text-center">
          <div className="mx-auto flex size-12 items-center justify-center rounded-2xl border border-[#f3b8c4]/15 bg-[#14080e] text-[#f3b8c4]/50">
            <Cake className="size-6" />
          </div>
          <p className={cn(DISPLAY, "mt-4 text-lg font-normal text-[#fff5f7]")}>
            ยังไม่มีรายการในสถานะนี้
          </p>
          <p className="mt-1.5 text-xs text-[#f3b8c4]/65">
            {tab === "pending"
              ? "รอแฟนคลับส่งการ์ดคำอวยพรจากหน้า /hbd/2026/upload"
              : "ยังไม่มีรายการที่ได้รับการอนุมัติ"}
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="group overflow-hidden rounded-3xl border border-[#f3b8c4]/15 bg-gradient-to-b from-[#1f0d16]/85 via-[#1a0c12]/80 to-[#14080e]/90 p-5 shadow-lg transition hover:border-[#e85a7a]/40"
            >
              <div className="flex flex-col gap-5 sm:flex-row">
                {/* 🖼️ Card Preview */}
                <div className="relative shrink-0 overflow-hidden rounded-2xl border border-[#f3b8c4]/15 bg-[#12070c] sm:w-44">
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={item.card_url}
                    alt=""
                    className="h-auto w-full object-contain transition duration-500 group-hover:scale-105"
                  />
                </div>

                {/* 📝 Content & User Info */}
                <div className="flex min-w-0 flex-1 flex-col justify-between">
                  <div>
                    {/* User Profile Bar */}
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={item.avatar_url || "/assets/hbd/default-avatar.png"}
                        alt=""
                        className="size-11 rounded-full border border-[#e85a7a]/40 object-cover shadow-sm"
                      />
                      <div className="min-w-0">
                        <p className={cn(DISPLAY, "truncate text-base font-normal text-[#fff5f7]")}>
                          {item.display_name}
                        </p>
                        <p className="text-xs text-[#e85a7a]">
                          {item.contact_channel === "x" ? "X (Twitter)" : "Discord"} ·{" "}
                          <span className="font-mono text-[#f3b8c4]/80">{item.contact_handle}</span>
                        </p>
                      </div>
                    </div>

                    {/* Message */}
                    <div className="mt-3.5 rounded-2xl border border-[#f3b8c4]/10 bg-[#12080c]/80 p-3.5">
                      {item.message ? (
                        <p className="text-xs leading-relaxed text-[#f7d7de]/90 sm:text-sm">
                          {item.message}
                        </p>
                      ) : (
                        <p className="text-xs italic text-[#f3b8c4]/45">
                          (ไม่มีข้อความคำอวยพรเพิ่มเติม)
                        </p>
                      )}
                    </div>

                    <div className="mt-2.5 flex items-center gap-1.5 text-[0.68rem] text-[#f3b8c4]/50">
                      <Clock className="size-3 text-[#e85a7a]" />
                      <span>{new Date(item.created_at).toLocaleString("th-TH")}</span>
                    </div>
                  </div>

                  {/* 🔘 Action Buttons (Only in Pending tab) */}
                  {tab === "pending" ? (
                    <div className="mt-4 flex flex-wrap items-center gap-2.5 border-t border-[#f3b8c4]/10 pt-3.5">
                      <button
                        type="button"
                        disabled={actingId === item.id}
                        onClick={() => act(item.id, "approve")}
                        className={cn(
                          buttonVariants({ size: "sm" }),
                          "inline-flex items-center gap-1.5 rounded-xl border border-emerald-500/50 bg-emerald-500/20 px-3.5 text-xs font-semibold text-emerald-200 shadow-sm transition hover:bg-emerald-500/30 hover:text-white"
                        )}
                      >
                        <CheckCircle2 className="size-3.5" />
                        อนุมัติ (Approve)
                      </button>
                      <button
                        type="button"
                        disabled={actingId === item.id}
                        onClick={() => act(item.id, "reject")}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "inline-flex items-center gap-1.5 rounded-xl border-red-500/40 bg-red-500/10 px-3.5 text-xs text-red-200 transition hover:bg-red-500/20 hover:text-white"
                        )}
                      >
                        <XCircle className="size-3.5" />
                        ปฏิเสธ (Reject)
                      </button>
                    </div>
                  ) : null}
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
