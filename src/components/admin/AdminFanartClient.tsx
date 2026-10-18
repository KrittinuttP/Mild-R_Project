"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button";
import type { FanartSubmissionRow } from "@/lib/fanart-submissions-store";
import { cn } from "@/lib/utils";

type Tab = "pending" | "approved";

const TABS: { key: Tab; label: string }[] = [
  { key: "pending", label: "รออนุมัติ" },
  { key: "approved", label: "อนุมัติแล้ว" },
];

export function AdminFanartClient() {
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>("pending");
  const [items, setItems] = useState<FanartSubmissionRow[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busyId, setBusyId] = useState<string | null>(null);

  const load = useCallback(async (status: Tab) => {
    setError(null);
    const res = await fetch(`/api/fanart/admin/submissions?status=${status}`);
    if (res.status === 401) {
      setUnlocked(false);
      return;
    }
    const data = (await res.json()) as {
      submissions?: FanartSubmissionRow[];
      pendingCount?: number;
      error?: string;
    };
    if (!res.ok) {
      setError(data.error ?? "โหลดไม่สำเร็จ");
      return;
    }
    setItems(data.submissions ?? []);
    setPendingCount(data.pendingCount ?? 0);
    setUnlocked(true);
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/unlock");
        const data = (await res.json()) as { unlocked?: boolean };
        if (cancelled) return;
        if (!data.unlocked) {
          setUnlocked(false);
          return;
        }
        await load("pending");
      } catch {
        if (!cancelled) setError("โหลดไม่สำเร็จ");
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [load]);

  async function act(id: string, action: "approve" | "reject") {
    setBusyId(id);
    setError(null);
    try {
      const res = await fetch(`/api/fanart/admin/submissions/${id}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action }),
      });
      const data = (await res.json().catch(() => null)) as { error?: string } | null;
      if (!res.ok) {
        setError(data?.error ?? "อัปเดตไม่สำเร็จ");
        return;
      }
      await load(tab);
    } finally {
      setBusyId(null);
    }
  }

  if (checking) {
    return <p className="text-sm text-[#f3b8c4]">กำลังตรวจสิทธิ์…</p>;
  }

  if (!unlocked) {
    return (
      <p className="text-sm text-[#f7d7de]">
        ต้องปลดล็อกที่{" "}
        <Link href="/admin" className="text-[#f3b8c4] underline">
          ศูนย์แอดมิน
        </Link>{" "}
        ก่อน
      </p>
    );
  }

  return (
    <div className="relative mx-auto max-w-5xl">
      <header className="flex flex-wrap items-end justify-between gap-4">
        <div>
          <p className="text-xs tracking-[0.2em] text-[#f3b8c4] uppercase">Admin</p>
          <h1 className="mt-2 font-[family-name:var(--font-display)] text-3xl text-[#fff5f7]">
            อนุมัติแฟนอาร์ต
          </h1>
          <p className="mt-2 text-sm text-[#f7d7de]/75">
            รายการจาก{" "}
            <Link href="/upload/fanart" className="text-[#f3b8c4] underline">
              /upload/fanart
            </Link>
          </p>
        </div>
      </header>

      {error ? (
        <p className="mt-4 rounded-2xl bg-[#e85a7a]/15 px-4 py-3 text-sm" role="alert">
          {error}
        </p>
      ) : null}

      <div className="mt-6 flex gap-2">
        {TABS.map((item) => (
          <button
            key={item.key}
            type="button"
            onClick={() => {
              setTab(item.key);
              void load(item.key);
            }}
            className={cn(
              "min-h-11 rounded-full px-4 text-sm",
              tab === item.key ? "bg-[#e85a7a] text-[#140a0d]" : "bg-white/5 text-[#f7d7de]"
            )}
          >
            {item.label}
            {item.key === "pending" && pendingCount > 0 ? ` · ${pendingCount}` : ""}
          </button>
        ))}
      </div>

      {items.length === 0 ? (
        <p className="mt-8 text-sm text-[#f3b8c4]/80">
          {tab === "pending" ? "ยังไม่มีรูปที่รออนุมัติ" : "ยังไม่มีรูปที่อนุมัติแล้ว"}
        </p>
      ) : (
        <ul className="mt-6 grid gap-4 sm:grid-cols-2">
          {items.map((item) => (
            <li key={item.id} className="overflow-hidden rounded-3xl bg-[#1a0c12] ring-1 ring-white/10">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img src={item.art_url} alt="" className="aspect-[4/5] w-full object-contain bg-black/40" />
              <div className="space-y-2 p-4">
                <div className="flex items-center gap-2">
                  {item.avatar_url ? (
                    // eslint-disable-next-line @next/next/no-img-element
                    <img src={item.avatar_url} alt="" className="size-8 rounded-full object-cover" />
                  ) : null}
                  <p className="font-medium text-[#fff5f7]">{item.display_name}</p>
                </div>
                <p className="text-sm text-[#f3b8c4]/80">
                  {item.contact_channel === "x" ? "X" : "Discord"} · {item.contact_handle}
                </p>
                {tab === "pending" ? (
                  <div className="flex gap-2 pt-2">
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => act(item.id, "approve")}
                      className={cn(buttonVariants({ size: "sm" }), "bg-[#e85a7a] text-[#140a0d]")}
                    >
                      อนุมัติ
                    </button>
                    <button
                      type="button"
                      disabled={busyId === item.id}
                      onClick={() => act(item.id, "reject")}
                      className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-white/20 text-[#f7d7de]")}
                    >
                      ปฏิเสธ
                    </button>
                  </div>
                ) : (
                  <p className="text-xs text-[#f3b8c4]/70">อนุมัติแล้ว</p>
                )}
              </div>
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
