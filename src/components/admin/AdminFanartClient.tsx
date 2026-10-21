"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { downloadZip } from "client-zip";
import { Check, Download, FolderDown, X } from "lucide-react";

import {
  ImageLightbox,
  type ImageLightboxItem,
} from "@/components/media/ImageLightbox";
import { buttonVariants } from "@/components/ui/button";
import { ADMIN_FANART_LOGIN } from "@/lib/admin-next";
import type { FanartSubmissionRow } from "@/lib/fanart-submissions-store";
import {
  FANART_CONSENT_SUMMARY,
  creditHref,
  creditLabel,
  formatMegabytes,
  type FanartCredit,
} from "@/lib/fanart-upload";
import { cn } from "@/lib/utils";

type Tab = "pending" | "approved" | "hidden";
type Action = "approve" | "reject" | "hide" | "unhide" | "delete";

const TABS: { key: Tab; label: string }[] = [
  { key: "pending", label: "รออนุมัติ" },
  { key: "approved", label: "อนุมัติแล้ว" },
  { key: "hidden", label: "ซ่อนไว้" },
];

const EMPTY_TEXT: Record<Tab, string> = {
  pending: "ยังไม่มีรูปที่รออนุมัติ",
  approved: "ยังไม่มีรูปที่อนุมัติแล้ว",
  hidden: "ไม่มีรูปที่ซ่อนไว้",
};

const WORKING_VERB: Record<Action, string> = {
  approve: "กำลังอนุมัติ",
  reject: "กำลังปฏิเสธ",
  hide: "กำลังซ่อน",
  unhide: "กำลังเอากลับขึ้นเว็บ",
  delete: "กำลังลบ",
};

const DONE_TEXT: Record<Action, (count: number) => string> = {
  approve: (count) => `อนุมัติแล้ว ${count} รูป · ขึ้นหน้าแฟนอาร์ตแล้ว`,
  reject: (count) => `ปฏิเสธแล้ว ${count} รูป · ลบต้นฉบับแล้ว`,
  hide: (count) => `ซ่อนแล้ว ${count} รูป · ดูได้ที่แท็บ "ซ่อนไว้"`,
  unhide: (count) => `เอากลับขึ้นหน้าแฟนอาร์ตแล้ว ${count} รูป`,
  delete: (count) => `ลบถาวรแล้ว ${count} รูป`,
};

/** Thai month names with the same year (2026) as the rest of the site. */
const DATE_TIME = new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
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

const PRIMARY = cn(
  buttonVariants({ size: "sm" }),
  "h-9 bg-[#e85a7a] px-3 text-[#140a0d] hover:bg-[#f3b8c4]"
);
const OUTLINE = cn(
  buttonVariants({ variant: "outline", size: "sm" }),
  "h-9 border-[#f3b8c4]/25 bg-transparent px-3 text-[#f7d7de] hover:bg-[#f3b8c4]/10 hover:text-[#fff5f7]"
);
/** Second click of a reject: deletes the original, so it looks different. */
const DANGER = "border-[#ff8fa6] text-[#ff8fa6] hover:text-[#ff8fa6]";

function Spinner({ className }: { className?: string }) {
  return (
    <span
      aria-hidden
      className={cn(
        "inline-block size-3.5 flex-none animate-spin rounded-full border-2 border-current border-t-transparent",
        className
      )}
    />
  );
}

/** Approve / reject in progress: which pictures, and how many are done. */
type Working = { key: string; ids: string[]; action: Action; done: number };

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
async function webpToPng(blob: Blob): Promise<Blob> {
  const bitmap = await createImageBitmap(blob);
  const canvas = document.createElement("canvas");
  canvas.width = bitmap.width;
  canvas.height = bitmap.height;
  canvas.getContext("2d")?.drawImage(bitmap, 0, 0);
  bitmap.close();
  const png = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, "image/png"));
  canvas.width = 0;
  canvas.height = 0;
  if (!png) throw new Error("encode failed");
  return png;
}

async function fetchBlob(url: string): Promise<Blob> {
  const response = await fetch(url);
  if (!response.ok) throw new Error("download failed");
  return response.blob();
}

async function saveAsPng(url: string, fileName: string) {
  const png = await webpToPng(await fetchBlob(url));
  saveUrl(URL.createObjectURL(png), fileName.replace(/\.webp$/i, ".png"), true);
}

