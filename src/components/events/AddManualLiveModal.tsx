"use client";

import { useMemo, useState } from "react";
import {
  AlertCircle,
  Check,
  CheckCircle2,
  Copy,
  Eraser,
  FileJson,
  FileText,
  Link2,
  Plus,
  Sparkles,
  Trash2,
  Users,
  Video,
} from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  LUMINA_CHANNELS,
  resolveLuminaChannel,
} from "@/data/lumina-channels";
import {
  CTA_OUTLINE_CLASS,
  CTA_PRIMARY_CLASS,
  GLASS_CARD_CLASS,
  META_CLASS,
  META_MUTED_CLASS,
} from "@/lib/site-ui";
import { getYoutubeVideoId } from "@/lib/youtube";
import { cn } from "@/lib/utils";

type DraftRow = {
  key: string;
  title: string;
  channelId: string;
  date: string;
  time: string;
  own: boolean;
  collab: boolean;
  member: boolean;
  cancelled: boolean;
  youtubeUrl: string;
};

type SubmitItem = {
  title?: string;
  channel?: string;
  date?: string;
  time?: string;
  own?: boolean;
  collab?: boolean;
  member: boolean;
  cancelled?: boolean;
  url?: string;
};

const SAMPLE_JSON = `[
  {
    "title": "【Mild-R】Free Talk ชวนคุยยามดึก",
    "channel": "Mild-R",
    "date": "2026-09-01",
    "time": "20:00",
    "member": false,
    "own": true,
    "collab": false
  },
  {
    "title": "【MEMBERSHIP】สตรีมพิเศษเฉพาะเมมเบอร์",
    "channel": "Mild-R",
    "date": "2026-09-02",
    "time": "21:00",
    "member": true,
    "own": true
  },
  {
    "title": "Collab เล่นเกมกับเพื่อนๆ",
    "channel": "Lumina",
    "date": "2026-09-03",
    "time": "19:30",
    "collab": true
  },
  {
    "member": true,
    "url": "https://www.youtube.com/live/XZcXaFlzJzc"
  }
]`;

function generateRowKey(): string {
  if (typeof crypto !== "undefined" && typeof crypto.randomUUID === "function") {
    return crypto.randomUUID();
  }
  return `row-${Date.now()}-${Math.random().toString(36).slice(2, 9)}`;
}

function emptyRow(): DraftRow {
  const mild = LUMINA_CHANNELS.find((c) => c.isMain) ?? LUMINA_CHANNELS[0];
  return {
    key: generateRowKey(),
    title: "",
    channelId: mild?.channelId ?? "",
    date: "",
    time: "20:00",
    own: true,
    collab: false,
    member: false,
    cancelled: false,
    youtubeUrl: "",
  };
}

function parseBool(...values: unknown[]): boolean | null {
  for (const raw of values) {
    if (typeof raw === "boolean") return raw;
  }
  return null;
}

function resolveIdFromLink(input: string): string | null {
  const trimmed = input.trim();
  if (/^[\w-]{11}$/.test(trimmed)) return trimmed;
  return getYoutubeVideoId(trimmed);
}

const SAMPLE_MEMBER_LINKS = "";

const SAMPLE_COLLAB_LINKS = "";

/** One YouTube link (or bare id) per line → draft rows for Member or Collab import */
function parseYoutubeLinksText(
  text: string,
  mode: "member" | "collab"
): {
  rows: DraftRow[];
  error?: string;
} {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return {
      rows: [],
      error:
        mode === "member"
          ? "วางลิงก์ YouTube Member อย่างน้อย 1 บรรทัด"
          : "วางลิงก์ YouTube Collab อย่างน้อย 1 บรรทัด",
    };
  }
  const rows: DraftRow[] = [];
  const errors: string[] = [];
  const seen = new Set<string>();
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const id = resolveIdFromLink(line);
    if (!id) {
      errors.push(`บรรทัด ${i + 1}: ลิงก์ไม่ถูกต้อง`);
      continue;
    }
    if (seen.has(id)) continue;
    seen.add(id);
    rows.push({
      ...emptyRow(),
      key: generateRowKey(),
      member: mode === "member",
      collab: mode === "collab",
      own: mode === "member",
      youtubeUrl: line.startsWith("http")
        ? line
        : `https://www.youtube.com/watch?v=${id}`,
    });
  }
  if (rows.length === 0) {
    return { rows: [], error: errors.join(" · ") || "ไม่มีลิงก์ที่ใช้ได้" };
  }
  return {
    rows,
    error: errors.length ? errors.join(" · ") : undefined,
  };
}

