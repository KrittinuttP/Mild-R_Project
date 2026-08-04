import { cn } from "@/lib/utils";
import type { ParallaxLayer as ParallaxLayerData } from "@/types/vtuber";

type ParallaxLayerProps = {
  layer: ParallaxLayerData;
  className?: string;
};

export function ParallaxLayer({ layer, className }: ParallaxLayerProps) {
  const isCharacter = layer.id === "hero-character";

  return (
    <div
      data-parallax-layer
      data-speed={layer.speed}
      className={cn(
        "pointer-events-none absolute inset-0 will-change-transform",
        className
      )}
      style={{ zIndex: layer.zIndex ?? 0 }}
      aria-hidden={layer.alt ? undefined : true}
    >
      <div
        {...(isCharacter ? { "data-hero-char": true } : {})}
        className={cn("h-full w-full", isCharacter && "will-change-transform")}
        style={
          isCharacter
            ? { transformStyle: "preserve-3d", backfaceVisibility: "hidden" }
            : undefined
        }
      >
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={layer.src}
          alt={layer.alt ?? ""}
          className="h-full w-full object-cover object-center"
          draggable={false}
        />
      </div>
    </div>
  );
}
