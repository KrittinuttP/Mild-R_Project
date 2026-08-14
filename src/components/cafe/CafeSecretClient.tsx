"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Eye, EyeOff, FileLock2, Lock, Unlock } from "lucide-react";

import { CafePromo } from "@/components/cafe/CafePromo";
import { buttonVariants } from "@/components/ui/button";
import { defaultCafeVisibility } from "@/lib/cafe-visibility";
import { cn } from "@/lib/utils";
import type { CafePage } from "@/types/vtuber";

const SERIF = "font-[family-name:var(--font-cafe-serif)]";
const DISPLAY = "font-[family-name:var(--font-display)]";

type CafeSecretClientProps = {
  cafe: CafePage;
};

export function CafeSecretClient({ cafe }: CafeSecretClientProps) {
  const [checking, setChecking] = useState(true);
  const [unlocked, setUnlocked] = useState(false);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [submitting, setSubmitting] = useState(false);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/cafe/settings/unlock");
        const data = (await res.json()) as { unlocked?: boolean };
        if (!cancelled && data.unlocked) setUnlocked(true);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  async function unlock(event: FormEvent) {
    event.preventDefault();
    setError(null);
    setSubmitting(true);
    try {
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
    } finally {
      setSubmitting(false);
    }
  }

  if (checking) {
    return (
      <p className="px-4 py-16 text-center text-sm tracking-[0.2em] text-[#9a7b5a] uppercase">
        Checking clearance…
      </p>
    );
  }

  if (!unlocked) {
    return (
      <div className="min-h-[70dvh] px-4 py-10 sm:px-8 sm:py-14">
        <form
          onSubmit={unlock}
          className="mx-auto max-w-md border border-[#9a7b5a]/35 bg-[#12161a] p-6 sm:p-8"
        >
          <div className="flex items-center gap-3">
            <FileLock2 className="size-5 text-[#c46a7a]" />
            <div>
              <p className="text-[0.62rem] tracking-[0.24em] text-[#9a7b5a] uppercase">
                Secret · Restricted
              </p>
              <h1 className={cn(SERIF, "text-xl text-[#f4ebe3] sm:text-2xl")}>
                Full reveal
              </h1>
            </div>
          </div>
          <p className={cn(DISPLAY, "mt-4 text-sm text-[#c4b8a8]")}>
            ใส่รหัสทีมเพื่อเปิดหน้า secret ที่โชว์ทุกส่วน
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
                autoFocus
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
            disabled={submitting}
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-6 w-full rounded-none border-transparent bg-[#a84d5f] text-[#f4ebe3] hover:bg-[#c46a7a] disabled:opacity-50"
            )}
          >
            <Unlock className="size-4" />
            {submitting ? "กำลังปลดล็อก…" : "เข้า Secret"}
          </button>
          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-[#9a7b5a]">
            <Lock className="size-3 opacity-70" />
            <Link href="/cafe/settings" className="hover:text-[#c4b8a8]">
              หรือไปหน้า Settings
            </Link>
          </p>
        </form>
      </div>
    );
  }

  return (
    <div>
      <div className="sticky top-0 z-50 border-b border-[#a84d5f]/40 bg-[#140c0e]/95 px-4 py-2.5 text-center backdrop-blur-sm sm:px-6">
        <p className="text-[0.62rem] tracking-[0.22em] text-[#c46a7a] uppercase">
          Secret · Full reveal · ไม่ใช้ visibility จาก DB
        </p>
        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-3 text-xs text-[#c4b8a8]">
          <Link href="/cafe" className="hover:text-[#f4ebe3]">
            หน้าจริง `/cafe`
          </Link>
          <span className="text-[#9a7b5a]/50">·</span>
          <Link href="/cafe/settings" className="hover:text-[#f4ebe3]">
            Settings
          </Link>
        </div>
      </div>
      <CafePromo cafe={cafe} visibility={defaultCafeVisibility()} />
    </div>
  );
}
