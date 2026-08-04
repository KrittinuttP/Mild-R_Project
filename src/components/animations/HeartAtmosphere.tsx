"use client";

import {
  createContext,
  useContext,
  useEffect,
  useMemo,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";

import { cn } from "@/lib/utils";

export type HeartAtmosphereVariant = "pulse" | "ecg" | "both";

const STORAGE_KEY = "mild-r-heart-atmosphere-preview";

const VARIANTS: { id: HeartAtmosphereVariant; label: string }[] = [
  { id: "pulse", label: "Pulse" },
  { id: "ecg", label: "ECG" },
  { id: "both", label: "Both" },
];

type HeartPreviewContextValue = {
  variant: HeartAtmosphereVariant;
  setVariant: (v: HeartAtmosphereVariant) => void;
  reduced: boolean;
};

const HeartPreviewContext = createContext<HeartPreviewContextValue | null>(
  null
);

export function HeartAtmosphereProvider({ children }: { children: ReactNode }) {
  const [variant, setVariantState] =
    useState<HeartAtmosphereVariant>("both");
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    const mq = window.matchMedia("(prefers-reduced-motion: reduce)");
    setReduced(mq.matches);
    const onChange = () => setReduced(mq.matches);
    mq.addEventListener("change", onChange);
    return () => mq.removeEventListener("change", onChange);
  }, []);

  useEffect(() => {
    try {
      const saved = localStorage.getItem(
        STORAGE_KEY
      ) as HeartAtmosphereVariant | null;
      if (saved === "pulse" || saved === "ecg" || saved === "both") {
        setVariantState(saved);
      }
    } catch {
      /* ignore */
    }
  }, []);

  const setVariant = (next: HeartAtmosphereVariant) => {
    setVariantState(next);
    try {
      localStorage.setItem(STORAGE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  const value = useMemo(
    () => ({ variant, setVariant, reduced }),
    [variant, reduced]
  );

  return (
    <HeartPreviewContext.Provider value={value}>
      {children}
    </HeartPreviewContext.Provider>
  );
}

function useHeartPreview() {
  const ctx = useContext(HeartPreviewContext);
  if (!ctx) {
    throw new Error("HeartAtmosphere must be used within HeartAtmosphereProvider");
  }
  return ctx;
}

function SoftHeart({
  className,
  style,
}: {
  className?: string;
  style?: CSSProperties;
}) {
  return (
    <svg
      viewBox="0 0 24 24"
      aria-hidden
      className={className}
      style={style}
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
  // Shorter path (fewer peaks) → loop feels snappier; same look mobile + desktop
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

/** Soft heart-wave layer behind character / with BG */
export function HeartAtmosphere({ className }: { className?: string }) {
  const { variant, reduced } = useHeartPreview();

  return (
    <div
      className={cn(
        "pointer-events-none absolute inset-0 z-[1] overflow-hidden",
        className
      )}
      aria-hidden
    >
      {(variant === "pulse" || variant === "both") && (
        <PulseHearts reduced={reduced} />
      )}
      {(variant === "ecg" || variant === "both") && (
        <EcgWave reduced={reduced} />
      )}
      <div className="absolute inset-0 bg-gradient-to-b from-transparent via-transparent to-[#140a0d]/35" />
    </div>
  );
}

/** Floating preview switcher — pick Pulse / ECG / Both */
export function HeartAtmospherePreviewControls() {
  const { variant, setVariant } = useHeartPreview();

  return (
    <div className="pointer-events-auto fixed right-3 bottom-[max(5.5rem,env(safe-area-inset-bottom))] z-[60] flex flex-col gap-1.5 rounded-2xl border border-[#f3b8c4]/20 bg-[#140a0d]/85 p-2 shadow-lg backdrop-blur-md md:right-6 md:bottom-8">
      <p className="px-1 pt-0.5 text-[0.6rem] tracking-[0.18em] text-[#f3b8c4]/70 uppercase">
        Heart FX preview
      </p>
      <div className="flex gap-1">
        {VARIANTS.map((item) => (
          <button
            key={item.id}
            type="button"
            onClick={() => setVariant(item.id)}
            className={cn(
              "min-h-9 rounded-full px-3 text-xs transition",
              variant === item.id
                ? "bg-[#e85a7a] text-white"
                : "bg-transparent text-[#f7d7de]/85 hover:bg-[#fff5f7]/10"
            )}
          >
            {item.label}
          </button>
        ))}
      </div>
    </div>
  );
}
