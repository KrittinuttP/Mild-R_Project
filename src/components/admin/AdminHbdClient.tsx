"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Cake, Check, Lock, X } from "lucide-react";

import { BackLink } from "@/components/layout/BackLink";

import { buttonVariants } from "@/components/ui/button";
import type { HbdSubmissionRow } from "@/lib/hbd-submissions-store";
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
      <p className="text-center text-sm tracking-[0.2em] text-[#9a7b5a] uppercase">
        Checking clearance…
      </p>
    );
  }

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-md border border-[#9a7b5a]/35 bg-[#12161a] p-6 text-center sm:p-8">
        <Lock className="mx-auto size-6 text-[#c46a7a]" />
        <h1 className={cn(DISPLAY, "mt-4 text-xl font-normal text-[#f4ebe3]")}>
          HBD approvals
        </h1>
        <p className="mt-3 text-sm text-[#c4b8a8]">
          ปลดล็อกที่ Control desk ก่อน แล้วกลับมาที่หน้านี้
        </p>
        <Link
          href="/admin"
          className={cn(
            buttonVariants({ size: "lg" }),
            "mt-6 inline-flex rounded-none border-transparent bg-[#a84d5f] text-[#f4ebe3] hover:bg-[#c46a7a]"
          )}
        >
          ไป Control desk
        </Link>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      <BackLink href="/admin" className="mb-6">
        Control desk
      </BackLink>

      <div className="mt-6 flex items-center gap-3">
        <Cake className="size-6 text-[#c46a7a]" />
        <div>
          <p className="text-[0.62rem] tracking-[0.24em] text-[#9a7b5a] uppercase">
            Birthday · 12.12.2026
          </p>
          <h1 className={cn(DISPLAY, "text-2xl font-normal text-[#f4ebe3]")}>
            HBD submissions
          </h1>
        </div>
      </div>

      <div className="mt-8 flex gap-2 border-b border-[#9a7b5a]/25">
        <button
          type="button"
          onClick={() => switchTab("pending")}
          className={cn(
            "px-3 py-2 text-sm transition",
            tab === "pending"
              ? "border-b-2 border-[#c46a7a] text-[#f4ebe3]"
              : "text-[#9a7b5a] hover:text-[#c4b8a8]"
          )}
        >
          Pending
          {pendingCount > 0 ? (
            <span className="ml-2 bg-[#a84d5f] px-1.5 py-0.5 text-[0.65rem] text-[#f4ebe3]">
              {pendingCount}
            </span>
          ) : null}
        </button>
        <button
          type="button"
          onClick={() => switchTab("approved")}
          className={cn(
            "px-3 py-2 text-sm transition",
            tab === "approved"
              ? "border-b-2 border-[#c46a7a] text-[#f4ebe3]"
              : "text-[#9a7b5a] hover:text-[#c4b8a8]"
          )}
        >
          Approved
        </button>
      </div>

      {error ? (
        <p className="mt-4 text-sm text-[#c46a7a]" role="alert">
          {error}
        </p>
      ) : null}

      {loading ? (
        <p className="mt-10 text-center text-sm text-[#9a7b5a]">Loading…</p>
      ) : items.length === 0 ? (
        <div className="mt-10 border border-dashed border-[#9a7b5a]/35 bg-[#12161a] px-6 py-14 text-center">
          <p className={cn(DISPLAY, "text-lg text-[#f4ebe3]")}>ยังไม่มีรายการ</p>
          <p className="mt-2 text-sm text-[#c4b8a8]">
            {tab === "pending"
              ? "รอฮันนี่ส่งการ์ดจาก /hbd/2026/upload"
              : "ยังไม่มีรายการที่อนุมัติ"}
          </p>
        </div>
      ) : (
        <ul className="mt-6 space-y-4">
          {items.map((item) => (
            <li
              key={item.id}
              className="border border-[#9a7b5a]/30 bg-[#12161a] p-4 sm:p-5"
            >
              <div className="flex flex-col gap-4 sm:flex-row">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.card_url}
                  alt=""
                  className="h-auto w-full max-w-[9rem] object-contain sm:max-w-[10rem]"
                />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-3">
                    {/* eslint-disable-next-line @next/next/no-img-element */}
                    <img
                      src={item.avatar_url || "/assets/hbd/default-avatar.png"}
                      alt=""
                      className="size-10 rounded-full object-cover"
                    />
                    <div>
                      <p className={cn(DISPLAY, "font-normal text-[#f4ebe3]")}>
                        {item.display_name}
                      </p>
                      <p className="text-xs text-[#9a7b5a]">
                        {item.contact_channel === "x" ? "X" : "Discord"} ·{" "}
                        {item.contact_handle}
                      </p>
                    </div>
                  </div>
                  {item.message ? (
                    <p className="mt-3 text-sm leading-relaxed text-[#c4b8a8]">
                      {item.message}
                    </p>
                  ) : (
                    <p className="mt-3 text-sm text-[#9a7b5a] italic">
                      (ไม่มีข้อความ)
                    </p>
                  )}
                  <p className="mt-2 text-[0.65rem] text-[#9a7b5a]/80">
                    {new Date(item.created_at).toLocaleString("th-TH")}
                  </p>

                  {tab === "pending" ? (
                    <div className="mt-4 flex flex-wrap gap-2">
                      <button
                        type="button"
                        disabled={actingId === item.id}
                        onClick={() => act(item.id, "approve")}
                        className={cn(
                          buttonVariants({ size: "sm" }),
                          "rounded-none border-transparent bg-[#6b9a7a] text-[#0a0c0e] hover:bg-[#8fbfa3]"
                        )}
                      >
                        <Check className="size-3.5" />
                        Approve
                      </button>
                      <button
                        type="button"
                        disabled={actingId === item.id}
                        onClick={() => act(item.id, "reject")}
                        className={cn(
                          buttonVariants({ variant: "outline", size: "sm" }),
                          "rounded-none border-[#a84d5f]/50 text-[#c46a7a]"
                        )}
                      >
                        <X className="size-3.5" />
                        Reject
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
