"use client";

import { useEffect, useState } from "react";

import { cn } from "@/lib/utils";

function SoftHeart({ className }: { className?: string }) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      fill="currentColor"
    >
      <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z" />
    </svg>
  );
}

function PulseHearts({ reduced }: { reduced: boolean }) {
  return (
    <div className="absolute inset-0 overflow-hidden">
      <SoftHeart
        className={cn(
          "absolute top-[18%] left-[12%] size-[18vw] max-w-40 text-[#e85a7a]/25 md:left-[18%] md:size-[12vw]",
          !reduced && "animate-heart-pulse"
        )}
      />
      <SoftHeart
        className={cn(
          "absolute top-[34%] right-[8%] size-[28vw] max-w-56 text-[#e85a7a]/18 md:right-[14%] md:size-[16vw]",
          !reduced && "animate-heart-pulse-delayed"
        )}
      />
      <SoftHeart
        className={cn(
          "absolute bottom-[28%] left-[28%] size-[14vw] max-w-28 text-[#f3b8c4]/16 md:bottom-[22%] md:left-[40%] md:size-[9vw]",
          !reduced && "animate-heart-pulse-slow"
        )}
      />
    </div>
  );
}

function EcgWave({ reduced }: { reduced: boolean }) {
  const path =
    "M0 100 H50 L62 100 L74 40 L90 168 L106 100 H170 L182 100 L194 52 L210 156 L226 100 H290 L302 100 L314 36 L330 172 L346 100 H410 L422 100 L434 48 L450 160 L466 100 H530 L542 100 L554 42 L570 166 L586 100 H640";

  return (
    <div className="absolute inset-0 flex items-center overflow-hidden opacity-80">
      <svg
        className="h-auto w-[165%] max-w-none origin-left scale-[1.85] text-[#e85a7a]/75 md:w-[170%] md:scale-[1.55] md:text-[#e85a7a]/65"
        viewBox="0 0 640 200"
        preserveAspectRatio="xMinYMid meet"
        aria-hidden
      >
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="9"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.12"
          vectorEffect="non-scaling-stroke"
        />
        <path
          d={path}
          fill="none"
          stroke="currentColor"
          strokeWidth="2"
          strokeLinecap="round"
          strokeLinejoin="round"
          opacity="0.32"
          vectorEffect="non-scaling-stroke"
        />
        {!reduced ? (
          <path
            d={path}
            fill="none"
            stroke="currentColor"
            strokeWidth="3.2"
            strokeLinecap="round"
            strokeLinejoin="round"
            className="animate-ecg-trace"
            pathLength={1000}
            vectorEffect="non-scaling-stroke"
            style={{
              strokeDasharray: "110 890",
            }}
          />
        ) : null}
      </svg>
    </div>
  );
}

function usePrefersReducedMotion() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  return reduced;
}

/** Soft heart-wave layer behind character / with BG — always pulse + ECG */
export function HeartAtmosphere({ className }: { className?: string }) {
  const reduced = usePrefersReducedMotion();

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-[1] overflow-hidden",
        className
      )}
      aria-hidden
    >
      <PulseHearts reduced={reduced} />
      <EcgWave reduced={reduced} />
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#140a0d]/35" />
    </div>
  );
}