type ZipFile = {
  id: string;
  url: string;
  type: string | null;
  name: string;
  sender: string;
  credit: string;
  creditUrl: string;
};

/** Credit of a picture; older submissions without one credit the sender's account. */
function creditOf(row: FanartSubmissionRow): FanartCredit {
  if (row.credit_type && row.credit_value) return { type: row.credit_type, value: row.credit_value };
  return { type: "x", value: row.contact_handle };
}

/** Badge that tells the team when a credit is worth a second look. */
function creditFlag(row: FanartSubmissionRow): { text: string; warn: boolean } | null {
  const credit = creditOf(row);
  if (credit.type === "url") return { text: "ลิงก์ · กดเปิดดูได้", warn: false };
  if (credit.value.toLowerCase() !== row.contact_handle.toLowerCase()) {
    return { text: "คนละบัญชีกับผู้ส่ง · ควรเช็ค", warn: true };
  }
  return null;
}

/** credits.txt inside the ZIP: what to print next to each picture. */
function creditsText(files: ZipFile[]): string {
  const lines = files.map(
    (file) => `${file.name}\n  เครดิต: ${file.credit} (${file.creditUrl})\n  ส่งโดย: ${file.sender}`
  );
  return `เครดิตแฟนอาร์ต Mild-R\n\n${lines.join("\n\n")}\n`;
}
type ZipRequest = { ids: string[] } | { status: "approved" };

