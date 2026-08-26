"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Cake,
  Eye,
  EyeOff,
  FileLock2,
  Home,
  Lock,
  Settings2,
  Unlock,
} from "lucide-react";

import { BackLink } from "@/components/layout/BackLink";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const DISPLAY = "font-[family-name:var(--font-display)]";

type AdminTool = {
  href: string;
  title: string;
  titleLocal: string;
  description: string;
  icon: typeof Settings2;
  badge?: number;
};

const TOOLS: AdminTool[] = [
  {
    href: "/cafe/settings",
    title: "Cafe visibility",
    titleLocal: "เปิด/ปิดส่วนคาเฟ่",
    description: "ควบคุม section บนหน้า /cafe",
    icon: Settings2,
  },
  {
    href: "/cafe/secret",
    title: "Cafe secret",
    titleLocal: "พรีวิวเต็ม",
    description: "ดูคาเฟ่แบบเปิดทุกส่วน",
    icon: FileLock2,
  },
  {
    href: "/admin/hbd",
    title: "HBD submissions",
    titleLocal: "อนุมัติคำอวยพร",
    description: "รายการอัปโหลดจาก /HBD/2026/upload",
    icon: Cake,
  },
];

export function AdminHubClient() {
  const [unlocked, setUnlocked] = useState(false);
  const [checking, setChecking] = useState(true);
  const [password, setPassword] = useState("");
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pendingHbd, setPendingHbd] = useState(0);

  useEffect(() => {
    let cancelled = false;
    (async () => {
      try {
        const res = await fetch("/api/admin/unlock");
        const data = (await res.json()) as { unlocked?: boolean };
        if (cancelled) return;
        if (data.unlocked) {
          setUnlocked(true);
          try {
            const countRes = await fetch(
              "/api/hbd/admin/submissions?countOnly=1"
            );
            if (countRes.ok) {
              const countData = (await countRes.json()) as {
                pendingCount?: number;
              };
              setPendingHbd(countData.pendingCount ?? 0);
            }
          } catch {
            /* ignore */
          }
        }
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
    const res = await fetch("/api/admin/unlock", {
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
    try {
      const countRes = await fetch("/api/hbd/admin/submissions?countOnly=1");
      if (countRes.ok) {
        const countData = (await countRes.json()) as { pendingCount?: number };
        setPendingHbd(countData.pendingCount ?? 0);
      } else {
        setPendingHbd(0);
      }
    } catch {
      setPendingHbd(0);
    }
  }

  async function lock() {
    await fetch("/api/admin/unlock", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ action: "lock" }),
    });
    setUnlocked(false);
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
              Site admin
            </p>
            <h1 className={cn(DISPLAY, "text-xl font-normal text-[#f4ebe3] sm:text-2xl")}>
              Control desk
            </h1>
          </div>
        </div>
        <p className="mt-4 text-sm text-[#c4b8a8]">
          รหัสทีมเดียวสำหรับคาเฟ่ · HBD · เครื่องมืออื่น
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
          Unlock
        </button>
        <BackLink href="/" className="mt-4">
          กลับหน้าหลัก
        </BackLink>
      </form>
    );
  }

  return (
    <div className="mx-auto max-w-2xl">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-[0.62rem] tracking-[0.24em] text-[#9a7b5a] uppercase">
            Site admin
          </p>
          <h1 className={cn(DISPLAY, "mt-1 text-2xl font-normal text-[#f4ebe3] sm:text-3xl")}>
            Control desk
          </h1>
          <p className="mt-2 text-sm text-[#c4b8a8]">
            เลือกเครื่องมือ · session ใช้ร่วมกับคาเฟ่และ HBD
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
          Lock
        </button>
      </div>

      <ul className="mt-10 space-y-3">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const badge =
            tool.href === "/admin/hbd" ? pendingHbd : (tool.badge ?? 0);
          return (
            <li key={tool.href}>
              <Link
                href={tool.href}
                className="flex items-start gap-4 border border-[#9a7b5a]/30 bg-[#12161a] p-4 transition hover:border-[#c46a7a]/45 hover:bg-[#161b20] sm:p-5"
              >
                <span className="mt-0.5 flex size-10 shrink-0 items-center justify-center border border-[#9a7b5a]/35 text-[#c46a7a]">
                  <Icon className="size-5" />
                </span>
                <span className="min-w-0 flex-1">
                  <span className="flex flex-wrap items-center gap-2">
                    <span className={cn(DISPLAY, "font-normal text-[#f4ebe3]")}>
                      {tool.title}
                    </span>
                    {badge > 0 ? (
                      <span className="bg-[#a84d5f] px-2 py-0.5 text-[0.65rem] tracking-wide text-[#f4ebe3] uppercase">
                        {badge} new
                      </span>
                    ) : null}
                  </span>
                  <span className="mt-0.5 block text-sm text-[#c4b8a8]">
                    {tool.titleLocal}
                  </span>
                  <span className="mt-1 block text-xs text-[#9a7b5a]">
                    {tool.description}
                  </span>
                </span>
              </Link>
            </li>
          );
        })}
      </ul>

      <div className="mt-8 flex flex-wrap gap-4 text-sm">
        <BackLink href="/">หน้าหลัก</BackLink>
        <Link
          href="/HBD/2026/upload"
          className="inline-flex items-center gap-2 text-[#9a7b5a] hover:text-[#c4b8a8]"
        >
          <ArrowLeft className="size-3.5 rotate-180" />
          หน้าอัปโหลด HBD (สาธารณะ)
        </Link>
      </div>
    </div>
  );
}
