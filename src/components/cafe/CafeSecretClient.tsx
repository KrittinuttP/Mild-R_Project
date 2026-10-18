"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import { Eye, EyeOff, FileLock2, Lock, Unlock } from "lucide-react";

import { CafePromo } from "@/components/cafe/CafePromo";
import { buttonVariants } from "@/components/ui/button";
import type { CafeCaseFileCover } from "@/lib/cafe-case-file";
import { defaultCafeVisibility } from "@/lib/cafe-visibility";
import { cn } from "@/lib/utils";
import type { CafePage } from "@/types/vtuber";

const SERIF = "font-[family-name:var(--font-cafe-serif)]";
const DISPLAY = "font-[family-name:var(--font-display)]";

type CafeSecretClientProps = {
  /** Null until the server has seen the team cookie (see the page). */
  cafe: CafePage | null;
  caseCover: CafeCaseFileCover | null;
};

export function CafeSecretClient({ cafe, caseCover }: CafeSecretClientProps) {
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
        // Only open when the server already sent the data with this page.
        if (!cancelled && data.unlocked && cafe) setUnlocked(true);
      } catch {
        /* ignore */
      } finally {
        if (!cancelled) setChecking(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [cafe]);

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
        setSubmitting(false);
        return;
      }
      setPassword("");
      // Reload so the server sends the cafe data now that the cookie is set.
      window.location.reload();
    } catch {
      setError("ปลดล็อกไม่สำเร็จ");
      setSubmitting(false);
    }
  }

  if (checking) {
    return (
      <p className="px-4 py-16 text-center text-sm tracking-[0.2em] text-cafe-gold uppercase">
        Checking clearance…
      </p>
    );
  }

  if (!unlocked) {
    return (
      <div className="min-h-[70dvh] px-4 py-10 sm:px-8 sm:py-14">
        <form
          onSubmit={unlock}
          className="mx-auto max-w-md border border-cafe-gold/35 bg-cafe-deep p-6 sm:p-8"
        >
          <div className="flex items-center gap-3">
            <FileLock2 className="size-5 text-cafe-gold-soft" />
            <div>
              <p className="text-[0.62rem] tracking-[0.24em] text-cafe-gold uppercase">
                Secret · Restricted
              </p>
              <h1 className={cn(SERIF, "text-xl text-cafe-cream sm:text-2xl")}>
                Full reveal
              </h1>
            </div>
          </div>
          <p className={cn(DISPLAY, "mt-4 text-sm text-cafe-muted")}>
            ใส่รหัสทีมเพื่อเปิดหน้า secret ที่โชว์ทุกส่วน
          </p>
          <label className="mt-6 block">
            <span className="text-[0.62rem] tracking-[0.2em] text-cafe-gold uppercase">
              Clearance code
            </span>
            <div className="mt-2 flex gap-2">
              <input
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(event) => setPassword(event.target.value)}
                autoComplete="current-password"
                autoFocus
                className="min-w-0 flex-1 border border-cafe-gold/40 bg-cafe-ground px-3 py-2.5 text-cafe-cream outline-none focus:border-cafe-gold-soft"
              />
              <button
                type="button"
                onClick={() => setShowPassword((v) => !v)}
                className="border border-cafe-gold/40 px-3 text-cafe-muted hover:text-cafe-cream"
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
            <p className="mt-3 text-sm text-cafe-gold-soft">{error}</p>
          ) : null}
          <button
            type="submit"
            disabled={submitting}
            className={cn(
              buttonVariants({ size: "lg" }),
              "mt-6 w-full rounded-none border-transparent bg-cafe-gold text-cafe-ink hover:bg-cafe-gold-soft disabled:opacity-50"
            )}
          >
            <Unlock className="size-4" />
            {submitting ? "กำลังปลดล็อก…" : "เข้า Secret"}
          </button>
          <p className="mt-4 flex items-center justify-center gap-2 text-xs text-cafe-gold">
            <Lock className="size-3 opacity-70" />
            <Link href="/cafe/settings" className="hover:text-cafe-muted">
              หรือไปหน้า Settings
            </Link>
          </p>
        </form>
      </div>
    );
  }

  if (!cafe) return null;

  return (
    <div>
      <div className="sticky top-0 z-50 border-b border-cafe-gold/40 bg-cafe-deep/95 px-4 py-2.5 text-center backdrop-blur-sm sm:px-6">
        <p className="text-[0.62rem] tracking-[0.22em] text-cafe-gold-soft uppercase">
          Secret · Full reveal · ไม่ใช้ visibility จาก DB
        </p>
        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-3 text-xs text-cafe-muted">
          <Link href="/cafe" className="hover:text-cafe-cream">
            หน้าจริง `/cafe`
          </Link>
          <span className="text-cafe-gold/50">·</span>
          <Link href="/cafe/settings" className="hover:text-cafe-cream">
            Settings
          </Link>
        </div>
      </div>
      <CafePromo
        cafe={cafe}
        visibility={defaultCafeVisibility()}
        caseCover={caseCover}
      />
    </div>
  );
}
