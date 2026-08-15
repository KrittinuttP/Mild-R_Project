"use client";

import { useMemo, useState } from "react";
import { FileJson, Link2, Plus, Trash2 } from "lucide-react";

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
  url?: string;
};

const SAMPLE_JSON = `[
  {
    "title": "ตัวอย่างไลฟ์รอเปิด",
    "channel": "mild-r",
    "date": "2026-08-20",
    "time": "20:00",
    "member": false,
    "own": true,
    "collab": false
  },
  {
    "title": "Q&A สุดเอ็กซ์คลูซีฟกับมายด์",
    "channel": "mild-r",
    "date": "2026-08-16",
    "time": "20:30",
    "member": true,
    "own": true,
    "collab": false
  },
  {
    "member": true,
    "url": "https://www.youtube.com/live/XZcXaFlzJzc"
  }
]`;

function emptyRow(): DraftRow {
  const mild = LUMINA_CHANNELS.find((c) => c.isMain) ?? LUMINA_CHANNELS[0];
  return {
    key: crypto.randomUUID(),
    title: "",
    channelId: mild?.channelId ?? "",
    date: "",
    time: "20:00",
    own: true,
    collab: false,
    member: false,
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

const SAMPLE_MEMBER_LINKS = `https://www.youtube.com/live/XZcXaFlzJzc
`;

/** One YouTube link (or bare id) per line → member draft rows */
function parseMemberLinksText(text: string): {
  rows: DraftRow[];
  error?: string;
} {
  const lines = text
    .split(/\r?\n/)
    .map((l) => l.trim())
    .filter(Boolean);
  if (lines.length === 0) {
    return { rows: [], error: "วางลิงก์ YouTube อย่างน้อย 1 บรรทัด" };
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
      key: crypto.randomUUID(),
      member: true,
      youtubeUrl: line.startsWith("http")
        ? line
        : `https://www.youtube.com/watch?v=${id}`,
      own: true,
      collab: false,
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
            key: crypto.randomUUID(),
            member: true,
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
          key: crypto.randomUUID(),
          title,
          channelId: own
            ? (mild?.channelId ?? resolved?.channelId ?? "")
            : (resolved?.channelId ?? ""),
          date,
          time: typeof o.time === "string" && o.time ? o.time : "20:00",
          own,
          collab: parseBool(o.collab, o.isCollab) ?? !own,
          member: true,
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
        key: crypto.randomUUID(),
        title: typeof o.title === "string" ? o.title : "",
        channelId: own
          ? (mild?.channelId ?? resolved?.channelId ?? "")
          : (resolved?.channelId ?? ""),
        date: typeof o.date === "string" ? o.date : "",
        time: typeof o.time === "string" && o.time ? o.time : "20:00",
        own,
        collab: parseBool(o.collab, o.isCollab) ?? !own,
        member: false,
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
        own: row.own,
        collab: row.collab,
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
    };
  });
}

