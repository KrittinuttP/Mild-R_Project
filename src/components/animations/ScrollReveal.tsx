"use client";

import { useRef, type ElementType, type ReactNode } from "react";

import { gsap, registerGsapPlugins, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";

registerGsapPlugins();

type RevealVariant = "soft" | "editorial" | "float";

type ScrollRevealProps = {
  children: ReactNode;
  className?: string;
  y?: number;
  delay?: number;
  /** soft = body stagger · editorial = headline from the rule · float = Mild-R lift */
  variant?: RevealVariant;
  /** Render as semantic element (e.g. li inside ul/ol) */
  as?: ElementType;
};

const VARIANT: Record<
  RevealVariant,
  { y: number; duration: number; ease: string; fromX: number }
> = {
  soft: { y: 28, duration: 0.85, ease: "power3.out", fromX: 0 },
  editorial: { y: 16, duration: 0.75, ease: "power2.out", fromX: -6 },
  float: { y: 36, duration: 1, ease: "power2.out", fromX: 0 },
};

export function ScrollReveal({
  children,
  className,
  y,
  delay = 0,
  variant = "soft",
  as: Tag = "div",
}: ScrollRevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const preset = VARIANT[variant];
  const offsetY = y ?? preset.y;
  const fromX = preset.fromX;
  const duration = preset.duration;
  const ease = preset.ease;

  useGSAP(
    () => {
      const el = ref.current;
      if (!el) return;

      const reduced = window.matchMedia(
        "(prefers-reduced-motion: reduce)"
      ).matches;
      if (reduced) {
        gsap.set(el, { autoAlpha: 1, x: 0, y: 0 });
        return;
      }

      gsap.fromTo(
        el,
        {
          autoAlpha: 0,
          y: offsetY,
          x: fromX,
        },
        {
          autoAlpha: 1,
          y: 0,
          x: 0,
          duration,
          delay,
          ease,
          scrollTrigger: {
            trigger: el,
            start: "top 88%",
            toggleActions: "play none none reverse",
          },
        }
      );
    },
    {
      scope: ref,
      dependencies: [offsetY, fromX, duration, ease, delay],
      revertOnUpdate: true,
    }
  );

  return (
    <Tag
      ref={ref}
      className={cn("will-change-transform", className)}
    >
      {children}
    </Tag>
  );
}
