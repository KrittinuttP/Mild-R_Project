"use client";

// Self-hosted card fonts (Mali / Itim / Charm); see scripts/fetch-hbd-card-fonts.mjs.
import "@/fonts/hbd-card-fonts.css";

import { useEffect, useRef, useState } from "react";

import {
  HBD_CARD_RATIO,
  drawHbdCard,
  ensureHbdCardFont,
  loadHbdCardTemplate,
  type HbdCardContent,
} from "@/lib/hbd-card-maker";
import { cn } from "@/lib/utils";

/**
 * Live card preview: the same renderer as the file that is sent, drawn at the
 * box's CSS width × devicePixelRatio. Redraws when the content or width changes.
 */
export function HbdCardCanvas({
  content,
  className,
  label = "ตัวอย่างการ์ดอวยพร",
}: {
  content: HbdCardContent;
  className?: string;
  label?: string;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const [width, setWidth] = useState(0);
  const [ready, setReady] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    const observer = new ResizeObserver(([entry]) => setWidth(Math.round(entry.contentRect.width)));
    observer.observe(box);
    return () => observer.disconnect();
  }, []);

  useEffect(() => {
    if (!width) return;
    let cancelled = false;
    const frame = requestAnimationFrame(async () => {
      try {
        const [template] = await Promise.all([loadHbdCardTemplate(), ensureHbdCardFont(content.style.font)]);
        const canvas = canvasRef.current;
        if (cancelled || !canvas) return;
        const ratio = Math.min(window.devicePixelRatio || 1, 2);
        const px = Math.round(width * ratio);
        canvas.width = px;
        canvas.height = Math.round(px * HBD_CARD_RATIO);
        const ctx = canvas.getContext("2d");
        if (!ctx) return;
        drawHbdCard(ctx, template, px, content);
        setReady(true);
      } catch {
        if (!cancelled) setFailed(true);
      }
    });
    return () => {
      cancelled = true;
      cancelAnimationFrame(frame);
    };
  }, [width, content]);

  return (
    <div
      ref={boxRef}
      className={cn("relative w-full overflow-hidden bg-white/[0.04]", className)}
      style={{ aspectRatio: `${2840} / ${2015}` }}
    >
      <canvas ref={canvasRef} role="img" aria-label={label} className="block size-full" />
      {!ready ? (
        <span className="absolute inset-0 flex items-center justify-center text-[13px] text-r-text-3">
          {failed ? "โหลดเทมเพลตไม่ได้ ลองรีเฟรชหน้า" : "กำลังโหลดการ์ด…"}
        </span>
      ) : null}
    </div>
  );
}
