"use client";

import { useEffect, useState } from "react";
import { AlertTriangle, CheckCircle2, Clock3, KeyRound, Loader2 } from "lucide-react";

import type { CafeGateResponse } from "@/app/api/cafe/gate/route";
import { GOLD_BUTTON, KeyholePlate } from "@/components/cafe/board/brass";
import { LABEL, SERIF, THAI } from "@/components/cafe/board/pieces";
import { useNow } from "@/hooks/useNow";
import type { CafePhase, PageMode, PhaseMode } from "@/lib/cafe-gate";
import { cn } from "@/lib/utils";

// Types only from lib/cafe-gate: its values carry the default dates, which
// stay out of browser code. Everything shown here comes from /api/cafe/gate.

const PAPER = "relative bg-cafe-cream text-cafe-ink shadow-[0_18px_34px_rgba(0,0,0,0.5)]";
const BKK_OFFSET_MS = 7 * 60 * 60 * 1000;

const PHASE_NAME: Record<CafePhase, string> = {
  countdown: "CD1 · A Case Is Brewing",
  teaser: "CD2 · โลโก้ + ทีเซอร์แรก",
  open: "คาเฟ่จริง · เปิดแล้ว",
};

const PHASE_OPTIONS: { value: PhaseMode; label: string; hint: string }[] = [
  { value: "auto", label: "ตามเวลา", hint: "สลับเองตามเวลาด้านบน" },
  { value: "countdown", label: "บังคับ CD1", hint: "ค้างที่ CD1 แม้ถึงเวลา" },
  { value: "teaser", label: "บังคับ CD2", hint: "ค้างที่ CD2 แม้ถึงเวลา" },
  { value: "open", label: "เปิดคาเฟ่", hint: "เปิดทุกหน้าทันที" },
];

const HUNT_OPTIONS: { value: PageMode; label: string; hint: string }[] = [
  { value: "auto", label: "ตามคาเฟ่", hint: "เปิดพร้อมคาเฟ่จริง" },
  { value: "open", label: "เปิด", hint: "เปิดแม้คาเฟ่ยังล็อก" },
  { value: "locked", label: "ล็อก", hint: "ปิดแม้คาเฟ่เปิดแล้ว" },
];

const SOURCE_TEXT = {
  time: "ตามเวลา",
  db: "ตั้งเองในหน้านี้ (บังคับ)",
  env: "env ทดสอบ CAFE_PHASE",
} as const;

/** Bangkok wall time, e.g. "23 ต.ค. 2026 · 18:12". */
function formatBkk(ms: number, withSeconds = false) {
  return new Intl.DateTimeFormat("th-TH-u-ca-gregory", {
    timeZone: "Asia/Bangkok",
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: withSeconds ? "2-digit" : undefined,
    hour12: false,
  }).format(new Date(ms));
}

/** Epoch ms ↔ `<input type="datetime-local">` value, always read as GMT+7. */
function toInput(ms: number) {
  return new Date(ms + BKK_OFFSET_MS).toISOString().slice(0, 16);
}
function fromInput(value: string) {
  return Date.parse(`${value}:00+07:00`);
}

function formatLeft(ms: number) {
  const total = Math.max(0, Math.floor(ms / 1000));
  const days = Math.floor(total / 86400);
  const clock = [
    Math.floor((total % 86400) / 3600),
    Math.floor((total % 3600) / 60),
    total % 60,
  ]
    .map((n) => String(n).padStart(2, "0"))
    .join(":");
  return days > 0 ? `${days} วัน ${clock}` : clock;
}

function phaseAt(teaserAt: number, openAt: number, now: number, mode: PhaseMode): CafePhase {
  if (mode !== "auto") return mode;
  if (now < teaserAt) return "countdown";
  if (now < openAt) return "teaser";
  return "open";
}

type Form = { teaser: string; open: string; phase: PhaseMode; hunt: PageMode };

function formOf(data: CafeGateResponse): Form {
  return {
    teaser: toInput(data.config.teaserAt),
    open: toInput(data.config.openAt),
    phase: data.config.phase,
    hunt: data.config.hunt,
  };
}

