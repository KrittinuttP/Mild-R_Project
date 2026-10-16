"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { ArrowLeft, CheckCircle2, Eye, EyeOff, FileLock2, Home, Lock, Settings2, Unlock } from "lucide-react";

import { GOLD_BUTTON, KeyholePlate } from "@/components/cafe/board/brass";
import { LABEL, SERIF, THAI } from "@/components/cafe/board/pieces";
import {
  CAFE_CONTENT_SECTION_KEYS,
  CAFE_SECTION_META,
  defaultCafeVisibility,
  type CafeSectionKey,
  type CafeSectionVisibilityMap,
} from "@/lib/cafe-visibility";
import { cn } from "@/lib/utils";

/** Cream paper of the cafe board. */
const PAPER =
  "relative bg-cafe-cream text-cafe-ink shadow-[0_18px_34px_rgba(0,0,0,0.5)]";
/** Text link back to the board, on the green wall. */
const WALL_LINK =
  "inline-flex min-h-11 items-center gap-2 text-sm font-semibold text-cafe-gold-soft underline underline-offset-4 transition hover:text-cafe-cream focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cafe-gold";
/** Visible / hidden switch: gold when declassified, wax red when top secret. */
function switchClass(visible: boolean) {
  return cn(
    LABEL,
    "shrink-0 border-2 px-3.5 pt-2 pb-1.5 text-[10px] transition disabled:opacity-50 sm:text-[10px]",
    "focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cafe-gold",
    visible
      ? "border-cafe-gold-deep bg-cafe-gold text-cafe-ink hover:bg-cafe-gold-soft"
      : "border-cafe-wax bg-transparent text-cafe-wax hover:bg-cafe-wax/10"
  );
}

type SectionRow = {
  key: CafeSectionKey;
  visible: boolean;
  label: string;
  labelLocal: string;
};