function validateRows(rows: DraftRow[]): string | null {
  for (let i = 0; i < rows.length; i++) {
    const row = rows[i];
    if (row.member && resolveIdFromLink(row.youtubeUrl)) {
      continue;
    }
    if (row.member && row.youtubeUrl.trim() && !resolveIdFromLink(row.youtubeUrl)) {
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
  const [jsonText, setJsonText] = useState(SAMPLE_JSON);
  const [tab, setTab] = useState<"form" | "json" | "member">("form");
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [memberLinksText, setMemberLinksText] = useState(SAMPLE_MEMBER_LINKS);

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
          buttonVariants({ variant: "outline", size: "sm" }),
          "rounded-none border-[#e85a7a]/35 bg-transparent text-[#e85a7a] hover:bg-[#e85a7a]/10"
        )}
      >
        <Plus className="size-3.5" />
        เพิ่มตัวอย่างไลฟ์
      </button>

      <Dialog open={open} onOpenChange={setOpen}>
        <DialogContent className="max-h-[90dvh] w-[min(100%,calc(100vw-1rem))] max-w-2xl overflow-y-auto border-[#f3b8c4]/20 bg-[#140a0d] text-[#fff5f7]">
          <DialogHeader className="text-left">
            <DialogTitle className="font-[family-name:var(--font-display)] text-xl">
              เพิ่มตัวอย่างไลฟ์ล่วงหน้า
            </DialogTitle>
            <DialogDescription className="text-[#f3b8c4]/70">
              Mock ใส่รายละเอียดเอง · Member ใส่แค่ลิงก์ YouTube แล้วดึงทุกอย่างจาก
              API
            </DialogDescription>
          </DialogHeader>

          <div className="mt-2 flex flex-wrap gap-2">
            <button
              type="button"
              onClick={() => setTab("form")}
              className={cn(
                "px-3 py-1.5 text-[0.65rem] tracking-[0.16em] uppercase",
                tab === "form"
                  ? "border border-[#e85a7a]/45 bg-[#e85a7a]/12 text-[#e85a7a]"
                  : "border border-[#f3b8c4]/15 text-[#f3b8c4]/65"
              )}
            >
              ฟอร์ม
            </button>
            <button
              type="button"
              onClick={() => setTab("member")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 text-[0.65rem] tracking-[0.16em] uppercase",
                tab === "member"
                  ? "border border-[#9b8cff]/50 bg-[#9b8cff]/12 text-[#cfc6ff]"
                  : "border border-[#f3b8c4]/15 text-[#f3b8c4]/65"
              )}
            >
              <Link2 className="size-3.5" />
              Member
            </button>
            <button
              type="button"
              onClick={() => setTab("json")}
              className={cn(
                "inline-flex items-center gap-1.5 px-3 py-1.5 text-[0.65rem] tracking-[0.16em] uppercase",
                tab === "json"
                  ? "border border-[#e85a7a]/45 bg-[#e85a7a]/12 text-[#e85a7a]"
                  : "border border-[#f3b8c4]/15 text-[#f3b8c4]/65"
              )}
            >
              <FileJson className="size-3.5" />
              JSON
            </button>
          </div>

          {tab === "form" ? (
            <div className="mt-4 space-y-4">
              {rows.map((row, index) => (
                <div
                  key={row.key}
                  className="space-y-3 border border-[#f3b8c4]/14 bg-[#1a0d12]/50 p-3"
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="text-[0.62rem] tracking-[0.16em] text-[#f3b8c4]/55 uppercase">
                      รายการ {index + 1}
                      {row.member ? " · Member" : ""}
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
                        className="text-[#f3b8c4]/50 hover:text-[#e85a7a]"
                      >
                        <Trash2 className="size-3.5" />
                      </button>
                    ) : null}
                  </div>

                  <div className="flex flex-wrap gap-4">
                    <label className="inline-flex items-center gap-2 text-xs text-[#b8d9ec]">
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
                        className="size-3.5 accent-[#9b8cff]"
                      />
                      Member
                    </label>
                    {!(row.member && resolveIdFromLink(row.youtubeUrl)) ? (
                      <>
                        <label className="inline-flex items-center gap-2 text-xs text-[#f3b8c4]">
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
                            className="size-3.5 accent-[#e85a7a]"
                          />
                          ช่องตัวเอง (Mild-R)
                        </label>
                        <label className="inline-flex items-center gap-2 text-xs text-[#e8c49a]">
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
                            className="size-3.5 accent-[#d4a574]"
                          />
                          Collab
                        </label>
                      </>
                    ) : null}
                  </div>

                  {row.member ? (
                    <label className="block space-y-1 text-xs text-[#cfc6ff]/85">
                      ลิงก์ YouTube (ถ้ามี)
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
                        placeholder="https://www.youtube.com/live/… (ว่าง = mock)"
                        className="w-full border border-[#9b8cff]/30 bg-[#10070b] px-2.5 py-2 text-sm text-[#fff5f7] outline-none focus:border-[#9b8cff]/55"
                      />
                      <span className="block text-[0.65rem] text-[#cfc6ff]/55">
                        มีลิงก์ = ดึงจาก YouTube · ไม่มี = จองตารางด้วยชื่อ/วัน/เวลา
                      </span>
                    </label>
                  ) : null}

                  {row.member && resolveIdFromLink(row.youtubeUrl) ? null : (
                    <>
                      <label className="block space-y-1 text-xs text-[#f3b8c4]/70">
                        ชื่อไลฟ์
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
                          className="w-full border border-[#f3b8c4]/20 bg-[#10070b] px-2.5 py-2 text-sm text-[#fff5f7] outline-none focus:border-[#e85a7a]/45"
                          placeholder="ชื่อไลฟ์"
                        />
                      </label>

                      <label className="block space-y-1 text-xs text-[#f3b8c4]/70">
                        ช่องไลฟ์{row.own ? "" : " *"}
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
                          className="w-full border border-[#f3b8c4]/20 bg-[#10070b] px-2.5 py-2 text-sm text-[#fff5f7] outline-none focus:border-[#e85a7a]/45 disabled:opacity-50"
                        >
                          {!row.own ? (
                            <option value="" disabled>
                              เลือกช่อง
                            </option>
                          ) : null}
                          {channelOptions.map((ch) => (
                            <option key={ch.channelId} value={ch.channelId}>
                              {ch.title} — {ch.channelTitle}
                            </option>
                          ))}
                        </select>
                      </label>

                      <div className="grid grid-cols-2 gap-2">
                        <label className="block space-y-1 text-xs text-[#f3b8c4]/70">
                          วันที่ (Bangkok)
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
                            className="w-full border border-[#f3b8c4]/20 bg-[#10070b] px-2.5 py-2 text-sm text-[#fff5f7] outline-none focus:border-[#e85a7a]/45"
                          />
                        </label>
                        <label className="block space-y-1 text-xs text-[#f3b8c4]/70">
                          เวลา
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
                            className="w-full border border-[#f3b8c4]/20 bg-[#10070b] px-2.5 py-2 text-sm text-[#fff5f7] outline-none focus:border-[#e85a7a]/45"
                          />
                        </label>
                      </div>

                      {!row.own && !row.channelId ? (
                        <p className="text-[0.7rem] text-[#ffb3bc]">
                          เลือกช่องไลฟ์เมื่อไม่ใช่ช่องตัวเอง
                        </p>
                      ) : null}
                    </>
                  )}
                </div>
              ))}

              <button
                type="button"
                onClick={() => setRows((prev) => [...prev, emptyRow()])}
                className="text-xs text-[#f3b8c4]/70 underline-offset-4 hover:text-[#fff5f7] hover:underline"
              >
                + เพิ่มอีกวัน/รายการ
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
                  "w-full rounded-xl border-transparent bg-[#e85a7a] text-white hover:bg-[#f06b88] disabled:opacity-50"
                )}
              >
                {busy ? "กำลังบันทึก…" : "บันทึกลง Supabase"}
              </button>
            </div>
          ) : tab === "member" ? (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-[#cfc6ff]/75">
                วางลิงก์ YouTube Member ทีละบรรทัด · ดึงชื่อ ปก เวลา ช่อง
                สถิติจาก API อัตโนมัติ
              </p>
              <textarea
                value={memberLinksText}
                onChange={(e) => setMemberLinksText(e.target.value)}
                rows={12}
                placeholder={
                  "https://www.youtube.com/live/…\nhttps://www.youtube.com/watch?v=…"
                }
                className="w-full resize-y border border-[#9b8cff]/30 bg-[#10070b] px-3 py-2 font-mono text-xs text-[#f7d7de] outline-none focus:border-[#9b8cff]/55"
                spellCheck={false}
              />
              <p className="text-[0.65rem] text-[#cfc6ff]/50">
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
                disabled={busy}
                onClick={() => {
                  const parsed = parseMemberLinksText(memberLinksText);
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
                  "w-full rounded-xl border-transparent bg-[#9b8cff] text-[#140a0d] hover:bg-[#b0a6ff] disabled:opacity-50"
                )}
              >
                {busy ? "กำลังดึงจาก YouTube…" : "บันทึก Member จากลิงก์"}
              </button>
            </div>
          ) : (
            <div className="mt-4 space-y-3">
              <p className="text-xs text-[#f3b8c4]/60">
                Mock: title / channel / date / time / own / collab · Member mock:{" "}
                <code className="text-[#cfc6ff]/90">member: true</code> +
                title/date (ไม่มี url) · Member จริง:{" "}
                <code className="text-[#cfc6ff]/90">member: true</code> +{" "}
                <code className="text-[#cfc6ff]/90">url</code>
              </p>
              <textarea
                value={jsonText}
                onChange={(e) => setJsonText(e.target.value)}
                rows={14}
                className="w-full resize-y border border-[#f3b8c4]/20 bg-[#10070b] px-3 py-2 font-mono text-xs text-[#f7d7de] outline-none focus:border-[#e85a7a]/45"
                spellCheck={false}
              />
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={() => {
                    const parsed = parseJsonToRows(jsonText);
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
                    "rounded-none border-[#f3b8c4]/25 bg-transparent"
                  )}
                >
                  โหลดเข้าฟอร์ม
                </button>
                <button
                  type="button"
                  disabled={busy}
                  onClick={() => {
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
                    "rounded-none border-transparent bg-[#e85a7a] text-white hover:bg-[#f06b88] disabled:opacity-50"
                  )}
                >
                  {busy ? "กำลังบันทึก…" : "บันทึกจาก JSON"}
                </button>
              </div>
            </div>
          )}

          {message ? (
            <p className="mt-3 text-sm text-[#a8e6d4]">{message}</p>
          ) : null}
          {error ? (
            <p className="mt-3 text-sm text-[#ffb3bc]">{error}</p>
          ) : null}
        </DialogContent>
      </Dialog>
    </>
  );
}
