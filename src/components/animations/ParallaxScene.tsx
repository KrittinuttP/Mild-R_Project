"use client";

import { useRef, type ReactNode } from "react";

import { ParallaxLayer } from "@/components/animations/ParallaxLayer";
import { gsap, registerGsapPlugins, useGSAP } from "@/lib/gsap";
import { cn } from "@/lib/utils";
import type { ParallaxLayer as ParallaxLayerData } from "@/types/vtuber";

registerGsapPlugins();

type ParallaxSceneProps = {
  layers: ParallaxLayerData[];
  children?: ReactNode;
  className?: string;
  /** Max vertical travel in px at speed 1 (scaled by each layer's speed). */
  travel?: number;
};

export function ParallaxScene({
  layers,
  children,
  className,
  travel = 140,
}: ParallaxSceneProps) {
  const rootRef = useRef<HTMLDivElement>(null);

  useGSAP(
    () => {
      const root = rootRef.current;
      if (!root) return;

      const layerEls = gsap.utils.toArray<HTMLElement>(
        "[data-parallax-layer]",
        root
      );

      layerEls.forEach((el) => {
        const speed = Number(el.dataset.speed ?? 0.5);

        gsap.fromTo(
          el,
          { y: -travel * speed * 0.25 },
          {
            y: travel * speed,
            ease: "none",
            scrollTrigger: {
              trigger: root,
              start: "top top",
              end: "bottom top",
              scrub: true,
            },
          }
        );
      });
    },
    { scope: rootRef, dependencies: [travel] }
  );

  return (
    <div ref={rootRef} className={cn("relative overflow-hidden", className)}>
      <div className="absolute inset-0 scale-110">
        {layers.map((layer) => (
          <ParallaxLayer key={layer.id} layer={layer} />
        ))}
      </div>
      <div className="relative z-10">{children}</div>
    </div>
  );
}
