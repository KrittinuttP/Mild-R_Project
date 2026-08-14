"use client";

import { useCallback, useEffect, useRef, useState, type FormEvent } from "react";
import Link from "next/link";
import { Lock, Unlock, Eye, EyeOff, ArrowLeft, FileLock2 } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import {
  CAFE_SECTION_KEYS,
  CAFE_SECTION_META,
  defaultCafeVisibility,
  type CafeSectionKey,
  type CafeSectionVisibilityMap,
} from "@/lib/cafe-visibility";
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
        nextValue
          ? `${CAFE_SECTION_META[key].label} · Declassified`
          : `${CAFE_SECTION_META[key].label} · Top Secret`
      );
      if (flashTimer.current) window.clearTimeout(flashTimer.current);
      flashTimer.current = window.setTimeout(() => setStatus(null), 1800);
    } catch {
      setVisibility(previous);
      setError("บันทึกไม่สำเร็จ");
    } finally {
      setSavingKey(null);
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
      <form
        onSubmit={unlock}
        className="mx-auto max-w-md border border-[#9a7b5a]/35 bg-[#12161a] p-6 sm:p-8"
      >
        <div className="flex items-center gap-3">
          <Lock className="size-5 text-[#c46a7a]" />
          <div>
            <p className="text-[0.62rem] tracking-[0.24em] text-[#9a7b5a] uppercase">
              Restricted access
            </p>
            <h1 className={cn(SERIF, "text-xl text-[#f4ebe3] sm:text-2xl")}>
              Cafe Settings
            </h1>
          </div>
        </div>
        <p className={cn(DISPLAY, "mt-4 text-sm text-[#c4b8a8]")}>
          ใส่รหัสทีมเพื่อเปิด/ปิดส่วนบนหน้าคาเฟ่
        </p>
        <label className="mt-6 block">
          <span className="text-[0.62rem] tracking-[0.2em] text-[#9a7b5a] uppercase">
            Clearance code
          </span>
          <div className="mt-2 flex gap-2">
            <input
              type={showPassword ? "text" : "password"}
              value={password}
              onChange={(event) => setPassword(event.target.value)}
              autoComplete="current-password"
              className="min-w-0 flex-1 border border-[#9a7b5a]/40 bg-[#0a0c0e] px-3 py-2.5 text-[#f4ebe3] outline-none focus:border-[#c46a7a]"
            />
            <button
              type="button"
              onClick={() => setShowPassword((v) => !v)}
              className="border border-[#9a7b5a]/40 px-3 text-[#c4b8a8] hover:text-[#f4ebe3]"
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
          <p className="mt-3 text-sm text-[#c46a7a]">{error}</p>
        ) : null}
        <button
          type="submit"
          className={cn(
            buttonVariants({ size: "lg" }),
            "mt-6 w-full rounded-none border-transparent bg-[#a84d5f] text-[#f4ebe3] hover:bg-[#c46a7a]"
          )}
        >
          <Unlock className="size-4" />
          ปลดล็อก
        </button>
      </form>
    );
  }

  const sections: SectionRow[] = CAFE_SECTION_KEYS.map((key) => ({
    key,
    visible: visibility[key],
    label: CAFE_SECTION_META[key].label,
    labelLocal: CAFE_SECTION_META[key].labelLocal,
  }));

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[0.62rem] tracking-[0.24em] text-[#9a7b5a] uppercase">
            Case control · Visibility
          </p>
          <h1 className={cn(SERIF, "mt-2 text-2xl text-[#f4ebe3] sm:text-3xl")}>
            Cafe Settings
          </h1>
          <p className={cn(DISPLAY, "mt-2 text-sm text-[#c4b8a8]")}>
            สลับแล้วบันทึกทันที · ส่วนที่ปิดแสดง TOP SECRET บน `/cafe`
          </p>
        </div>
        <button
          type="button"
          onClick={lock}
          className={cn(
            buttonVariants({ variant: "outline", size: "sm" }),
            "rounded-none border-[#9a7b5a]/45"
          )}
        >
          <Lock className="size-3.5" />
          ล็อก
        </button>
      </div>

      <ul className="mt-8 space-y-2">
        {sections.map((section) => (
          <li
            key={section.key}
            className="flex items-center justify-between gap-4 border border-[#9a7b5a]/30 bg-[#12161a] px-4 py-3.5 sm:px-5"
          >
            <div className="min-w-0">
              <p className={cn(SERIF, "text-base text-[#f4ebe3]")}>
                {section.label}
              </p>
              <p className="text-xs text-[#c4b8a8]">{section.labelLocal}</p>
            </div>
            <button
              type="button"
              role="switch"
              aria-checked={section.visible}
              disabled={loadingSections || savingKey === section.key}
              onClick={() => onToggle(section.key)}
              className={cn(
                "shrink-0 border px-3 py-1.5 text-[0.62rem] tracking-[0.18em] uppercase transition disabled:opacity-50",
                section.visible
                  ? "border-[#6b9a7a]/55 bg-[#6b9a7a]/15 text-[#b8d4c4]"
                  : "border-[#a84d5f]/55 bg-[#a84d5f]/15 text-[#c46a7a]"
              )}
            >
              {savingKey === section.key
                ? "Saving…"
                : section.visible
                  ? "Declassified"
                  : "Top Secret"}
            </button>
          </li>
        ))}
      </ul>

      {error ? <p className="mt-4 text-sm text-[#c46a7a]">{error}</p> : null}
      {status ? <p className="mt-4 text-sm text-[#b8d4c4]">{status}</p> : null}

      <div className="mt-8 flex flex-wrap gap-3">
        <Link
          href="/cafe/secret"
          className={cn(
            buttonVariants({ size: "lg" }),
            "rounded-none border-transparent bg-[#a84d5f] text-[#f4ebe3] hover:bg-[#c46a7a]"
          )}
        >
          <FileLock2 className="size-4" />
          Secret · เปิดทุกอย่าง
        </Link>
        <Link
          href="/cafe"
          className={cn(
            buttonVariants({ variant: "outline", size: "lg" }),
            "rounded-none border-[#9a7b5a]/45"
          )}
        >
          <ArrowLeft className="size-4" />
          กลับหน้าคาเฟ่
        </Link>
      </div>
    </div>
  );
}
