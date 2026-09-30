"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Cake,
  Check,
  CheckCircle2,
  Clock,
  Eye,
  EyeOff,
  ExternalLink,
  Lock,
  MessageSquare,
  Sparkles,
  Trash2,
  X,
  XCircle,
} from "lucide-react";

import { BackLink } from "@/components/layout/BackLink";
import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
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

type Tab = "pending" | "approved" | "hidden";
type ItemAction = "approve" | "reject" | "hide" | "unhide";

const TABS: { key: Tab; label: string }[] = [
  { key: "pending", label: "รออนุมัติ" },
  { key: "approved", label: "อนุมัติแล้ว" },
  { key: "hidden", label: "ซ่อน / ปฏิเสธ" },
];

const EMPTY_HINT: Record<Tab, string> = {
  pending: "รอแฟนคลับส่งการ์ดคำอวยพรจากหน้า /hbd/2026/upload",
  approved: "ยังไม่มีรายการที่ได้รับการอนุมัติ",
  hidden: "รายการที่ซ่อนหรือปฏิเสธจะมาอยู่ที่นี่ กดแสดงอีกครั้งได้",
};

const ACTION_BUTTON_CLASS =
  "inline-flex items-center gap-1.5 rounded-xl px-3.5 text-xs transition disabled:opacity-50";