function parseJsonToRows(text: string): { rows: DraftRow[]; error?: string } {
  try {
    const data = JSON.parse(text) as unknown;
    const list = Array.isArray(data)
      ? data
      : data &&
          typeof data === "object" &&
          Array.isArray((data as { items?: unknown }).items)
        ? (data as { items: unknown[] }).items
        : null;
    if (!list) {
      return { rows: [], error: "JSON ต้องเป็น array หรือ { items: [...] }" };
    }
    const rows: DraftRow[] = [];
    const errors: string[] = [];
    for (let i = 0; i < list.length; i++) {
      const o = (list[i] ?? {}) as Record<string, unknown>;
      const member =
        parseBool(o.member, o.isMember, o.is_member) ?? false;
      const cancelled =
        parseBool(o.cancelled, o.isCancelled, o.is_cancelled) ??
        (typeof o.status === "string" &&
          o.status.trim().toLowerCase() === "cancelled");
      const youtubeUrl =
        typeof o.url === "string"
          ? o.url
          : typeof o.youtubeUrl === "string"
            ? o.youtubeUrl
            : typeof o.link === "string"
              ? o.link
              : "";

      if (member) {
        const hasLink = Boolean(resolveIdFromLink(youtubeUrl));
        if (hasLink) {
          rows.push({
            ...emptyRow(),
            key: generateRowKey(),
            member: true,
            cancelled,
            youtubeUrl,
            own: parseBool(o.own, o.isOwn) ?? true,
            collab: parseBool(o.collab, o.isCollab) ?? false,
          });
          continue;
        }

        // Member preview mock (no URL yet)
        const channelRaw =
          typeof o.channel === "string"
            ? o.channel
            : typeof o.channelId === "string"
              ? o.channelId
              : "";
        const resolved = resolveLuminaChannel(channelRaw);
        const own =
          parseBool(o.own, o.isOwn) ?? Boolean(resolved?.isMain ?? true);
        if (!own && !channelRaw.trim()) {
          errors.push(`[${i}] ถ้าไม่ใช่ช่องตัวเอง ต้องใส่ channel`);
          continue;
        }
        if (!own && !resolved) {
          errors.push(`[${i}] channel ไม่รู้จัก (“${channelRaw}”)`);
          continue;
        }
        const mild = LUMINA_CHANNELS.find((c) => c.isMain);
        const title = typeof o.title === "string" ? o.title : "";
        const date = typeof o.date === "string" ? o.date : "";
        if (!title.trim()) {
          errors.push(
            `[${i}] Member ที่ไม่มี url ต้องมี title (หรือใส่ url แทน)`
          );
          continue;
        }
        if (!date.trim()) {
          errors.push(
            `[${i}] Member ที่ไม่มี url ต้องมี date (หรือใส่ url แทน)`
          );
          continue;
        }
        rows.push({
          key: generateRowKey(),
          title,
          channelId: own
            ? (mild?.channelId ?? resolved?.channelId ?? "")
            : (resolved?.channelId ?? ""),
          date,
          time: typeof o.time === "string" && o.time ? o.time : "20:00",
          own,
          collab: parseBool(o.collab, o.isCollab) ?? !own,
          member: true,
          cancelled,
          youtubeUrl: "",
        });
        continue;
      }

      const channelRaw =
        typeof o.channel === "string"
          ? o.channel
          : typeof o.channelId === "string"
            ? o.channelId
            : "";
      const resolved = resolveLuminaChannel(channelRaw);
      const own =
        parseBool(o.own, o.isOwn) ?? Boolean(resolved?.isMain);
      if (!own && !channelRaw.trim()) {
        errors.push(`[${i}] ถ้าไม่ใช่ช่องตัวเอง ต้องใส่ channel`);
        continue;
      }
      if (!own && !resolved) {
        errors.push(`[${i}] channel ไม่รู้จัก (“${channelRaw}”)`);
        continue;
      }
      const mild = LUMINA_CHANNELS.find((c) => c.isMain);
      rows.push({
        key: generateRowKey(),
        title: typeof o.title === "string" ? o.title : "",
        channelId: own
          ? (mild?.channelId ?? resolved?.channelId ?? "")
          : (resolved?.channelId ?? ""),
        date: typeof o.date === "string" ? o.date : "",
        time: typeof o.time === "string" && o.time ? o.time : "20:00",
        own,
        collab: parseBool(o.collab, o.isCollab) ?? !own,
        member: false,
        cancelled,
        youtubeUrl: "",
      });
    }
    if (rows.length === 0 && errors.length) {
      return { rows: [], error: errors.join(" · ") };
    }
    return {
      rows,
      error: errors.length ? errors.join(" · ") : undefined,
    };
  } catch {
    return { rows: [], error: "JSON ไม่ถูกต้อง" };
  }
}