export function CafeSettingsClient() {
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [visibility, setVisibility] = useState<CafeSectionVisibilityMap>(
    defaultCafeVisibility()
  );
  const [savingKey, setSavingKey] = useState<CafeSectionKey | null>(null);
  const [status, setStatus] = useState<string | null>(null);
  const [loadingSections, setLoadingSections] = useState(false);
  const flashTimer = useRef<number | null>(null);

  const loadSections = useCallback(async () => {
    setLoadingSections(true);
    try {
      const res = await fetch("/api/cafe/settings");
      if (!res.ok) {
        setUnlocked(false);
        return;
      }
      const data = (await res.json()) as {
        visibility: CafeSectionVisibilityMap;
      };
      setVisibility(data.visibility);
      setUnlocked(true);
    } finally {
      setLoadingSections(false);
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/cafe/settings/unlock");
        const data = (await res.json()) as { unlocked?: boolean };
        if (cancelled) return;
        if (data.unlocked) {
          setUnlocked(true);
          await loadSections();
        }
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
    };
  }, [loadSections]);

  async function unlock(event: FormEvent) {
    event.preventDefault();
    setError(null);
    const res = await fetch("/api/cafe/settings/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ password }),
    });
    if (!res.ok) {
      const data = (await res.json().catch(() => null)) as {
        error?: string;
      } | null;
      setError(data?.error ?? "ปลดล็อกไม่สำเร็จ");
      return;
    }
    setPassword("");
    setUnlocked(true);
    await loadSections();
  }

  async function lock() {
    await fetch("/api/cafe/settings/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "lock" }),
    });
    setUnlocked(false);
    setVisibility(defaultCafeVisibility());
  }

  async function onToggle(key: CafeSectionKey) {
    const nextValue = !visibility[key];
    const previous = visibility;
    const next = { ...visibility, [key]: nextValue };
    setVisibility(next);
    setError(null);
    setSavingKey(key);
    setStatus(null);

    try {
      const res = await fetch("/api/cafe/settings", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ visibility: { [key]: nextValue } }),
      });
      const data = (await res.json()) as {
        visibility?: CafeSectionVisibilityMap;
        error?: string;
      };
      if (!res.ok) {
        setVisibility(previous);
        setError(data.error ?? "บันทึกไม่สำเร็จ");
        return;
      }
      if (data.visibility) setVisibility(data.visibility);
      setStatus(
        key === "mainSiteLink"
          ? nextValue
            ? "Main Site Link · แสดงบน header"
            : "Main Site Link · ซ่อนจาก header"
          : nextValue
            ? `${CAFE_SECTION_META[key].label} · เปิดการมองเห็น (Declassified)`
            : `${CAFE_SECTION_META[key].label} · ซ่อนเนื้อหา (Top Secret)`
      );
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout(() => setStatus(null), 2500);
    } catch {
      setVisibility(previous);
      setError("บันทึกไม่สำเร็จ");
    } finally {
      setSavingKey(null);
    }
  }

  if (checking) {
    return (
      <div className="flex min-h-[50vh] flex-col items-center justify-center gap-3 text-center">
        <span className="size-3 animate-ping rounded-full bg-cafe-gold" />
        <p className={LABEL}>Checking clearance…</p>
      </div>
    );
  }

  if (!unlocked) {
    return (
      <div className="mx-auto max-w-md pt-10">
        <form onSubmit={unlock} className={cn(PAPER, "px-6 pt-8 pb-6 sm:px-8")}>
          <KeyholePlate className="top-0 left-1/2 -translate-x-1/2 -translate-y-[60%]" />
          <div className="flex items-center justify-between gap-3">
            <p className={cn(LABEL, "text-[10px] text-cafe-gold-deep sm:text-[10px]")}>
              Restricted access
            </p>
            <span
              className={cn(
                LABEL,
                "rotate-[4deg] border-2 border-cafe-wax px-2 pt-1 pb-0.5 text-[10px] text-cafe-wax sm:text-[10px]"
              )}
            >
              Staff only
            </span>
          </div>
          <h1 className={cn(SERIF, "mt-3 text-[1.7rem] font-bold")}>Cafe Settings</h1>
          <p className="mt-2 text-sm leading-relaxed text-cafe-ink-soft">
            ใส่รหัสทีมเพื่อเปิด/ปิดส่วนแสดงผลบนหน้าคาเฟ่
          </p>
          <label className="mt-6 block">
            <span className={cn(LABEL, "text-[10px] text-cafe-ink-muted sm:text-[10px]")}>
              Clearance code
            </span>
            <span className="relative mt-2 flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="ป้อนรหัสผ่านทีม…"
                className="h-12 w-full border-2 border-cafe-ink bg-cafe-cream-light px-3.5 pr-11 text-base text-cafe-ink placeholder:text-cafe-ink-muted/70 focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cafe-gold"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-1.5 flex size-9 items-center justify-center text-cafe-ink-muted transition hover:text-cafe-ink"
                aria-label={showPassword ? "ซ่อนรหัส" : "แสดงรหัส"}
              >
                {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
              </button>
            </span>
          </label>
          {error ? (
            <p
              role="alert"
              className="mt-3.5 border-l-[3px] border-cafe-wax bg-cafe-wax/10 px-3 py-2 text-sm font-semibold text-cafe-wax"
            >
              {error}
            </p>
          ) : null}
          <button type="submit" className={cn(GOLD_BUTTON, "mt-6 min-h-[52px] text-base")}>
            <Unlock className="size-4" />
            ปลดล็อก
          </button>
          <div className="mt-4 text-center">
            <Link
              href="/cafe"
              className="inline-flex min-h-11 items-center gap-1.5 text-sm font-semibold text-cafe-forest underline underline-offset-4 transition hover:text-cafe-ink"
            >
              <ArrowLeft className="size-4" />
              กลับหน้าคาเฟ่
            </Link>
          </div>
        </form>
      </div>
    );
  }

  const mainSiteVisible = visibility.mainSiteLink;
  const contentSections: SectionRow[] = CAFE_CONTENT_SECTION_KEYS.map((key) => ({
    key,
    visible: visibility[key],
    label: CAFE_SECTION_META[key].label,
    labelLocal: CAFE_SECTION_META[key].labelLocal,
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <Link href="/cafe" className={WALL_LINK}>
        <ArrowLeft className="size-4" />
        กลับหน้าคาเฟ่
      </Link>

      <div className="mt-4 flex flex-wrap items-end justify-between gap-4 border-b border-cafe-gold/25 pb-6">
        <div>
          <p className={cn(LABEL, "flex items-center gap-2")}>
            <Settings2 className="size-3.5" aria-hidden />
            Case control · Visibility
          </p>
          <h1 className={cn(SERIF, "mt-2 text-3xl font-bold text-cafe-cream sm:text-4xl")}>
            Cafe Settings
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-cafe-text">
            สลับแล้วบันทึกทันที · ส่วนที่ปิดจะไม่โชว์เนื้อหาบนหน้า /cafe
          </p>
        </div>
        <button
          type="button"
          onClick={lock}
          className="inline-flex min-h-11 items-center gap-1.5 border-2 border-cafe-gold/60 px-3.5 text-sm font-semibold text-cafe-gold-soft transition hover:border-cafe-gold hover:bg-cafe-gold/10 hover:text-cafe-cream focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cafe-gold"
        >
          <Lock className="size-3.5" />
          ล็อกเซสชัน
        </button>
      </div>

      {/* Master navigation toggle */}
      <div className={cn(PAPER, "mt-10 px-5 pt-7 pb-5 sm:px-6")}>
        <KeyholePlate className="top-0 left-1/2 -translate-x-1/2 -translate-y-[60%]" />
        <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-3.5">
            <span className="flex size-11 shrink-0 items-center justify-center bg-cafe-forest text-cafe-gold-soft">
              <Home className="size-5" aria-hidden />
            </span>
            <div className="min-w-0">
              <p className={cn(LABEL, "text-[10px] text-cafe-gold-deep sm:text-[10px]")}>
                Navigation control
              </p>
              <p className={cn(SERIF, "mt-1 text-lg font-bold sm:text-xl")}>
                {CAFE_SECTION_META.mainSiteLink.label}
              </p>
              <p className={cn(THAI, "mt-0.5 text-sm text-cafe-ink-soft")}>
                {CAFE_SECTION_META.mainSiteLink.labelLocal}
              </p>
            </div>
          </div>
          <button
            type="button"
            role="switch"
            aria-checked={mainSiteVisible}
            disabled={loadingSections || savingKey === "mainSiteLink"}
            onClick={() => onToggle("mainSiteLink")}
            className={cn(switchClass(mainSiteVisible), "min-h-11 sm:min-w-[9rem]")}
          >
            {savingKey === "mainSiteLink"
              ? "กำลังบันทึก…"
              : mainSiteVisible
                ? "✓ Visible · แสดง"
                : "✕ Hidden · ซ่อน"}
          </button>
        </div>
      </div>

      <p className={cn(LABEL, "mt-10")}>Content sections ({contentSections.length})</p>

      {/* Content section toggles */}
      <ul className={cn(PAPER, "mt-3 divide-y divide-cafe-ink/12 px-4 sm:px-5")}>
        {contentSections.map((section) => (
          <li key={section.key} className="flex items-center justify-between gap-4 py-3.5">
            <div className="min-w-0">
              <p className={cn(SERIF, "text-base font-bold")}>{section.label}</p>
              <p className={cn(THAI, "text-sm text-cafe-forest")}>{section.labelLocal}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={section.visible}
              disabled={loadingSections || savingKey === section.key}
              onClick={() => onToggle(section.key)}
              className={cn(switchClass(section.visible), "min-h-10 min-w-[8.5rem]")}
            >
              {savingKey === section.key
                ? "กำลังบันทึก…"
                : section.visible
                  ? "Declassified"
                  : "Top Secret"}
            </button>
          </li>
        ))}
      </ul>

      {error ? (
        <p
          role="alert"
          className="mt-4 border-l-[3px] border-cafe-wax-light bg-cafe-deep/85 px-3.5 py-3 text-sm text-cafe-cream"
        >
          {error}
        </p>
      ) : null}

      {status ? (
        <p
          role="status"
          className="mt-4 flex items-center gap-2 border-l-[3px] border-cafe-gold bg-cafe-deep/85 px-3.5 py-3 text-sm text-cafe-text"
        >
          <CheckCircle2 className="size-4 shrink-0 text-cafe-gold" aria-hidden />
          {status}
        </p>
      ) : null}

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/admin"
          className="inline-flex min-h-11 items-center border-2 border-cafe-gold/60 px-4 text-sm font-semibold text-cafe-gold-soft transition hover:border-cafe-gold hover:bg-cafe-gold/10 hover:text-cafe-cream focus-visible:outline-[3px] focus-visible:outline-offset-2 focus-visible:outline-cafe-gold"
        >
          Control desk
        </Link>
        <Link href="/cafe/secret" className={cn(GOLD_BUTTON, "inline-flex min-h-11 w-auto px-5 text-sm")}>
          <FileLock2 className="size-4" />
          Secret · เปิดทุกอย่าง
        </Link>
      </div>
    </div>
  );
}
