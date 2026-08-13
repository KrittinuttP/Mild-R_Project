"use client";

import { useEffect, useRef, useState } from "react";

import { gsap, registerGsapPlugins } from "@/lib/gsap";
import { cn } from "@/lib/utils";

registerGsapPlugins();

const SERIF = "font-[family-name:var(--font-cafe-serif)]";
const DISPLAY = "font-[family-name:var(--font-display)]";

type Remain = {
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
};

type Phase = "pending" | "open" | "closed";

function pad(value: number, size: number) {
  return String(Math.max(0, value)).padStart(size, "0");
}

function diffTo(target: number, now: number): Remain {
  const total = Math.max(0, Math.floor((target - now) / 1000));
  return {
    days: Math.floor(total / 86400),
    hours: Math.floor((total % 86400) / 3600),
    minutes: Math.floor((total % 3600) / 60),
    seconds: total % 60,
  };
}

function phaseAt(now: number, start: number, end?: number): Phase {
  if (now < start) return "pending";
  if (end !== undefined && now >= end) return "closed";
  return "open";
}

function FlipCard({ value, label }: { value: string; label: string }) {
  const [shown, setShown] = useState(value);
  const shownRef = useRef(value);
  const faceRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    shownRef.current = shown;
  }, [shown]);

  useEffect(() => {
    if (value === shownRef.current) return;
    const el = faceRef.current;
    const reduce = window.matchMedia(
      "(prefers-reduced-motion: reduce)"
    ).matches;

    if (!el || reduce) {
      setShown(value);
      return;
    }

    const tl = gsap.timeline();
    tl.to(el, {
      rotateX: 86,
      duration: 0.16,
      ease: "power2.in",
      transformOrigin: "50% 0%",
    })
      .add(() => setShown(value))
      .set(el, { rotateX: -72 })
      .to(el, {
        rotateX: 0,
        duration: 0.22,
        ease: "power2.out",
      });

    return () => {
      tl.kill();
    };
  }, [value]);

  return (
    <div className="min-w-0 text-center" style={{ perspective: "820px" }}>
      <p className="mb-1.5 text-[0.5rem] tracking-[0.16em] text-[#9a7b5a] uppercase sm:text-[0.58rem] sm:tracking-[0.2em]">
        {label}
      </p>
      <div className="relative overflow-hidden border border-[#9a7b5a]/40 bg-[#0c0a09]">
        <div
          className="pointer-events-none absolute inset-x-0 top-1/2 z-[1] h-px bg-[#9a7b5a]/40"
          aria-hidden
        />
        <div
          ref={faceRef}
          className={cn(
            DISPLAY,
            "px-0.5 py-2 text-[clamp(1.15rem,4.8vw,1.85rem)] leading-none font-bold tabular-nums text-[#fff8f4] will-change-transform sm:py-2.5"
          )}
        >
          {shown}
        </div>
      </div>
    </div>
  );
}

type CafeCountdownProps = {
  startsAt: string;
  endsAt?: string;
  /** No outer chrome — for embedding inside the overview dossier */
  embedded?: boolean;
};

export function CafeCountdown({
  startsAt,
  endsAt,
  embedded = false,
}: CafeCountdownProps) {
  const startMs = Date.parse(startsAt);
  const endMs = endsAt ? Date.parse(endsAt) : Number.NaN;
  const valid = Number.isFinite(startMs);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!valid) return;
    setNow(Date.now());
    const id = window.setInterval(() => setNow(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [valid]);

  if (!valid) return null;

  const current = now ?? startMs;
  const phase = phaseAt(
    current,
    startMs,
    Number.isFinite(endMs) ? endMs : undefined
  );
  const remain = diffTo(startMs, current);
  const live = now !== null;

  const units = [
    { label: "Days", value: pad(remain.days, 3) },
    { label: "Hours", value: pad(remain.hours, 2) },
    { label: "Mins", value: pad(remain.minutes, 2) },
    { label: "Secs", value: pad(remain.seconds, 2) },
  ];

  const clock =
    phase === "pending" ? (
      <div
        className={cn(
          "grid grid-cols-4 gap-px bg-[#9a7b5a]/30",
          embedded ? "border-t border-[#9a7b5a]/30" : "border-t border-[#9a7b5a]/30"
        )}
        aria-live="polite"
        aria-label="นับถอยหลังถึงเวลาเปิดเคส"
      >
        {units.map((unit) => (
          <div
            key={unit.label}
            className="bg-[#14100c] px-1 py-2 sm:px-2 sm:py-2.5"
          >
            <FlipCard
              value={live ? unit.value : pad(0, unit.value.length)}
              label={unit.label}
            />
          </div>
        ))}
      </div>
    ) : (
      <div className="border-t border-[#9a7b5a]/30 px-4 py-4 text-center">
        <p
          className={cn(
            DISPLAY,
            "text-lg font-bold tracking-tight text-[#f4ebe3] sm:text-xl"
          )}
        >
          {phase === "open" ? "Case Open" : "Case Closed"}
        </p>
        <p className="mt-1 text-[0.58rem] tracking-[0.18em] text-[#c46a7a] uppercase">
          {phase === "open" ? "Doors are live" : "File archived"}
        </p>
      </div>
    );

  if (embedded) return clock;

  return (
    <div className="mt-3 border border-[#9a7b5a]/40 bg-[#14100c]">
      <div className="flex items-center justify-between gap-2 px-3 py-2 pl-4 sm:px-4">
        <div>
          <p className="text-[0.52rem] tracking-[0.2em] text-[#9a7b5a] uppercase sm:text-[0.58rem]">
            T-Minus · Doors Open
          </p>
          <p className={cn(SERIF, "text-base text-[#f4ebe3] sm:text-lg")}>
            Time Card
          </p>
        </div>
        <span className="shrink-0 rotate-[-7deg] border border-[#a84d5f]/50 px-1.5 py-0.5 text-[0.52rem] tracking-[0.16em] text-[#c46a7a] uppercase">
          {phase === "pending" ? "Sealed" : phase === "open" ? "Live" : "Closed"}
        </span>
      </div>
      {clock}
    </div>
  );
}
