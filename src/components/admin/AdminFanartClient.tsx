"use client";

import { useCallback, useEffect, useState } from "react";
import Link from "next/link";
import { Check, Download, X } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import type { FanartSubmissionRow } from "@/lib/fanart-submissions-store";
import { formatMegabytes } from "@/lib/fanart-upload";
import { cn } from "@/lib/utils";

type Tab = "pending" | "approved";
type Action = "approve" | "reject";

const TABS: { key: Tab; label: string }[] = [
  { key: "pending", label: "รออนุมัติ" },
  { key: "approved", label: "อนุมัติแล้ว" },
];

const DATE_TIME = new Intl.DateTimeFormat("th-TH", {
  day: "numeric",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
  timeZone: "Asia/Bangkok",
});

/** Paper sizes at 250 dpi: long edge × short edge in pixels. */
const PRINT_SIZES: [string, number, number][] = [
  ["A3", 4134, 2923],
  ["A4", 2923, 2067],
  ["A5", 2067, 1457],
  ["A6", 1457, 1033],
];

function printFit(width: number | null, height: number | null): string | null {
  if (!width || !height) return null;
  const long = Math.max(width, height);
  const short = Math.min(width, height);
  const fit = PRINT_SIZES.find(([, l, s]) => long >= l && short >= s);
  return fit ? `พิมพ์ได้ถึง ${fit[0]}` : "เล็กกว่า A6";
}

const TYPE_LABEL: Record<string, string> = {
  "image/jpeg": "JPEG",
  "image/png": "PNG",
  "image/webp": "WebP",
};

type Batch = { key: string; first: FanartSubmissionRow; items: FanartSubmissionRow[] };

/** Pictures sent together share a batch id; older submissions are one picture each. */
function groupByBatch(rows: FanartSubmissionRow[]): Batch[] {
  const batches = new Map<string, Batch>();
  for (const row of rows) {
    const key = row.batch_id ?? row.id;
    const batch = batches.get(key);
    if (batch) batch.items.push(row);
    else batches.set(key, { key, first: row, items: [row] });
  }
  for (const batch of batches.values()) {
    batch.items.sort((a, b) => (a.original_path ?? "").localeCompare(b.original_path ?? ""));
    batch.first = batch.items[0];
  }
  return [...batches.values()];
}

/** WebP opens in fewer print shops: convert in the browser to PNG (same pixels). */
async function saveAsPng(url: string, fileName: string) {
  const blob = await fetch(url).then((response) => {
    if (!response.ok) throw new Error("download failed");
    return response.blob();
  });
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
  bitmap.close();
  const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  if (!png) throw new Error("encode failed");
  saveUrl(URL.createObjectURL(png), fileName.replace(/\.webp$/i, ".png"), true);
}

function saveUrl(href: string, fileName: string, revoke = false) {
  const link = document.createElement("a");
  link.href = href;
  link.download = fileName;
  document.body.append(link);
  link.click();
  link.remove();
  if (revoke) setTimeout(() => URL.revokeObjectURL(href), 10_000);
}