export function AdminHbdClient() {
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>("pending");
  const [items, setItems] = useState<HbdSubmissionRow[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [loading, setLoading] = useState(false);
  const [actingId, setActingId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [deleteTarget, setDeleteTarget] = useState<HbdSubmissionRow | null>(null);

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

  async function remove(item: HbdSubmissionRow) {
    setActingId(item.id);
    setError(null);
    try {
      const res = await fetch(`/api/hbd/admin/submissions/${item.id}`, {
        method: "DELETE",
      });
      const data = (await res.json()) as { error?: string };
      if (!res.ok) {
        setError(data.error ?? "ลบไม่สำเร็จ");
        return;
      }
      setDeleteTarget(null);
      await load(tab);
    } catch {
      setError("เครือข่ายมีปัญหา");
    } finally {
      setActingId(null);
    }
  }

  async function act(id: string, action: ItemAction) {
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
      <div className="mt-6 flex items-center gap-1.5 rounded-2xl border border-[#f3b8c4]/15 bg-[#14080e]/80 p-1.5 shadow-inner sm:gap-2">
        {TABS.map(({ key, label }) => (
          <button
            key={key}
            type="button"
            onClick={() => switchTab(key)}
            className={cn(
              "flex-1 rounded-xl px-2 py-2 text-xs font-semibold tracking-wide transition sm:px-4 sm:text-sm",
              tab === key
                ? "border border-[#e85a7a]/60 bg-[#e85a7a]/25 text-[#fff5f7] shadow-[0_0_16px_rgba(232,90,122,0.3)]"
                : "text-[#f3b8c4]/65 hover:text-[#fff5f7]"
            )}
          >
            <span className="inline-flex items-center gap-1.5">
              <span>{label}</span>
              {key === "pending" && pendingCount > 0 ? (
                <span className="rounded-full bg-[#e85a7a] px-2 py-0.2 text-[0.68rem] font-bold text-white shadow-sm">
                  {pendingCount}
                </span>
              ) : null}
            </span>
          </button>
        ))}
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
          <p className="mt-1.5 text-xs text-[#f3b8c4]/65">{EMPTY_HINT[tab]}</p>
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

                    <div className="mt-2.5 flex flex-wrap items-center gap-1.5 text-[0.68rem] text-[#f3b8c4]/50">
                      <Clock className="size-3 text-[#e85a7a]" />
                      <span>{new Date(item.created_at).toLocaleString("th-TH")}</span>
                      {tab === "hidden" ? (
                        <span
                          className={cn(
                            "ml-1 rounded-full border px-2 py-0.5 font-semibold",
                            item.status === "rejected"
                              ? "border-red-500/40 bg-red-500/10 text-red-200"
                              : "border-[#f3b8c4]/25 bg-[#f3b8c4]/10 text-[#f3b8c4]/80"
                          )}
                        >
                          {item.status === "rejected" ? "ปฏิเสธแล้ว" : "ซ่อนอยู่"}
                        </span>
                      ) : null}
                    </div>
                  </div>

                  {/* 🔘 Action Buttons */}
                  <div className="mt-4 flex flex-wrap items-center gap-2.5 border-t border-[#f3b8c4]/10 pt-3.5">
                    {tab === "pending" ? (
                      <>
                        <button
                          type="button"
                          disabled={actingId === item.id}
                          onClick={() => act(item.id, "approve")}
                          className={cn(
                            buttonVariants({ size: "sm" }),
                            ACTION_BUTTON_CLASS,
                            "border border-emerald-500/50 bg-emerald-500/20 font-semibold text-emerald-200 shadow-sm hover:bg-emerald-500/30 hover:text-white"
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
                            ACTION_BUTTON_CLASS,
                            "border-red-500/40 bg-red-500/10 text-red-200 hover:bg-red-500/20 hover:text-white"
                          )}
                        >
                          <XCircle className="size-3.5" />
                          ปฏิเสธ (Reject)
                        </button>
                      </>
                    ) : tab === "approved" ? (
                      <button
                        type="button"
                        disabled={actingId === item.id}
                        onClick={() => act(item.id, "hide")}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          ACTION_BUTTON_CLASS,
                          "border-[#f3b8c4]/30 bg-[#f3b8c4]/5 text-[#f7d7de] hover:bg-[#f3b8c4]/15 hover:text-white"
                        )}
                      >
                        <EyeOff className="size-3.5" />
                        ซ่อน (Hide)
                      </button>
                    ) : (
                      <button
                        type="button"
                        disabled={actingId === item.id}
                        onClick={() => act(item.id, "unhide")}
                        className={cn(
                          buttonVariants({ size: "sm" }),
                          ACTION_BUTTON_CLASS,
                          "border border-emerald-500/50 bg-emerald-500/20 font-semibold text-emerald-200 shadow-sm hover:bg-emerald-500/30 hover:text-white"
                        )}
                      >
                        <Eye className="size-3.5" />
                        แสดงอีกครั้ง
                      </button>
                    )}
                    <button
                      type="button"
                      disabled={actingId === item.id}
                      onClick={() => setDeleteTarget(item)}
                      className={cn(
                        buttonVariants({ variant: "ghost", size: "sm" }),
                        ACTION_BUTTON_CLASS,
                        "ml-auto text-red-300/80 hover:bg-red-500/15 hover:text-red-200"
                      )}
                    >
                      <Trash2 className="size-3.5" />
                      ลบ
                    </button>
                  </div>
                </div>
              </div>
            </li>
          ))}
        </ul>
      )}

      {/* 🗑️ Delete confirmation */}
      <Dialog
        open={deleteTarget !== null}
        onOpenChange={(open) => {
          if (!open && actingId === null) setDeleteTarget(null);
        }}
      >
        <DialogContent className="border-[#f3b8c4]/15 bg-[#1a0c12] text-[#fff5f7]">
          <DialogHeader>
            <DialogTitle className={cn(DISPLAY, "text-lg font-normal")}>
              ลบคำอวยพรนี้ถาวร?
            </DialogTitle>
            <DialogDescription className="text-[#f7d7de]/75">
              การ์ดของ{" "}
              <span className="font-semibold text-[#fff5f7]">
                {deleteTarget?.display_name}
              </span>{" "}
              และรูปที่อัปโหลดจะถูกลบออกจากระบบ กู้คืนไม่ได้ — ถ้าแค่ไม่อยากให้แสดง ใช้ “ซ่อน” แทน
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="border-[#f3b8c4]/10 bg-[#14080e]/60">
            <button
              type="button"
              disabled={actingId !== null}
              onClick={() => setDeleteTarget(null)}
              className={cn(
                buttonVariants({ variant: "outline", size: "sm" }),
                ACTION_BUTTON_CLASS,
                "border-[#f3b8c4]/25 bg-transparent text-[#f7d7de] hover:bg-[#f3b8c4]/10"
              )}
            >
              ยกเลิก
            </button>
            <button
              type="button"
              disabled={actingId !== null}
              onClick={() => deleteTarget && remove(deleteTarget)}
              className={cn(
                buttonVariants({ size: "sm" }),
                ACTION_BUTTON_CLASS,
                "border border-red-500/60 bg-red-500/25 font-semibold text-red-100 hover:bg-red-500/40 hover:text-white"
              )}
            >
              <Trash2 className="size-3.5" />
              {actingId !== null ? "กำลังลบ…" : "ลบถาวร"}
            </button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </div>
  );
}
