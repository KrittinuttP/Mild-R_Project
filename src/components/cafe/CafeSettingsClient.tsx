"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Lock, Unlock, Eye, EyeOff, FileLock2, Home, Settings2, ShieldCheck, CheckCircle2 } from "lucide-react";

import { BackLink } from "@/components/layout/BackLink";
import { buttonVariants } from "@/components/ui/button";
import {
  CAFE_CONTENT_SECTION_KEYS,
  CAFE_SECTION_META,
  defaultCafeVisibility,
  type CafeSectionKey,
  type CafeSectionVisibilityMap,
} from "@/lib/cafe-visibility";
import {
  CTA_OUTLINE_CLASS,
  CTA_PRIMARY_CLASS,
  DISPLAY_H1_CLASS,
  GLASS_CARD_CLASS,
  META_CLASS,
  META_MUTED_CLASS,
} from "@/lib/site-ui";
import { cn } from "@/lib/utils";

const SERIF = "font-[family-name:var(--font-cafe-serif)]";
const DISPLAY = "font-[family-name:var(--font-display)]";

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
        <form
          onSubmit={unlock}
          className="relative overflow-hidden rounded-3xl border border-[#f3b8c4]/15 bg-gradient-to-b from-[#220e18]/95 via-[#1a0c12]/90 to-[#140a0d] p-7 shadow-[0_20px_50px_rgba(0,0,0,0.6)] sm:p-9"
        >
          <div className="flex items-center gap-3.5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-[#e85a7a]/40 bg-[#e85a7a]/15 text-[#e85a7a] shadow-[0_0_16px_rgba(232,90,122,0.3)]">
              <Lock className="size-6" />
            </div>
            <div>
              <p className={META_MUTED_CLASS}>Restricted Access</p>
              <h1 className={cn(SERIF, "text-2xl text-[#fff5f7]")}>
                Cafe Settings
              </h1>
            </div>
          </div>
          <p className="mt-4 text-sm leading-relaxed text-[#f7d7de]/80">
            ใส่รหัสทีมเพื่อเปิด/ปิดส่วนแสดงผลบนหน้าคาเฟ่
          </p>
          <label className="mt-6 block">
            <span className={META_CLASS}>Clearance code</span>
            <div className="relative mt-2 flex items-center">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                placeholder="ป้อนรหัสผ่านทีม…"
                className="w-full rounded-2xl border border-[#f3b8c4]/20 bg-[#12070c]/90 px-4 py-3 text-sm text-[#fff5f7] placeholder-[#f3b8c4]/30 outline-none transition focus:border-[#e85a7a]/70 focus:ring-2 focus:ring-[#e85a7a]/20"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="absolute right-3 p-1.5 text-[#f3b8c4]/60 transition hover:text-[#fff5f7]"
                aria-label={showPassword ? "ซ่อนรหัส" : "แสดงรหัส"}
              >
                {showPassword ? (
                  <EyeOff className="size-4" />
                ) : (
                  <Eye className="size-4" />
                )}
              </button>
            </div>
          </label>
          {error ? (
            <div className="mt-3.5 flex items-center gap-2 rounded-xl border border-red-500/30 bg-red-500/10 px-3.5 py-2 text-xs text-red-200">
              <span className="size-1.5 rounded-full bg-red-400" />
              {error}
            </div>
          ) : null}
          <button
            type="submit"
            className={cn(
              buttonVariants({ size: "lg" }),
              CTA_PRIMARY_CLASS,
              "mt-6 flex w-full items-center justify-center gap-2 font-semibold"
            )}
          >
            <Unlock className="size-4" />
            ปลดล็อก
          </button>
          <div className="mt-5 border-t border-[#f3b8c4]/10 pt-4 text-center">
            <BackLink href="/cafe">กลับหน้าคาเฟ่</BackLink>
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
      <BackLink href="/cafe" className="mb-4">
        กลับหน้าคาเฟ่
      </BackLink>

      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#f3b8c4]/12 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <Settings2 className="size-4 text-[#e85a7a]" />
            <p className={META_CLASS}>Case Control · Visibility</p>
          </div>
          <h1 className={cn(SERIF, "mt-1.5 text-3xl text-[#fff5f7] sm:text-4xl")}>
            Cafe Settings
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#f7d7de]/80">
            สลับแล้วบันทึกทันที · ส่วนที่ปิดจะแสดงสถานะ TOP SECRET บนหน้า `/cafe`
          </p>
        </div>
        <button
          type="button"
          onClick={lock}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            CTA_OUTLINE_CLASS,
            "inline-flex items-center gap-1.5"
          )}
        >
          <Lock className="size-3.5" />
          ล็อกเซสชัน
        </button>
      </div>

      {/* 🧭 Master Navigation Toggle */}
      <div className="relative mt-8 overflow-hidden rounded-3xl border border-[#e85a7a]/40 bg-gradient-to-br from-[#2a101f] via-[#1a0c13] to-[#12070c] p-5 shadow-[0_12px_32px_rgba(232,90,122,0.15)] sm:p-6">
        <div className="relative flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
          <div className="flex min-w-0 items-start gap-4">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-[#e85a7a]/40 bg-[#e85a7a]/20 shadow-[0_0_16px_rgba(232,90,122,0.3)]">
              <Home className="size-5 text-[#fff5f7]" />
            </div>
            <div className="min-w-0">
              <p className={META_CLASS}>Navigation Control</p>
              <p className={cn(SERIF, "mt-1 text-lg text-[#fff5f7] sm:text-xl")}>
                {CAFE_SECTION_META.mainSiteLink.label}
              </p>
              <p className="mt-0.5 text-xs text-[#f3b8c4]/70">
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
            className={cn(
              "relative shrink-0 rounded-full border px-5 py-2.5 text-xs font-bold tracking-wider uppercase transition disabled:opacity-50 sm:min-w-[8.5rem]",
              mainSiteVisible
                ? "border-emerald-400/60 bg-emerald-500/20 text-emerald-100 shadow-[0_0_20px_rgba(16,185,129,0.3)]"
                : "border-[#e85a7a]/60 bg-[#e85a7a]/20 text-[#fff5f7] shadow-[0_0_20px_rgba(232,90,122,0.25)]"
            )}
          >
            {savingKey === "mainSiteLink"
              ? "กำลังบันทึก…"
              : mainSiteVisible
                ? "✓ แสดง (Visible)"
                : "✕ ซ่อน (Hidden)"}
          </button>
        </div>
      </div>

      <p className={cn(META_CLASS, "mt-8")}>
        Content Sections ({contentSections.length})
      </p>

      {/* 📋 Content Section Toggles */}
      <ul className="mt-3 space-y-3">
        {contentSections.map((section) => (
          <li
            key={section.key}
            className="flex items-center justify-between gap-4 rounded-2xl border border-[#f3b8c4]/15 bg-gradient-to-r from-[#1f0d16]/80 to-[#14080e]/90 p-4 transition hover:border-[#e85a7a]/40 sm:px-5"
          >
            <div className="min-w-0">
              <p className={cn(SERIF, "text-base font-medium text-[#fff5f7]")}>
                {section.label}
              </p>
              <p className="text-xs text-[#e85a7a]">{section.labelLocal}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={section.visible}
              disabled={loadingSections || savingKey === section.key}
              onClick={() => onToggle(section.key)}
              className={cn(
                "shrink-0 rounded-full border px-4 py-1.5 text-xs font-bold tracking-wide uppercase transition disabled:opacity-50",
                section.visible
                  ? "border-emerald-400/50 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25"
                  : "border-[#e85a7a]/50 bg-[#e85a7a]/15 text-[#f3b8c4] hover:bg-[#e85a7a]/25"
              )}
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
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-red-500/30 bg-red-500/10 p-3.5 text-xs text-red-200">
          <span className="size-1.5 rounded-full bg-red-400" />
          {error}
        </div>
      ) : null}

      {status ? (
        <div className="mt-4 flex items-center gap-2 rounded-2xl border border-emerald-500/30 bg-emerald-500/10 p-3.5 text-xs text-emerald-200 animate-in fade-in">
          <CheckCircle2 className="size-4 text-emerald-400" />
          {status}
        </div>
      ) : null}

      <div className="mt-10 flex flex-wrap gap-3">
        <Link
          href="/admin"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            CTA_OUTLINE_CLASS
          )}
        >
          Control desk
        </Link>
        <Link
          href="/cafe/secret"
          className={cn(
            buttonVariants({ size: "lg" }),
            CTA_PRIMARY_CLASS,
            "inline-flex items-center gap-2 font-semibold"
          )}
        >
          <FileLock2 className="size-4" />
          Secret · เปิดทุกอย่าง
        </Link>
      </div>
    </div>
  );
}