export function AdminFanartClient() {
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>("pending");
  const [items, setItems] = useState<FanartSubmissionRow[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  /** Id (or batch key) waiting for a second click to reject. */
  const [confirmReject, setConfirmReject] = useState<string | null>(null);

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

  async function act(ids: string[], action: Action, busyKey: string) {
    setBusy(busyKey);
    setConfirmReject(null);
    setError(null);
    try {
      for (const id of ids) {
        const res = await fetch(`/api/fanart/admin/submissions/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) {
          setError(data?.error ?? "อัปเดตไม่สำเร็จ");
          break;
        }
      }
      await load(tab);
    } finally {
      setBusy(null);
    }
  }

  async function downloadOriginal(item: FanartSubmissionRow) {
    setBusy(`dl-${item.id}`);
    setError(null);
    try {
      const res = await fetch(`/api/fanart/admin/submissions/${item.id}/original`);
      const data = (await res.json().catch(() => null)) as
        | { url?: string; fileName?: string; type?: string; error?: string }
        | null;
      if (!res.ok || !data?.url || !data.fileName) {
        setError(data?.error ?? "ดาวน์โหลดไม่สำเร็จ");
        return;
      }
      if (data.type === "image/webp") await saveAsPng(data.url, data.fileName);
      else saveUrl(data.url, data.fileName);
    } catch {
      setError("ดาวน์โหลดไม่สำเร็จ");
    } finally {
      setBusy(null);
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

  const batches = groupByBatch(items);

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
            </Link>{" "}
            · ปฏิเสธแล้วไฟล์ต้นฉบับจะถูกลบ
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
            aria-pressed={tab === item.key}
            onClick={() => {
              setTab(item.key);
              setConfirmReject(null);
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

      {batches.length === 0 ? (
        <p className="mt-8 text-sm text-[#f3b8c4]/80">
          {tab === "pending" ? "ยังไม่มีรูปที่รออนุมัติ" : "ยังไม่มีรูปที่อนุมัติแล้ว"}
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          {batches.map((batch) => {
            const { first } = batch;
            const ids = batch.items.map((item) => item.id);
            const batchBusy = busy === batch.key;
            return (
              <section key={batch.key} className="rounded-3xl bg-[#1a0c12] p-4 ring-1 ring-white/10 sm:p-5">
                <div className="flex flex-wrap items-start justify-between gap-3">
                  <div className="flex min-w-0 items-center gap-3">
                    {first.avatar_url ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={first.avatar_url} alt="" className="size-10 rounded-full object-cover" />
                    ) : (
                      <span className="flex size-10 items-center justify-center rounded-full bg-[#e85a7a]/25 text-[#fff5f7]">
                        {[...first.display_name][0]}
                      </span>
                    )}
                    <div className="min-w-0">
                      <p className="truncate font-medium text-[#fff5f7]">{first.display_name}</p>
                      <p className="truncate text-sm text-[#f3b8c4]/80">
                        {first.contact_channel === "x" ? `X · @${first.contact_handle}` : `Discord · ${first.contact_handle}`}
                      </p>
                    </div>
                  </div>
                  <div className="text-right text-xs text-[#f3b8c4]/75">
                    <p>{DATE_TIME.format(new Date(first.created_at))}</p>
                    <p className="mt-0.5">{batch.items.length} รูปในชุดนี้</p>
                  </div>
                </div>

                <p
                  className={cn(
                    "mt-3 flex items-start gap-1.5 rounded-xl px-3 py-2 text-xs leading-relaxed",
                    first.consent_at ? "bg-[#7ad6a0]/10 text-[#bfeccf]" : "bg-white/5 text-[#f3b8c4]/70"
                  )}
                >
                  {first.consent_at ? (
                    <>
                      <Check className="mt-0.5 size-3.5 flex-none" strokeWidth={3} aria-hidden />
                      ยินยอมให้ใช้ตกแต่งคาเฟ่และโปรเจกต์วันเกิด · {DATE_TIME.format(new Date(first.consent_at))}
                      {first.consent_version ? ` · ข้อความฉบับ ${first.consent_version}` : ""}
                    </>
                  ) : (
                    "ไม่มีบันทึกการยินยอม (ส่งก่อนมีช่องติ๊กยินยอม)"
                  )}
                </p>

                <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {batch.items.map((item, index) => {
                    const fit = printFit(item.width, item.height);
                    const rejecting = confirmReject === item.id;
                    return (
                      <li key={item.id} className="overflow-hidden rounded-2xl bg-black/30 ring-1 ring-white/10">
                        <a href={item.art_url} target="_blank" rel="noreferrer" className="block">
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.art_url}
                            alt={`แฟนอาร์ตของ ${item.display_name} รูปที่ ${index + 1}`}
                            className="aspect-[4/5] w-full bg-black/40 object-contain"
                          />
                        </a>
                        <div className="space-y-2 p-3">
                          {item.original_path ? (
                            <p className="text-xs text-[#f7d7de]/80">
                              {item.width && item.height ? `${item.width} × ${item.height} px · ` : ""}
                              {item.original_bytes ? `${formatMegabytes(item.original_bytes)} · ` : ""}
                              {TYPE_LABEL[item.original_type ?? ""] ?? "รูป"}
                              {fit ? (
                                <span className="ml-1.5 rounded-full bg-[#e85a7a]/15 px-2 py-0.5 text-[11px] text-[#f3b8c4]">
                                  {fit}
                                </span>
                              ) : null}
                            </p>
                          ) : (
                            <p className="text-xs text-[#f3b8c4]/60">ไม่มีไฟล์ต้นฉบับ (เก็บแค่ขนาด 2048 px)</p>
                          )}
                          <div className="flex flex-wrap gap-2">
                            {item.original_path ? (
                              <button
                                type="button"
                                disabled={busy !== null}
                                onClick={() => downloadOriginal(item)}
                                className={cn(buttonVariants({ variant: "outline", size: "sm" }), "border-white/20 text-[#f7d7de]")}
                              >
                                <Download className="size-3.5" aria-hidden />
                                {busy === `dl-${item.id}`
                                  ? "กำลังเตรียม…"
                                  : item.original_type === "image/webp"
                                    ? "ต้นฉบับ (PNG)"
                                    : "ดาวน์โหลดต้นฉบับ"}
                              </button>
                            ) : null}
                            {tab === "pending" ? (
                              <>
                                <button
                                  type="button"
                                  disabled={busy !== null}
                                  onClick={() => act([item.id], "approve", item.id)}
                                  className={cn(buttonVariants({ size: "sm" }), "bg-[#e85a7a] text-[#140a0d]")}
                                >
                                  อนุมัติ
                                </button>
                                <button
                                  type="button"
                                  disabled={busy !== null}
                                  onClick={() =>
                                    rejecting ? act([item.id], "reject", item.id) : setConfirmReject(item.id)
                                  }
                                  className={cn(
                                    buttonVariants({ variant: "outline", size: "sm" }),
                                    rejecting ? "border-[#ff8fa6] text-[#ff8fa6]" : "border-white/20 text-[#f7d7de]"
                                  )}
                                >
                                  {rejecting ? "ยืนยันปฏิเสธ (ลบต้นฉบับ)" : "ปฏิเสธ"}
                                </button>
                              </>
                            ) : null}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {tab === "pending" && batch.items.length > 1 ? (
                  <div className="mt-4 flex flex-wrap gap-2 border-t border-white/10 pt-4">
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => act(ids, "approve", batch.key)}
                      className={cn(buttonVariants({ size: "sm" }), "bg-[#e85a7a] text-[#140a0d]")}
                    >
                      <Check className="size-3.5" aria-hidden />
                      {batchBusy ? "กำลังบันทึก…" : `อนุมัติทั้งชุด (${ids.length})`}
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() =>
                        confirmReject === batch.key ? act(ids, "reject", batch.key) : setConfirmReject(batch.key)
                      }
                      className={cn(
                        buttonVariants({ variant: "outline", size: "sm" }),
                        confirmReject === batch.key ? "border-[#ff8fa6] text-[#ff8fa6]" : "border-white/20 text-[#f7d7de]"
                      )}
                    >
                      <X className="size-3.5" aria-hidden />
                      {confirmReject === batch.key ? "ยืนยันปฏิเสธทั้งชุด (ลบต้นฉบับ)" : "ปฏิเสธทั้งชุด"}
                    </button>
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}
    </div>
  );
}