function today() {
  return new Date().toLocaleDateString("en-CA", { timeZone: "Asia/Bangkok" }).replaceAll("-", "");
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
  const router = useRouter();
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [tab, setTab] = useState<Tab>("pending");
  const [items, setItems] = useState<FanartSubmissionRow[]>([]);
  const [pendingCount, setPendingCount] = useState(0);
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState<string | null>(null);
  /** Id (or batch key) waiting for a second click to reject. */
  const [confirmReject, setConfirmReject] = useState<string | null>(null);
  /** Id waiting for a second click to delete for good. */
  const [confirmDelete, setConfirmDelete] = useState<string | null>(null);
  /** "กำลังรวมไฟล์ 3 / 12" while a ZIP is being built. */
  const [zipProgress, setZipProgress] = useState<string | null>(null);
  const [working, setWorking] = useState<Working | null>(null);
  /** Short "approved 2 pictures" message after an action. */
  const [notice, setNotice] = useState<string | null>(null);
  const noticeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const [listLoading, setListLoading] = useState(false);
  /** Index into the pictures of this tab shown in the lightbox. */
  const [viewing, setViewing] = useState<number | null>(null);

  /** The session ran out (12 h) while this page was open: log in again, then come back. */
  const toLogin = useCallback(() => {
    setUnlocked(false);
    router.replace(ADMIN_FANART_LOGIN);
  }, [router]);

  const load = useCallback(async (status: Tab) => {
    setError(null);
    const res = await fetch(`/api/fanart/admin/submissions?status=${status}`);
    if (res.status === 401) {
      toLogin();
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
  }, [toLogin]);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/unlock");
        const data = (await res.json()) as { unlocked?: boolean };
        if (cancelled) return;
        if (!data.unlocked) {
          toLogin();
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
  }, [load, toLogin]);

  function showNotice(text: string) {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
    setNotice(text);
    noticeTimer.current = setTimeout(() => setNotice(null), 3000);
  }

  useEffect(() => () => {
    if (noticeTimer.current) clearTimeout(noticeTimer.current);
  }, []);

  async function act(ids: string[], action: Action, busyKey: string) {
    setBusy(busyKey);
    setConfirmReject(null);
    setConfirmDelete(null);
    setError(null);
    setWorking({ key: busyKey, ids, action, done: 0 });
    const doneIds: string[] = [];
    try {
      for (const id of ids) {
        const res = await fetch(`/api/fanart/admin/submissions/${id}`, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action }),
        });
        if (res.status === 401) return toLogin();
        const data = (await res.json().catch(() => null)) as { error?: string } | null;
        if (!res.ok) {
          setError(data?.error ?? "อัปเดตไม่สำเร็จ");
          break;
        }
        doneIds.push(id);
        const done = doneIds.length;
        setWorking((current) => (current ? { ...current, done } : current));
      }
      await load(tab);
      if (doneIds.length > 0) {
        showNotice(DONE_TEXT[action](doneIds.length));
      }
    } catch {
      setError("อัปเดตไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setWorking(null);
      setBusy(null);
    }
  }

  const lightboxOpen = viewing !== null;
  const pictureCount = items.length;

  // Phone back button closes the lightbox instead of leaving the page.
  useEffect(() => {
    if (!lightboxOpen) return;
    window.history.pushState({ ...window.history.state, fanartLightbox: true }, "");
    const onPop = () => setViewing(null);
    window.addEventListener("popstate", onPop);
    return () => {
      window.removeEventListener("popstate", onPop);
      // Closed with X / Esc: drop the history entry added above.
      if (window.history.state?.fanartLightbox) window.history.back();
    };
  }, [lightboxOpen]);

  // Swipe left / right on the picture to step through the tab.
  useEffect(() => {
    if (!lightboxOpen || pictureCount < 2) return;
    let startX = 0;
    let startY = 0;
    let tracking = false;
    const onStart = (event: TouchEvent) => {
      const touch = event.touches[0];
      tracking =
        event.touches.length === 1 &&
        Boolean((event.target as Element | null)?.closest("[data-lightbox-layer]"));
      startX = touch?.clientX ?? 0;
      startY = touch?.clientY ?? 0;
    };
    const onEnd = (event: TouchEvent) => {
      if (!tracking) return;
      tracking = false;
      const touch = event.changedTouches[0];
      if (!touch) return;
      const dx = touch.clientX - startX;
      const dy = touch.clientY - startY;
      if (Math.abs(dx) < 50 || Math.abs(dx) < Math.abs(dy) * 1.5) return;
      const step = dx < 0 ? 1 : -1;
      setViewing((current) =>
        current === null ? current : (current + step + pictureCount) % pictureCount
      );
    };
    document.addEventListener("touchstart", onStart, { passive: true });
    document.addEventListener("touchend", onEnd, { passive: true });
    return () => {
      document.removeEventListener("touchstart", onStart);
      document.removeEventListener("touchend", onEnd);
    };
  }, [lightboxOpen, pictureCount]);

  async function switchTab(next: Tab) {
    if (next === tab && !listLoading) return;
    setTab(next);
    setConfirmReject(null);
    setConfirmDelete(null);
    setViewing(null);
    setListLoading(true);
    try {
      await load(next);
    } catch {
      setError("โหลดไม่สำเร็จ");
    } finally {
      setListLoading(false);
    }
  }

  /** Label for an approve / reject button while its request runs. */
  function workingLabel(key: string, action: Action): string | null {
    if (!working || working.key !== key || working.action !== action) return null;
    const verb = WORKING_VERB[action];
    return working.ids.length > 1
      ? `${verb} ${Math.min(working.done + 1, working.ids.length)} / ${working.ids.length}…`
      : `${verb}…`;
  }

  async function downloadOriginal(item: FanartSubmissionRow) {
    setBusy(`dl-${item.id}`);
    setError(null);
    try {
      const res = await fetch(`/api/fanart/admin/submissions/${item.id}/original`);
      if (res.status === 401) return toLogin();
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

  /**
   * Builds the ZIP in this browser: Vercel caps a function response at 4.5 MB,
   * so the originals come straight from storage through short-lived links.
   */
  async function downloadZipOf(request: ZipRequest, zipName: string, busyKey: string) {
    setBusy(busyKey);
    setError(null);
    setZipProgress("กำลังเตรียมลิงก์…");
    try {
      const res = await fetch("/api/fanart/admin/originals", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(request),
      });
      if (res.status === 401) return toLogin();
      const data = (await res.json().catch(() => null)) as { files?: ZipFile[]; error?: string } | null;
      if (!res.ok || !data?.files?.length) {
        setError(data?.error ?? "ดาวน์โหลดไม่สำเร็จ");
        return;
      }
      const files = data.files;
      async function* entries() {
        for (const [index, file] of files.entries()) {
          setZipProgress(`กำลังรวมไฟล์ ${index + 1} / ${files.length}`);
          let input = await fetchBlob(file.url);
          let name = file.name;
          if (file.type === "image/webp") {
            input = await webpToPng(input);
            name = name.replace(/\.webp$/i, ".png");
          }
          yield { name, input, lastModified: new Date() };
        }
        yield { name: "credits.txt", input: creditsText(files), lastModified: new Date() };
      }
      const zip = await downloadZip(entries()).blob();
      saveUrl(URL.createObjectURL(zip), zipName, true);
    } catch (zipError) {
      console.error(zipError);
      setError("รวมไฟล์ไม่สำเร็จ กรุณาลองใหม่");
    } finally {
      setBusy(null);
      setZipProgress(null);
    }
  }

  if (checking) {
    return <p className="text-sm text-[#f3b8c4]">กำลังตรวจสิทธิ์…</p>;
  }

  if (!unlocked) {
    return <p className="text-sm text-[#f3b8c4]">กำลังพาไปหน้าเข้าสู่ระบบ…</p>;
  }

  const batches = groupByBatch(items);
  const originalsCount = items.filter((item) => item.original_path).length;
  /** Every picture in this tab, in the order shown, for the lightbox. */
  const ordered = batches.flatMap((batch) =>
    batch.items.map((item, index) => ({ item, index, count: batch.items.length }))
  );
  const lightboxItems: ImageLightboxItem[] = ordered.map(({ item, index, count }) => ({
    id: item.id,
    src: item.art_url,
    alt: `แฟนอาร์ตของ ${item.display_name} รูปที่ ${index + 1}`,
    caption: count > 1 ? `${item.display_name} · รูปที่ ${index + 1} / ${count}` : item.display_name,
  }));
  const viewed = viewing !== null ? ordered[viewing]?.item : undefined;

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
          <p className="mt-1 text-xs text-[#f3b8c4]/65">ปฏิเสธแล้วไฟล์ต้นฉบับจะถูกลบ</p>
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
            disabled={busy !== null}
            onClick={() => void switchTab(item.key)}
            className={cn(
              "min-h-11 rounded-full px-4 text-sm disabled:opacity-60",
              tab === item.key ? "bg-[#e85a7a] text-[#140a0d]" : "bg-white/5 text-[#f7d7de]"
            )}
          >
            {item.label}
            {item.key === "pending" && pendingCount > 0 ? ` · ${pendingCount}` : ""}
          </button>
        ))}
      </div>

      {tab === "approved" && originalsCount > 0 ? (
        <div className="mt-5 flex flex-wrap items-center gap-3 rounded-2xl bg-white/[0.04] px-4 py-3 ring-1 ring-white/10">
          <button
            type="button"
            disabled={busy !== null}
            onClick={() =>
              downloadZipOf({ status: "approved" }, `mild-r-fanart-approved-${today()}.zip`, "zip-all")
            }
            className={PRIMARY}
          >
            <FolderDown className="size-4" aria-hidden />
            ดาวน์โหลดทั้งหมด (ZIP) · {originalsCount} รูป
          </button>
          <p className="text-xs text-[#f3b8c4]/75">
            {busy === "zip-all" && zipProgress ? zipProgress : "ไฟล์ต้นฉบับ แยกโฟลเดอร์ตามคนส่ง"}
          </p>
        </div>
      ) : null}

      {zipProgress && busy !== "zip-all" ? (
        <p className="sr-only" aria-live="polite">
          {zipProgress}
        </p>
      ) : null}

      {listLoading ? (
        <p className="mt-8 flex items-center gap-2 text-sm text-[#f3b8c4]/80" role="status">
          <Spinner className="size-4 text-[#e85a7a]" />
          กำลังโหลดรายการ…
        </p>
      ) : batches.length === 0 ? (
        <p className="mt-8 text-sm text-[#f3b8c4]/80">
          {EMPTY_TEXT[tab]}
        </p>
      ) : (
        <div className="mt-6 space-y-6">
          {batches.map((batch) => {
            const { first } = batch;
            const ids = batch.items.map((item) => item.id);
            const batchBusy = busy === batch.key;
            const batchOriginals = batch.items.filter((item) => item.original_path).map((item) => item.id);
            const zipKey = `zip-${batch.key}`;
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
                      ยินยอม: {FANART_CONSENT_SUMMARY[first.consent_version ?? ""] ?? "ให้ใช้ตกแต่งคาเฟ่และโปรเจกต์วันเกิด"} ·{" "}
                      {DATE_TIME.format(new Date(first.consent_at))}
                      {first.consent_version ? ` · ข้อความฉบับ ${first.consent_version}` : ""}
                    </>
                  ) : (
                    "ไม่มีบันทึกการยินยอม (ส่งก่อนมีช่องติ๊กยินยอม)"
                  )}
                </p>

                <ul className="mt-4 grid gap-3 sm:grid-cols-2 lg:grid-cols-3">
                  {batch.items.map((item, index) => {
                    const fit = printFit(item.width, item.height);
                    const credit = creditOf(item);
                    const flag = creditFlag(item);
                    const rejecting = confirmReject === item.id;
                    const saving = working?.ids.includes(item.id) ?? false;
                    const position = ordered.findIndex((entry) => entry.item.id === item.id);
                    return (
                      <li
                        key={item.id}
                        aria-busy={saving}
                        className={cn(
                          "overflow-hidden rounded-2xl bg-black/30 ring-1 ring-white/10 transition-opacity",
                          saving && "opacity-60"
                        )}
                      >
                        <button
                          type="button"
                          onClick={() => setViewing(position)}
                          disabled={saving}
                          aria-label={`ขยายดูรูปที่ ${index + 1} ของ ${item.display_name}`}
                          className="relative block w-full cursor-zoom-in outline-none focus-visible:ring-2 focus-visible:ring-[#f3b8c4] disabled:cursor-wait"
                        >
                          {/* eslint-disable-next-line @next/next/no-img-element */}
                          <img
                            src={item.art_url}
                            alt=""
                            className="h-64 w-full bg-black/40 object-contain sm:aspect-[4/5] sm:h-auto"
                          />
                          {saving ? (
                            <span className="absolute inset-0 flex items-center justify-center bg-[#0c0709]/55">
                              <Spinner className="size-7 border-[3px] text-[#f3b8c4]" />
                            </span>
                          ) : null}
                        </button>
                        <div className="space-y-2 p-3">
                          <div className="space-y-1">
                            <p className="flex min-w-0 items-baseline gap-1 text-[12.5px] text-[#fff5f7]">
                              <span className="flex-none">เครดิต:</span>
                              <a
                                href={creditHref(credit)}
                                target="_blank"
                                rel="noreferrer noopener"
                                className="truncate text-[#f3b8c4] underline underline-offset-2 hover:text-[#fff5f7]"
                              >
                                {creditLabel(credit)}
                                {credit.type === "url" ? " ↗" : ""}
                              </a>
                            </p>
                            {flag ? (
                              <span
                                className={cn(
                                  "inline-flex rounded-full px-2 py-0.5 text-[10.5px]",
                                  flag.warn ? "bg-[#ffd27a]/15 text-[#ffd27a]" : "bg-white/[0.06] text-[#f3b8c4]/70"
                                )}
                              >
                                {flag.text}
                              </span>
                            ) : null}
                          </div>
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
                                className={OUTLINE}
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
                                  className={PRIMARY}
                                >
                                  {workingLabel(item.id, "approve") ? <Spinner /> : null}
                                  {workingLabel(item.id, "approve") ?? "อนุมัติ"}
                                </button>
                                <button
                                  type="button"
                                  disabled={busy !== null}
                                  onClick={() =>
                                    rejecting ? act([item.id], "reject", item.id) : setConfirmReject(item.id)
                                  }
                                  className={cn(OUTLINE, rejecting && DANGER)}
                                >
                                  {workingLabel(item.id, "reject") ? <Spinner /> : null}
                                  {workingLabel(item.id, "reject") ??
                                    (rejecting ? "ยืนยันปฏิเสธ (ลบต้นฉบับ)" : "ปฏิเสธ")}
                                </button>
                              </>
                            ) : (
                              <>
                                <button
                                  type="button"
                                  disabled={busy !== null}
                                  onClick={() => act([item.id], tab === "approved" ? "hide" : "unhide", item.id)}
                                  className={OUTLINE}
                                >
                                  {workingLabel(item.id, tab === "approved" ? "hide" : "unhide") ? <Spinner /> : null}
                                  {workingLabel(item.id, tab === "approved" ? "hide" : "unhide") ??
                                    (tab === "approved" ? "ซ่อนจากหน้าเว็บ" : "แสดงอีกครั้ง")}
                                </button>
                                <button
                                  type="button"
                                  disabled={busy !== null}
                                  onClick={() => {
                                    if (confirmDelete === item.id) void act([item.id], "delete", item.id);
                                    else setConfirmDelete(item.id);
                                  }}
                                  className={cn(OUTLINE, confirmDelete === item.id && DANGER)}
                                >
                                  {workingLabel(item.id, "delete") ? <Spinner /> : null}
                                  {workingLabel(item.id, "delete") ??
                                    (confirmDelete === item.id ? "ยืนยันลบถาวร" : "ลบ")}
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                      </li>
                    );
                  })}
                </ul>

                {batch.items.length > 1 || batchOriginals.length > 1 ? (
                  <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-white/10 pt-4">
                    {batchOriginals.length > 1 ? (
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() =>
                          downloadZipOf(
                            { ids: batchOriginals },
                            `mild-r-fanart-${first.created_at.slice(0, 10).replaceAll("-", "")}-${batch.key.slice(0, 8)}.zip`,
                            zipKey
                          )
                        }
                        className={OUTLINE}
                      >
                        <FolderDown className="size-3.5" aria-hidden />
                        {busy === zipKey && zipProgress ? zipProgress : `ดาวน์โหลดทั้งชุด (ZIP)`}
                      </button>
                    ) : null}
                    {tab === "pending" && batch.items.length > 1 ? (
                      <>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() => act(ids, "approve", batch.key)}
                      className={PRIMARY}
                    >
                      {batchBusy && working?.action === "approve" ? <Spinner /> : <Check className="size-3.5" aria-hidden />}
                      {workingLabel(batch.key, "approve") ?? `อนุมัติทั้งชุด (${ids.length})`}
                    </button>
                    <button
                      type="button"
                      disabled={busy !== null}
                      onClick={() =>
                        confirmReject === batch.key ? act(ids, "reject", batch.key) : setConfirmReject(batch.key)
                      }
                      className={cn(OUTLINE, confirmReject === batch.key && DANGER)}
                    >
                      {batchBusy && working?.action === "reject" ? <Spinner /> : <X className="size-3.5" aria-hidden />}
                      {workingLabel(batch.key, "reject") ??
                        (confirmReject === batch.key ? "ยืนยันปฏิเสธทั้งชุด (ลบต้นฉบับ)" : "ปฏิเสธทั้งชุด")}
                    </button>
                      </>
                    ) : null}
                    {tab !== "pending" && batch.items.length > 1 ? (
                      <button
                        type="button"
                        disabled={busy !== null}
                        onClick={() => act(ids, tab === "approved" ? "hide" : "unhide", batch.key)}
                        className={OUTLINE}
                      >
                        {batchBusy ? <Spinner /> : null}
                        {workingLabel(batch.key, tab === "approved" ? "hide" : "unhide") ??
                          (tab === "approved" ? `ซ่อนทั้งชุด (${ids.length})` : `แสดงทั้งชุด (${ids.length})`)}
                      </button>
                    ) : null}
                  </div>
                ) : null}
              </section>
            );
          })}
        </div>
      )}

      <ImageLightbox
        items={lightboxItems}
        activeIndex={viewing !== null && viewing < lightboxItems.length ? viewing : null}
        onActiveIndexChange={setViewing}
        prevLabel="รูปก่อนหน้า"
        nextLabel="รูปถัดไป"
        subtitle={
          viewed ? (
            <>
              {viewed.width && viewed.height ? <span>{`${viewed.width} × ${viewed.height} px`}</span> : null}
              {printFit(viewed.width, viewed.height) ? <span>{printFit(viewed.width, viewed.height)}</span> : null}
              <span>เครดิต {creditLabel(creditOf(viewed))}</span>
            </>
          ) : null
        }
        headerAside={
          viewed?.original_path ? (
            <button
              type="button"
              disabled={busy !== null}
              onClick={() => downloadOriginal(viewed)}
              className={OUTLINE}
            >
              {busy === `dl-${viewed.id}` ? <Spinner /> : <Download className="size-3.5" aria-hidden />}
              <span className="hidden sm:inline">
                {busy === `dl-${viewed.id}` ? "กำลังเตรียม…" : "ต้นฉบับ"}
              </span>
            </button>
          ) : null
        }
      />

      <div
        aria-live="polite"
        className="pointer-events-none fixed inset-x-0 bottom-6 z-40 flex justify-center px-4"
      >
        {notice ? (
          <p className="flex items-center gap-2 rounded-full bg-[#1f3a2b] px-4 py-2.5 text-sm text-[#d9f5e3] shadow-lg ring-1 ring-[#7ad6a0]/40">
            <Check className="size-4 text-[#7ad6a0]" strokeWidth={3} aria-hidden />
            {notice}
          </p>
        ) : null}
      </div>
    </div>
  );
}