function toSubmitItems(rows: DraftRow[]): SubmitItem[] {
  return rows.map((row) => {
    if (row.member && resolveIdFromLink(row.youtubeUrl)) {
      return {
        member: true,
        url: row.youtubeUrl.trim(),
        own: true,
        collab: row.collab,
        cancelled: row.cancelled || undefined,
      };
    }
    if (!row.member && row.collab && resolveIdFromLink(row.youtubeUrl)) {
      return {
        member: false,
        collab: true,
        url: row.youtubeUrl.trim(),
        cancelled: row.cancelled || undefined,
      };
    }
    const mild = LUMINA_CHANNELS.find((c) => c.isMain);
    const ch = row.own
      ? mild
      : (LUMINA_CHANNELS.find((c) => c.channelId === row.channelId) ?? null);
    return {
      title: row.title,
      channel: ch?.title ?? (row.own ? "Mild-R" : ""),
      date: row.date,
      time: row.time,
      own: row.own,
      collab: row.collab,
      member: row.member,
      cancelled: row.cancelled || undefined,
    };
  });
}

function validateRows(rows: DraftRow[]): string | null {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.member && resolveIdFromLink(row.youtubeUrl)) {
      continue;
    }
    if (!row.member && row.collab && resolveIdFromLink(row.youtubeUrl)) {
      continue;
    }
    if (
      (row.member || row.collab) &&
      row.youtubeUrl.trim() &&
      !resolveIdFromLink(row.youtubeUrl)
    ) {
      return `รายการ ${i + 1}: ลิงก์ YouTube ไม่ถูกต้อง`;
    }
    if (!row.title.trim()) {
      return `รายการ ${i + 1}: ต้องมีชื่อไลฟ์${row.member ? " (หรือใส่ลิงก์ Member)" : ""}`;
    }
    if (!row.date) return `รายการ ${i + 1}: ต้องมีวันที่`;
    if (!row.own && !row.channelId) {
      return `รายการ ${i + 1}: ถ้าไม่ใช่ช่องตัวเอง ต้องเลือกช่อง`;
    }
  }
  return null;
}