function Choice<T extends string>({
  name,
  options,
  value,
  onChange,
  disabled,
}: {
  name: string;
  options: { value: T; label: string; hint: string }[];
  value: T;
  onChange: (value: T) => void;
  disabled: boolean;
}) {
  return (
    <div role="radiogroup" aria-label={name} className="grid grid-cols-2 gap-2 sm:grid-cols-4">
      {options.map((option) => {
        const active = option.value === value;
        return (
          <button
            key={option.value}
            type="button"
            role="radio"
            aria-checked={active}
            disabled={disabled}
            onClick={() => onChange(option.value)}
            className={cn(
              "flex min-h-14 flex-col items-start justify-center border-2 px-3 py-2 text-left transition disabled:opacity-50",
              "focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cafe-gold",
              active
                ? "border-cafe-gold-deep bg-cafe-gold text-cafe-ink"
                : "border-cafe-ink/20 bg-cafe-cream-light text-cafe-ink hover:border-cafe-gold-deep"
            )}
          >
            <span className={cn(THAI, "text-sm font-bold")}>{option.label}</span>
            <span className={cn(THAI, "text-xs text-cafe-ink-soft")}>{option.hint}</span>
          </button>
        );
      })}
    </div>
  );
}

/** Settings card: what visitors of /cafe get now, and when it switches. */
export function CafeGatePanel() {
  const [data, setData] = useState<CafeGateResponse | null>(null);
  /** serverNow − Date.now() at load, so the clock shows server time. */
  const [offset, setOffset] = useState(0);
  const [form, setForm] = useState<Form | null>(null);
  const [saving, setSaving] = useState(false);
  const [confirming, setConfirming] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const tick = useNow(1000);
  const now = (tick ?? data?.serverNow ?? 0) + (tick === null ? 0 : offset);

  function apply(next: CafeGateResponse) {
    setData(next);
    setOffset(next.serverNow - Date.now());
    setForm(formOf(next));
    setConfirming(false);
  }

  useEffect(() => {
    let alive = true;
    fetch("/api/cafe/gate")
      .then(async (res) => {
        const json = (await res.json()) as CafeGateResponse & { error?: string };
        if (!alive) return;
        if (!res.ok) setError(json.error ?? "โหลดสถานะล็อกไม่สำเร็จ");
        else apply(json);
      })
      .catch(() => alive && setError("โหลดสถานะล็อกไม่สำเร็จ"));
    return () => {
      alive = false;
    };
  }, []);

  if (!data || !form) {
    return (
      <div className={cn(PAPER, "mt-10 flex items-center gap-3 px-5 py-6 sm:px-6")}>
        {error ? (
          <p role="alert" className="text-sm font-semibold text-cafe-wax">
            {error}
          </p>
        ) : (
          <>
            <Loader2 className="size-4 animate-spin text-cafe-gold-deep" />
            <span className={cn(THAI, "text-sm")}>กำลังโหลดสถานะล็อก…</span>
          </>
        )}
      </div>
    );
  }

  const teaserAt = fromInput(form.teaser);
  const openAt = fromInput(form.open);
  const timesValid = Number.isFinite(teaserAt) && Number.isFinite(openAt);
  const orderOk = timesValid && teaserAt < openAt;
  const dirty =
    form.phase !== data.config.phase ||
    form.hunt !== data.config.hunt ||
    teaserAt !== data.config.teaserAt ||
    openAt !== data.config.openAt;

  // Saving opens the cafe (or the hunt) earlier than visitors get it now.
  const openNow = data.state.phase === "open";
  const opensCafe = !openNow && timesValid && phaseAt(teaserAt, openAt, now, form.phase) === "open";
  const opensHunt = !data.state.huntOpen && form.hunt === "open";
  const risky = opensCafe || opensHunt;

  const next = data.next;
  const canSave = data.stored && dirty && orderOk && !saving;

  async function save() {
    if (!form || !canSave) return;
    if (risky && !confirming) {
      setConfirming(true);
      return;
    }
    setSaving(true);
    setError(null);
    setStatus(null);
    try {
      const res = await fetch("/api/cafe/gate", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ phase: form.phase, hunt: form.hunt, teaserAt, openAt }),
      });
      const json = (await res.json()) as CafeGateResponse & { error?: string };
      if (!res.ok) {
        setError(json.error ?? "บันทึกไม่สำเร็จ");
        return;
      }
      apply(json);
      setStatus("บันทึกแล้ว · server เครื่องอื่นจะตามภายใน 30 วินาที");
    } catch {
      setError("บันทึกไม่สำเร็จ");
    } finally {
      setSaving(false);
    }
  }

  return (
    <section aria-labelledby="cafe-gate-title" className={cn(PAPER, "mt-10 px-5 pt-7 pb-6 sm:px-6")}>
      <KeyholePlate className="top-0 left-1/2 -translate-x-1/2 -translate-y-[60%]" />
      <p className={cn(LABEL, "flex items-center gap-2 text-[10px] text-cafe-gold-deep sm:text-[10px]")}>
        <KeyRound className="size-3.5" aria-hidden />
        Page lock · ล็อกหน้าตามเวลา
      </p>
      <h2 id="cafe-gate-title" className={cn(SERIF, "mt-1 text-xl font-bold")}>
        ผู้ชมที่เปิด /cafe ตอนนี้เห็นอะไร
      </h2>

      {/* Live status */}
      <dl className="mt-4 grid gap-3 bg-cafe-forest px-4 py-4 text-cafe-cream sm:grid-cols-2">
        <div>
          <dt className={cn(LABEL, "text-[10px] sm:text-[10px]")}>เวลา server (ไทย)</dt>
          <dd className="mt-1 flex items-center gap-2 font-[family-name:var(--font-cafe-type)] text-base tabular-nums">
            <Clock3 className="size-4 text-cafe-gold-soft" aria-hidden />
            {formatBkk(now, true)}
          </dd>
        </div>
        <div>
          <dt className={cn(LABEL, "text-[10px] sm:text-[10px]")}>ตอนนี้แสดง</dt>
          <dd className={cn(THAI, "mt-1 text-base font-bold")}>
            {PHASE_NAME[data.state.phase]}
            <span className="ml-2 text-xs font-normal text-cafe-cream/75">
              ({SOURCE_TEXT[data.state.source]})
            </span>
          </dd>
        </div>
        <div>
          <dt className={cn(LABEL, "text-[10px] sm:text-[10px]")}>สลับครั้งถัดไป</dt>
          <dd className={cn(THAI, "mt-1 text-sm")}>
            {next ? (
              <>
                เป็น {PHASE_NAME[next.to]} ในอีก{" "}
                <span className="font-[family-name:var(--font-cafe-type)] tabular-nums">
                  {formatLeft(next.at - now)}
                </span>
                <br />
                <span className="text-cafe-cream/75">{formatBkk(next.at)}</span>
              </>
            ) : (
              <span className="text-cafe-cream/75">
                {data.state.source === "time" ? "เปิดครบแล้ว" : "ไม่สลับเอง (ถูกบังคับไว้)"}
              </span>
            )}
          </dd>
        </div>
        <div>
          <dt className={cn(LABEL, "text-[10px] sm:text-[10px]")}>Hunt (เกม QR)</dt>
          <dd className={cn(THAI, "mt-1 text-sm font-bold")}>
            {data.state.huntOpen ? "เปิด" : "ล็อก"}
          </dd>
        </div>
      </dl>

      {data.env.bypass || data.env.phase ? (
        <p className="mt-3 flex gap-2 border-l-[3px] border-cafe-gold-deep bg-cafe-gold/15 px-3 py-2 text-sm">
          <AlertTriangle className="mt-0.5 size-4 shrink-0 text-cafe-gold-deep" aria-hidden />
          <span className={THAI}>
            เครื่องนี้มี env ทดสอบ
            {data.env.bypass ? " · CAFE_GATE_BYPASS=1 (ไม่สนการล็อก)" : ""}
            {data.env.phase ? ` · CAFE_PHASE=${data.env.phase}` : ""} — ไม่มีผลบน production
          </span>
        </p>
      ) : null}

      {!data.stored ? (
        <p role="alert" className="mt-3 flex gap-2 border-l-[3px] border-cafe-wax bg-cafe-wax/10 px-3 py-2 text-sm text-cafe-wax">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span className={THAI}>
            อ่านตาราง cafe_gate ไม่ได้ ({data.error ?? "ยังไม่มีข้อมูล"}) · ตอนนี้ใช้เวลาในโค้ด
            และยังบันทึกไม่ได้ — รัน <code>npm run db:migrate:cafe-gate</code> ก่อน
          </span>
        </p>
      ) : null}

      <p className={cn(THAI, "mt-3 text-xs text-cafe-ink-soft")}>
        คุณปลดล็อกด้วยรหัสทีมอยู่ จึงเปิดคาเฟ่จริงได้ทุกหน้า · ถ้าจะดูแบบผู้ชม ให้เปิดหน้าต่างไม่ระบุตัวตน
      </p>

      {/* Times */}
      <fieldset className="mt-6" disabled={saving}>
        <legend className={cn(LABEL, "text-[10px] text-cafe-gold-deep sm:text-[10px]")}>
          เวลาสลับ · เวลาไทย (GMT+7)
        </legend>
        <div className="mt-2 grid gap-3 sm:grid-cols-2">
          {(
            [
              ["teaser", "CD1 → CD2 (ทีเซอร์แรก)", teaserAt],
              ["open", "CD2 → เปิดคาเฟ่", openAt],
            ] as const
          ).map(([key, label, ms]) => (
            <label key={key} className="block">
              <span className={cn(THAI, "text-sm font-bold")}>{label}</span>
              <input
                type="datetime-local"
                value={form[key]}
                onChange={(event) => {
                  setConfirming(false);
                  setForm({ ...form, [key]: event.target.value });
                }}
                className="mt-1 h-11 w-full border-2 border-cafe-ink bg-cafe-cream-light px-3 font-[family-name:var(--font-cafe-type)] text-base text-cafe-ink focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cafe-gold"
              />
              {Number.isFinite(ms) && ms <= now ? (
                <span className={cn(THAI, "mt-1 block text-xs font-semibold text-cafe-wax")}>
                  เวลานี้ผ่านไปแล้ว
                </span>
              ) : null}
            </label>
          ))}
        </div>
        {timesValid && !orderOk ? (
          <p className={cn(THAI, "mt-2 text-sm font-semibold text-cafe-wax")}>
            เวลาเปิด CD2 ต้องมาก่อนเวลาเปิดคาเฟ่
          </p>
        ) : null}
      </fieldset>

      <div className="mt-6">
        <p className={cn(LABEL, "text-[10px] text-cafe-gold-deep sm:text-[10px]")}>
          หน้า /cafe
        </p>
        <div className="mt-2">
          <Choice
            name="โหมดหน้า /cafe"
            options={PHASE_OPTIONS}
            value={form.phase}
            disabled={saving}
            onChange={(phase) => {
              setConfirming(false);
              setForm({ ...form, phase });
            }}
          />
        </div>
      </div>

      <div className="mt-5">
        <p className={cn(LABEL, "text-[10px] text-cafe-gold-deep sm:text-[10px]")}>
          Hunt · /cafe/hunt
        </p>
        <div className="mt-2">
          <Choice
            name="โหมดหน้า hunt"
            options={HUNT_OPTIONS}
            value={form.hunt}
            disabled={saving}
            onChange={(hunt) => {
              setConfirming(false);
              setForm({ ...form, hunt });
            }}
          />
        </div>
      </div>

      {confirming ? (
        <p role="alert" className="mt-5 flex gap-2 border-l-[3px] border-cafe-wax bg-cafe-wax/10 px-3 py-2 text-sm text-cafe-wax">
          <AlertTriangle className="mt-0.5 size-4 shrink-0" aria-hidden />
          <span className={THAI}>
            {opensCafe ? "ค่านี้จะเปิดคาเฟ่จริงให้ทุกคนเห็นทันที" : "ค่านี้จะเปิดเกม hunt ทันที"} ·
            กดปุ่มอีกครั้งเพื่อยืนยัน
          </span>
        </p>
      ) : null}

      <div className="mt-5 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={save}
          disabled={!canSave}
          className={cn(GOLD_BUTTON, "min-h-12 w-auto px-6 text-sm disabled:cursor-not-allowed disabled:opacity-50")}
        >
          {saving ? <Loader2 className="size-4 animate-spin" /> : null}
          {confirming ? "ยืนยันบันทึก" : "บันทึก"}
        </button>
        {dirty && !saving ? (
          <button
            type="button"
            onClick={() => {
              setForm(formOf(data));
              setConfirming(false);
            }}
            className={cn(THAI, "min-h-11 text-sm font-semibold text-cafe-forest underline underline-offset-4")}
          >
            ยกเลิกการแก้
          </button>
        ) : null}
      </div>

      {error ? (
        <p role="alert" className="mt-3 text-sm font-semibold text-cafe-wax">
          {error}
        </p>
      ) : null}
      {status ? (
        <p role="status" className="mt-3 flex items-center gap-2 text-sm text-cafe-forest">
          <CheckCircle2 className="size-4 shrink-0" aria-hidden />
          {status}
        </p>
      ) : null}
    </section>
  );
}
