"use client";

import { useEffect, useState, type FormEvent } from "react";
import Link from "next/link";
import {
  Activity,
  ArrowLeft,
  ArrowUpRight,
  Cake,
  Eye,
  EyeOff,
  FileLock2,
  Lock,
  Radio,
  Settings2,
  ShieldCheck,
  Sparkles,
  Unlock,
} from "lucide-react";

import { BackLink } from "@/components/layout/BackLink";
import { buttonVariants } from "@/components/ui/button";
import {
  CTA_OUTLINE_CLASS,
  CTA_PRIMARY_CLASS,
  DISPLAY_H1_CLASS,
  GLASS_CARD_CLASS,
  META_CLASS,
  META_MUTED_CLASS,
} from "@/lib/site-ui";
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
    description: "รายการอัปโหลดจาก /hbd/2026/upload",
    icon: Cake,
  },
  {
    href: "/live/ops/trends",
    title: "Live view trends",
    titleLocal: "สถิติและเทรนด์สตรีม",
    description: "วิเคราะห์ยอดวิว แยก Solo / Collab / Member",
    icon: Activity,
  },
  {
    href: "/live/ops",
    title: "YouTube Sync Monitor",
    titleLocal: "มอนิเตอร์ Sync",
    description: "ตรวจสถานะการดึงข้อมูล YouTube และ Log การทำงาน",
    icon: Radio,
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
          {/* Header */}
          <div className="flex items-center gap-3.5">
            <div className="flex size-12 shrink-0 items-center justify-center rounded-2xl border border-[#e85a7a]/40 bg-[#e85a7a]/15 text-[#e85a7a] shadow-[0_0_16px_rgba(232,90,122,0.3)]">
              <Lock className="size-6" />
            </div>
            <div>
              <p className={META_MUTED_CLASS}>Site Admin</p>
              <h1 className={cn(DISPLAY, "text-2xl font-normal text-[#fff5f7]")}>
                Control Desk
              </h1>
            </div>
          </div>

          <p className="mt-4 text-sm leading-relaxed text-[#f7d7de]/80">
            ใส่รหัสทีมเพื่อเข้าถึงเครื่องมือจัดการคาเฟ่, คำอวยพรวันเกิด และระบบหลังบ้าน
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
            ปลดล็อกเข้าสู่ระบบ
          </button>

          <div className="mt-5 border-t border-[#f3b8c4]/10 pt-4 text-center">
            <BackLink href="/">กลับหน้าหลัก</BackLink>
          </div>
        </form>
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-3xl">
      {/* 🌟 Header */}
      <div className="flex flex-wrap items-start justify-between gap-4 border-b border-[#f3b8c4]/12 pb-6">
        <div>
          <div className="flex items-center gap-2">
            <ShieldCheck className="size-4 text-[#e85a7a]" />
            <p className={META_CLASS}>Site Admin Clearance</p>
          </div>
          <h1 className={cn(DISPLAY, "mt-1.5 text-3xl font-normal text-[#fff5f7] sm:text-4xl")}>
            Control Desk
          </h1>
          <p className="mt-2 text-sm leading-relaxed text-[#f7d7de]/80">
            ศูนย์รวมเครื่องมือผู้ดูแลระบบ · เซสชันใช้งานร่วมกับคาเฟ่และ HBD
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

      {/* 🎛️ Tool Grid */}
      <ul className="mt-8 grid gap-3.5 sm:grid-cols-2">
        {TOOLS.map((tool) => {
          const Icon = tool.icon;
          const badge =
            tool.href === "/admin/hbd" ? pendingHbd : (tool.badge ?? 0);
          return (
            <li key={tool.href}>
              <Link
                href={tool.href}
                className={cn(
                  "group relative flex h-full flex-col justify-between overflow-hidden rounded-3xl border border-[#f3b8c4]/15 bg-gradient-to-b from-[#1f0d16]/80 to-[#14080e]/90 p-5 text-left transition duration-300 hover:-translate-y-0.5 hover:border-[#e85a7a]/50 hover:shadow-[0_12px_32px_rgba(232,90,122,0.18)]"
                )}
              >
                <div>
                  <div className="flex items-center justify-between">
                    <span className="flex size-11 items-center justify-center rounded-2xl border border-[#e85a7a]/30 bg-[#e85a7a]/15 text-[#e85a7a] transition group-hover:scale-105 group-hover:bg-[#e85a7a]/25 group-hover:shadow-[0_0_16px_rgba(232,90,122,0.4)]">
                      <Icon className="size-5" />
                    </span>
                    {badge > 0 ? (
                      <span className="inline-flex items-center gap-1 rounded-full border border-[#e85a7a] bg-[#e85a7a] px-2.5 py-0.5 text-[0.68rem] font-bold text-white shadow-[0_0_12px_rgba(232,90,122,0.6)]">
                        <span className="size-1.5 rounded-full bg-white animate-ping" />
                        {badge} รออนุมัติ
                      </span>
                    ) : (
                      <ArrowUpRight className="size-4 text-[#f3b8c4]/40 transition group-hover:translate-x-0.5 group-hover:-translate-y-0.5 group-hover:text-[#e85a7a]" />
                    )}
                  </div>

                  <h3 className={cn(DISPLAY, "mt-4 text-lg font-normal text-[#fff5f7] group-hover:text-[#fff5f7]")}>
                    {tool.title}
                  </h3>
                  <p className="mt-0.5 text-xs font-semibold text-[#e85a7a]">
                    {tool.titleLocal}
                  </p>
                  <p className="mt-2 text-xs leading-relaxed text-[#f3b8c4]/65">
                    {tool.description}
                  </p>
                </div>

                <div className="mt-4 flex items-center gap-1 pt-2 text-[0.75rem] font-medium text-[#e85a7a] opacity-80 transition group-hover:opacity-100">
                  <span>เปิดเครื่องมือ</span>
                  <ArrowUpRight className="size-3.5" />
                </div>
              </Link>
            </li>
          );
        })}
      </ul>

      {/* 🔗 Footer Navigation */}
      <div className="mt-10 flex flex-wrap items-center justify-between gap-4 rounded-2xl border border-[#f3b8c4]/10 bg-[#14080e]/60 p-4 text-xs sm:text-sm">
        <BackLink href="/">หน้าหลัก</BackLink>
        <Link
          href="/hbd/2026/upload"
          prefetch={false}
          className="inline-flex items-center gap-1.5 text-[#f3b8c4]/70 transition hover:text-[#fff5f7]"
        >
          <Cake className="size-3.5 text-[#e85a7a]" />
          <span>หน้าอัปโหลดคำอวยพร HBD (สาธารณะ)</span>
          <ArrowUpRight className="size-3.5" />
        </Link>
      </div>
    </div>
  );
}