export function AddManualLiveButton() {
  const [open, setOpen] = useState(false);
  const [rows, setRows] = useState<DraftRow[]>([emptyRow()]);
  const [jsonText, setJsonText] = useState("");
  const [tab, setTab] = useState<"form" | "json" | "member" | "collab">("form");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [memberLinksText, setMemberLinksText] = useState("");
  const [collabLinksText, setCollabLinksText] = useState("");
  const [copiedJson, setCopiedJson] = useState(false);

  const handleCopyExampleJson = async () => {
    try {
      await navigator.clipboard.writeText(SAMPLE_JSON);
      setCopiedJson(true);
      setMessage("คัดลอก JSON ตัวอย่างลง Clipboard เรียบร้อยแล้ว");
      setError(null);
      setTimeout(() => setCopiedJson(false), 2500);
    } catch {
      setError("ไม่สามารถเข้าถึง Clipboard เพื่อคัดลอกได้");
    }
  };

  const channelOptions = useMemo(
    () =>
      LUMINA_CHANNELS.filter(
        (c): c is (typeof c & { channelId: string }) => Boolean(c.channelId)
      ).sort((a, b) => a.title.localeCompare(b.title, "en")),
    []
  );

  async function submit(drafts: DraftRow[]) {
    const items = toSubmitItems(drafts);
    setBusy(true);
    setMessage(null);
    setError(null);
    try {
      const res = await fetch("/api/live/manual", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ items }),
      });
      const data = (await res.json()) as {
        error?: string;
        details?: string[];
        saved?: number;
        replaced?: number;
        skippedMatchedReal?: number;
        memberImported?: number;
        collabImported?: number;
        skippedErrors?: string[];
      };
      if (!res.ok) {
        setError(
          [data.error, ...(data.details ?? [])].filter(Boolean).join(" · ") ||
            "บันทึกไม่สำเร็จ"
        );
        return;
      }
      const skipped = data.skippedErrors?.length
        ? ` (ข้ามบางรายการ: ${data.skippedErrors.join(" · ")})`
        : "";
      setMessage(
        `บันทึกแล้ว ${data.saved ?? items.length} รายการ` +
          (typeof data.memberImported === "number" && data.memberImported > 0
            ? ` · Member จากลิงก์ ${data.memberImported}`
            : "") +
          (typeof data.collabImported === "number" && data.collabImported > 0
            ? ` · Collab จากลิงก์ ${data.collabImported}`
            : "") +
          (typeof data.replaced === "number" && data.replaced > 0
            ? ` · ทับ mock เดิม ${data.replaced} แถว`
            : "") +
          (typeof data.skippedMatchedReal === "number" &&
          data.skippedMatchedReal > 0
            ? ` · ข้าม ${data.skippedMatchedReal} เพราะมีไลฟ์จริงแล้ว`
            : "") +
          skipped
      );
      setRows([emptyRow()]);
    } catch (err) {
      setError(err instanceof Error ? err.message : String(err));
    } finally {
      setBusy(false);
    }
  }

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          setMessage(null);
          setError(null);
        }}
        className={cn(
          buttonVariants({ size: "sm" }),
          CTA_PRIMARY_CLASS,
          "inline-flex items-center gap-1.5 font-semibold"
        )}
      >
        <Plus className="size-4" />
        <span>เพิ่มตัวอย่างไลฟ์</span>
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] w-[min(100%,calc(100vw-1rem))] max-w-2xl overflow-x-hidden overflow-y-auto rounded-3xl border border-[#f3b8c4]/20 bg-gradient-to-b from-[#220e18]/95 via-[#1a0c12]/95 to-[#12070c] p-4 text-[#fff5f7] shadow-[0_24px_60px_rgba(0,0,0,0.7)] backdrop-blur-xl sm:p-7 [scrollbar-color:rgba(232,90,122,0.3)_transparent] [scrollbar-width:thin]">
          <DialogHeader className="pr-6 text-left">
            <div className="flex items-center gap-2">
              <Sparkles className="size-4 text-[#e85a7a]" />
              <p className={META_CLASS}>Live Stream Operations</p>
            </div>
            <DialogTitle className="font-[family-name:var(--font-display)] text-xl font-normal break-words text-[#fff5f7] sm:text-2xl">
              เพิ่มตัวอย่างไลฟ์ล่วงหน้า
            </DialogTitle>
            <DialogDescription className="text-xs leading-relaxed break-words text-[#f7d7de]/75">
              Mock ข้อมูลเอง · Member (ดึงเฉพาะช่อง Mild-R) · Collab (ดึงจากลิงก์ช่องอื่น)
            </DialogDescription>
          </DialogHeader>

          {/* 🏷️ Segmented Mode Navigation Pills */}
          <div className="mt-4 flex items-center gap-1 rounded-full border border-[#f3b8c4]/15 bg-[#12070c]/90 p-1 shadow-inner">
            <button
              type="button"
              onClick={() => setTab("form")}
              className={cn(
                "min-w-0 flex-1 rounded-full px-2 py-1.5 text-center text-[0.7rem] font-semibold tracking-wider uppercase transition sm:px-3 sm:text-xs",
                tab === "form"
                  ? "border border-[#e85a7a]/60 bg-[#e85a7a]/25 text-[#fff5f7] shadow-[0_0_12px_rgba(232,90,122,0.3)]"
                  : "text-[#f3b8c4]/65 hover:text-[#fff5f7]"
              )}
            >
              ฟอร์ม
            </button>
            <button
              type="button"
              onClick={() => setTab("member")}
              className={cn(
                "inline-flex min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-2 py-1.5 text-center text-[0.7rem] font-semibold tracking-wider uppercase transition sm:gap-1.5 sm:px-3 sm:text-xs",
                tab === "member"
                  ? "border border-[#9b8cff]/60 bg-[#9b8cff]/25 text-[#f0ecff] shadow-[0_0_12px_rgba(155,140,255,0.3)]"
                  : "text-[#f3b8c4]/65 hover:text-[#cfc6ff]"
              )}
            >
              <Link2 className="size-3 shrink-0 sm:size-3.5" />
              <span>Member</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("collab")}
              className={cn(
                "inline-flex min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-2 py-1.5 text-center text-[0.7rem] font-semibold tracking-wider uppercase transition sm:gap-1.5 sm:px-3 sm:text-xs",
                tab === "collab"
                  ? "border border-[#d4a574]/60 bg-[#d4a574]/25 text-[#ffeedb] shadow-[0_0_12px_rgba(212,165,116,0.3)]"
                  : "text-[#f3b8c4]/65 hover:text-[#e8c49a]"
              )}
            >
              <Users className="size-3 shrink-0 sm:size-3.5" />
              <span>Collab</span>
            </button>
            <button
              type="button"
              onClick={() => setTab("json")}
              className={cn(
                "inline-flex min-w-0 flex-1 items-center justify-center gap-1 rounded-full px-2 py-1.5 text-center text-[0.7rem] font-semibold tracking-wider uppercase transition sm:gap-1.5 sm:px-3 sm:text-xs",
                tab === "json"
                  ? "border border-[#e85a7a]/60 bg-[#e85a7a]/25 text-[#fff5f7] shadow-[0_0_12px_rgba(232,90,122,0.3)]"
                  : "text-[#f3b8c4]/65 hover:text-[#fff5f7]"
              )}
            >
              <FileJson className="size-3 shrink-0 sm:size-3.5" />
              <span>JSON</span>
            </button>
          </div>

          {tab === "form" ? (
            <div className="mt-5 space-y-4">
              {rows.map((row, index) => (
                <div
                  key={row.key}
                  className="space-y-3.5 rounded-2xl border border-[#f3b8c4]/15 bg-gradient-to-b from-[#1c0c14]/85 to-[#14080e]/95 p-3.5 shadow-md transition hover:border-[#e85a7a]/35 sm:p-4"
                >
                  <div className="flex items-center justify-between gap-2 border-b border-[#f3b8c4]/10 pb-2.5">
                    <p className="text-xs font-semibold text-[#f3b8c4]">
                      รายการที่ {index + 1}
                      {row.member ? " · (Member Slot)" : ""}
                    </p>
                    {rows.length > 1 ? (
                      <button
                        type="button"
                        aria-label="ลบรายการ"
                        onClick={() =>
                          setRows((prev) =>
                            prev.filter((r) => r.key !== row.key)
                          )
                        }
                        className="rounded-lg p-1 text-[#f3b8c4]/50 transition hover:bg-rose-500/10 hover:text-rose-400"
                      >
                        <Trash2 className="size-4" />
                      </button>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap items-center gap-x-3 gap-y-2">
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[#cfc6ff]">
                      <input
                        type="checkbox"
                        checked={row.member}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r) =>
                              r.key === row.key
                                ? { ...r, member: e.target.checked }
                                : r
                            )
                          )
                        }
                        className="size-4 rounded accent-[#9b8cff]"
                      />
                      Member
                    </label>
                    {!(row.member && resolveIdFromLink(row.youtubeUrl)) ? (
                      <>
                        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[#f3b8c4]">
                          <input
                            type="checkbox"
                            checked={row.own}
                            onChange={(e) => {
                              const checked = e.target.checked;
                              const mild = LUMINA_CHANNELS.find((c) => c.isMain);
                              setRows((prev) =>
                                prev.map((r) =>
                                  r.key === row.key
                                    ? {
                                        ...r,
                                        own: checked,
                                        channelId: checked
                                          ? (mild?.channelId ?? r.channelId)
                                          : r.channelId === mild?.channelId
                                            ? ""
                                            : r.channelId,
                                      }
                                    : r
                                )
                              );
                            }}
                            className="size-4 rounded accent-[#e85a7a]"
                          />
                          ช่องตัวเอง (Mild-R)
                        </label>
                        <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-[#e8c49a]">
                          <input
                            type="checkbox"
                            checked={row.collab}
                            onChange={(e) =>
                              setRows((prev) =>
                                prev.map((r) =>
                                  r.key === row.key
                                    ? { ...r, collab: e.target.checked }
                                    : r
                                )
                              )
                            }
                            className="size-4 rounded accent-[#d4a574]"
                          />
                          Collab
                        </label>
                      </>
                    ) : null}
                    <label className="inline-flex cursor-pointer items-center gap-1.5 text-xs font-medium text-rose-300">
                      <input
                        type="checkbox"
                        checked={row.cancelled}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r) =>
                              r.key === row.key
                                ? { ...r, cancelled: e.target.checked }
                                : r
                            )
                          )
                        }
                        className="size-4 rounded accent-rose-500"
                      />
                      ยกเลิก (Ghost slot)
                    </label>
                  </div>

                  {row.member ? (
                    <label className="block space-y-1.5 text-xs text-[#cfc6ff]/90">
                      <span>ลิงก์ YouTube Member (ถ้ามี)</span>
                      <input
                        type="url"
                        value={row.youtubeUrl}
                        onChange={(e) =>
                          setRows((prev) =>
                            prev.map((r) =>
                              r.key === row.key
                                ? { ...r, youtubeUrl: e.target.value }
                                : r
                            )
                          )
                        }
                        placeholder="เช่น https://www.youtube.com/live/XZcXaFlzJzc (เว้นว่างเพื่อทำ Mock)"
                        className="w-full min-w-0 rounded-xl border border-[#9b8cff]/30 bg-[#12070c]/90 px-3.5 py-2 text-sm text-[#fff5f7] placeholder-[#9b8cff]/40 outline-none transition focus:border-[#9b8cff] focus:ring-1 focus:ring-[#9b8cff]/40"
                      />
                      <span className="block text-[0.68rem] text-[#cfc6ff]/60">
                        มีลิงก์ = ดึงจาก YouTube (รับเฉพาะช่อง Mild-R) · ไม่มี = จองตารางด้วยชื่อ/วัน/เวลา
                      </span>
                    </label>
                  ) : null}

                  {row.member && resolveIdFromLink(row.youtubeUrl) ? null : (
                    <>
                      <label className="block space-y-1.5 text-xs text-[#f3b8c4]/80">
                        <span>ชื่อไลฟ์</span>
                        <input
                          value={row.title}
                          onChange={(e) =>
                            setRows((prev) =>
                              prev.map((r) =>
                                r.key === row.key
                                  ? { ...r, title: e.target.value }
                                  : r
                              )
                            )
                          }
                          className="w-full min-w-0 rounded-xl border border-[#f3b8c4]/20 bg-[#12070c]/90 px-3.5 py-2 text-sm text-[#fff5f7] placeholder-[#f3b8c4]/30 outline-none transition focus:border-[#e85a7a] focus:ring-1 focus:ring-[#e85a7a]/30"
                          placeholder="เช่น 【Mild-R】Free Talk ชวนคุยยามดึก เล่นเกมชิลล์ๆ..."
                        />
                      </label>

                      <label className="block space-y-1.5 text-xs text-[#f3b8c4]/80">
                        <span>ช่องสตรีม{row.own ? "" : " *"}</span>
                        <select
                          value={row.channelId}
                          disabled={row.own}
                          onChange={(e) => {
                            const nextId = e.target.value;
                            const ch = LUMINA_CHANNELS.find(
                              (c) => c.channelId === nextId
                            );
                            setRows((prev) =>
                              prev.map((r) =>
                                r.key === row.key
                                  ? {
                                      ...r,
                                      channelId: nextId,
                                      own: Boolean(ch?.isMain),
                                      collab: ch?.isMain ? r.collab : true,
                                    }
                                  : r
                              )
                            );
                          }}
                          className="w-full min-w-0 rounded-xl border border-[#f3b8c4]/20 bg-[#12070c]/90 px-3.5 py-2 text-sm text-[#fff5f7] outline-none transition focus:border-[#e85a7a] disabled:opacity-50"
                        >
                          {!row.own ? (
                            <option value="" disabled>
                              เลือกช่อง
                            </option>
                          ) : null}
                          {channelOptions.map((ch) => (
                            <option key={ch.channelId} value={ch.channelId} className="bg-[#1a0c12]">
                              {ch.title} — {ch.channelTitle}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="grid grid-cols-1 gap-3 sm:grid-cols-2">
                        <label className="block min-w-0 space-y-1.5 text-xs text-[#f3b8c4]/80">
                          <span>วันที่ (Bangkok)</span>
                          <input
                            type="date"
                            value={row.date}
                            onChange={(e) =>
                              setRows((prev) =>
                                prev.map((r) =>
                                  r.key === row.key
                                    ? { ...r, date: e.target.value }
                                    : r
                                )
                              )
                            }
                            className="w-full min-w-0 rounded-xl border border-[#f3b8c4]/20 bg-[#12070c]/90 px-3 py-2 text-sm text-[#fff5f7] outline-none transition focus:border-[#e85a7a] [color-scheme:dark]"
                          />
                        </label>
                        <label className="block min-w-0 space-y-1.5 text-xs text-[#f3b8c4]/80">
                          <span>เวลา</span>
                          <input
                            type="time"
                            value={row.time}
                            onChange={(e) =>
                              setRows((prev) =>
                                prev.map((r) =>
                                  r.key === row.key
                                    ? { ...r, time: e.target.value }
                                    : r
                                )
                              )
                            }
                            className="w-full min-w-0 rounded-xl border border-[#f3b8c4]/20 bg-[#12070c]/90 px-3 py-2 text-sm text-[#fff5f7] outline-none transition focus:border-[#e85a7a] [color-scheme:dark]"
                          />
                        </label>
                      </div>

                      {!row.own && !row.channelId ? (
                        <p className="text-xs text-rose-300">
                          กรุณาเลือกช่องสตรีมเมื่อไม่ใช่ช่องตัวเอง
                        </p>
                      ) : null}
                    </>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() => setRows((prev) => [...prev, emptyRow()])}
                className="inline-flex items-center gap-1.5 text-xs font-semibold text-[#e85a7a] transition hover:underline"
              >
                <Plus className="size-3.5" />
                <span>เพิ่มอีกรายการ</span>
              </button>

              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  const problem = validateRows(rows);
                  if (problem) {
                    setError(problem);
                    return;
                  }
                  void submit(rows);
                }}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  CTA_PRIMARY_CLASS,
                  "mt-2 w-full font-semibold"
                )}
              >
                {busy ? "กำลังบันทึก…" : "บันทึกลงระบบ (Save)"}
              </button>
            </div>
          ) : tab === "member" ? (
            <div className="mt-5 space-y-3.5">
              <p className="text-xs leading-relaxed break-words text-[#cfc6ff]/85">
                วางลิงก์ YouTube Member ทีละบรรทัด ·{" "}
                <span className="font-semibold text-[#cfc6ff]">รับเฉพาะช่อง Mild-R</span> ·
                ระบบจะดึงชื่อ, ปก, วันเวลา และสถิติจาก YouTube API อัตโนมัติ
              </p>
              <div className="relative">
                <textarea
                  value={memberLinksText}
                  onChange={(e) => setMemberLinksText(e.target.value)}
                  rows={8}
                  placeholder={
                    "https://www.youtube.com/live/XZcXaFlzJzc\nhttps://www.youtube.com/watch?v=...\n(วางลิงก์ 1 บรรทัดต่อ 1 สตรีม)"
                  }
                  className="w-full min-w-0 resize-y break-all rounded-2xl border border-[#9b8cff]/30 bg-[#12070c]/90 p-3.5 font-mono text-xs text-[#f7d7de] placeholder-[#9b8cff]/30 outline-none transition focus:border-[#9b8cff] focus:ring-1 focus:ring-[#9b8cff]/30"
                  spellCheck={false}
                />
              </div>
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-[#cfc6ff]/60">
                  {
                    memberLinksText
                      .split(/\r?\n/)
                      .map((l) => l.trim())
                      .filter(Boolean).length
                  }{" "}
                  บรรทัด
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setMemberLinksText("");
                    setError(null);
                    setMessage(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-[#cfc6ff]/65 transition hover:text-[#cfc6ff]"
                >
                  <Eraser className="size-3.5" />
                  ล้างข้อความ
                </button>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  const parsed = parseYoutubeLinksText(
                    memberLinksText,
                    "member"
                  );
                  if (parsed.error && parsed.rows.length === 0) {
                    setError(parsed.error);
                    return;
                  }
                  if (parsed.error) setError(parsed.error);
                  else setError(null);
                  void submit(parsed.rows);
                }}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "w-full rounded-2xl border border-[#9b8cff]/60 bg-[#9b8cff] font-semibold text-[#140a0d] shadow-[0_10px_30px_rgba(155,140,255,0.35)] hover:bg-[#b5abff] disabled:opacity-50"
                )}
              >
                {busy ? "กำลังดึงข้อมูล YouTube…" : "บันทึก Member จากลิงก์"}
              </button>
            </div>
          ) : tab === "collab" ? (
            <div className="mt-5 space-y-3.5">
              <p className="text-xs leading-relaxed break-words text-[#e8c49a]/85">
                วางลิงก์ YouTube Collab ทีละบรรทัด · รับช่องอื่น (หรือช่อง Mild-R ที่มี ft.) · ระบบจะดึงชื่อ ปก เวลา สถิติจาก API
              </p>
              <textarea
                value={collabLinksText}
                onChange={(e) => setCollabLinksText(e.target.value)}
                rows={8}
                placeholder={
                  "https://www.youtube.com/live/...\nhttps://www.youtube.com/watch?v=...\n(วางลิงก์ 1 บรรทัดต่อ 1 สตรีม)"
                }
                className="w-full min-w-0 resize-y break-all rounded-2xl border border-[#d4a574]/35 bg-[#12070c]/90 p-3.5 font-mono text-xs text-[#f7d7de] placeholder-[#d4a574]/30 outline-none transition focus:border-[#d4a574] focus:ring-1 focus:ring-[#d4a574]/30"
                spellCheck={false}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs text-[#e8c49a]/60">
                  {
                    collabLinksText
                      .split(/\r?\n/)
                      .map((l) => l.trim())
                      .filter(Boolean).length
                  }{" "}
                  บรรทัด
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setCollabLinksText("");
                    setError(null);
                    setMessage(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-[#e8c49a]/65 transition hover:text-[#e8c49a]"
                >
                  <Eraser className="size-3.5" />
                  ล้างข้อความ
                </button>
              </div>
              <button
                type="button"
                disabled={busy}
                onClick={() => {
                  const parsed = parseYoutubeLinksText(
                    collabLinksText,
                    "collab"
                  );
                  if (parsed.error && parsed.rows.length === 0) {
                    setError(parsed.error);
                    return;
                  }
                  if (parsed.error) setError(parsed.error);
                  else setError(null);
                  void submit(parsed.rows);
                }}
                className={cn(
                  buttonVariants({ size: "lg" }),
                  "w-full rounded-2xl border border-[#d4a574]/60 bg-[#d4a574] font-semibold text-[#140a0d] shadow-[0_10px_30px_rgba(212,165,116,0.35)] hover:bg-[#e4be95] disabled:opacity-50"
                )}
              >
                {busy ? "กำลังดึงข้อมูล YouTube…" : "บันทึก Collab จากลิงก์"}
              </button>
            </div>
          ) : (
            <div className="mt-5 space-y-3.5">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="text-xs leading-relaxed break-words text-[#f3b8c4]/70">
                  Mock: title / channel / date / time / own / collab · Member:{" "}
                  <code className="text-[#cfc6ff]">member: true</code> · Collab:{" "}
                  <code className="text-[#e8c49a]">collab: true</code>
                </p>
                <div className="flex flex-wrap items-center gap-1.5">
                  <button
                    type="button"
                    onClick={handleCopyExampleJson}
                    className={cn(
                      "inline-flex items-center gap-1.5 rounded-xl border px-2.5 py-1 text-xs font-semibold transition",
                      copiedJson
                        ? "border-emerald-500/50 bg-emerald-500/15 text-emerald-300"
                        : "border-[#e85a7a]/40 bg-[#e85a7a]/15 text-[#f7d7de] hover:border-[#e85a7a] hover:bg-[#e85a7a]/25"
                    )}
                    title="คัดลอก JSON ตัวอย่างลง Clipboard"
                  >
                    {copiedJson ? (
                      <>
                        <Check className="size-3.5 text-emerald-400" />
                        <span>คัดลอกแล้ว!</span>
                      </>
                    ) : (
                      <>
                        <Copy className="size-3.5 text-[#e85a7a]" />
                        <span>คัดลอก JSON ตัวอย่าง</span>
                      </>
                    )}
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setJsonText(SAMPLE_JSON);
                      setError(null);
                      setMessage("ใส่ JSON ตัวอย่างเรียบร้อยแล้ว");
                    }}
                    className="inline-flex items-center gap-1 rounded-xl border border-[#f3b8c4]/20 bg-[#12070c] px-2.5 py-1 text-xs text-[#f3b8c4]/70 transition hover:border-[#f3b8c4]/40 hover:text-[#fff5f7]"
                    title="ใส่ JSON ตัวอย่างลงในช่อง"
                  >
                    <FileText className="size-3 text-[#f3b8c4]/60" />
                    <span>ใส่ตัวอย่าง</span>
                  </button>
                </div>
              </div>

              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                placeholder={SAMPLE_JSON}
                rows={10}
                className="w-full min-w-0 resize-y break-all rounded-2xl border border-[#f3b8c4]/20 bg-[#12070c]/90 p-3.5 font-mono text-xs text-[#f7d7de] placeholder-[#f3b8c4]/25 outline-none transition focus:border-[#e85a7a] focus:ring-1 focus:ring-[#e85a7a]/30"
                spellCheck={false}
              />
              <div className="flex flex-wrap items-center justify-between gap-2">
                <button
                  type="button"
                  onClick={() => {
                    setJsonText("");
                    setError(null);
                    setMessage(null);
                  }}
                  className="inline-flex items-center gap-1.5 text-xs text-[#f3b8c4]/60 transition hover:text-[#fff5f7]"
                >
                  <Eraser className="size-3.5" />
                  ล้างข้อความ
                </button>
                <div className="flex flex-wrap gap-2">
                  <button
                    type="button"
                    onClick={() => {
                      const textToParse = jsonText.trim() || SAMPLE_JSON;
                      const parsed = parseJsonToRows(textToParse);
                      if (parsed.error && parsed.rows.length === 0) {
                        setError(parsed.error);
                        return;
                      }
                      setError(parsed.error ?? null);
                      setRows(parsed.rows.length ? parsed.rows : [emptyRow()]);
                      setTab("form");
                      setMessage(`โหลดเข้าฟอร์มแล้ว ${parsed.rows.length} รายการ`);
                    }}
                    className={cn(
                      buttonVariants({ variant: "outline", size: "sm" }),
                      CTA_OUTLINE_CLASS,
                      "text-xs"
                    )}
                  >
                    โหลดเข้าฟอร์ม
                  </button>
                  <button
                    type="button"
                    disabled={busy}
                    onClick={() => {
                      if (!jsonText.trim()) {
                        setError("กรุณากรอก JSON หรือกด 'ใส่ตัวอย่าง' ก่อนบันทึก");
                        return;
                      }
                      const parsed = parseJsonToRows(jsonText);
                      if (parsed.error && parsed.rows.length === 0) {
                        setError(parsed.error);
                        return;
                      }
                      const problem = validateRows(parsed.rows);
                      if (problem) {
                        setError(problem);
                        return;
                      }
                      void submit(parsed.rows);
                    }}
                    className={cn(
                      buttonVariants({ size: "sm" }),
                      CTA_PRIMARY_CLASS,
                      "text-xs font-semibold"
                    )}
                  >
                    {busy ? "กำลังบันทึก…" : "บันทึกจาก JSON"}
                  </button>
                </div>
              </div>
            </div>
          )}

          {message ? (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3 text-xs text-emerald-200">
              <CheckCircle2 className="size-4 shrink-0 text-emerald-400" />
              <span>{message}</span>
            </div>
          ) : null}
          {error ? (
            <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-3 text-xs text-red-200">
              <AlertCircle className="size-4 shrink-0 text-red-400" />
              <span>{error}</span>
            </div>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
