"use client";

import { useCallback, useState, type ComponentPropsWithoutRef } from "react";

import { ProtectedImage } from "@/components/media/ProtectedImage";
import { cn } from "@/lib/utils";

type FadeInImageProps = Omit<
  ComponentPropsWithoutRef<typeof ProtectedImage>,
  "onLoad" | "onError" | "ref"
> & {
  /** Must be positioned (e.g. `absolute inset-0 block`) inside a `relative` parent. */
  wrapClassName: string;
  placeholderClassName?: string;
};

/** ProtectedImage with a pulse placeholder that fades the image in once loaded. */
export function FadeInImage({
  src,
  wrapClassName,
  placeholderClassName,
  ...props
}: FadeInImageProps) {
  const srcKey = typeof src === "string" ? src : "";
  const [settledSrc, setSettledSrc] = useState<string | null>(null);
  const settled = settledSrc === srcKey;

  const settle = useCallback(() => setSettledSrc(srcKey), [srcKey]);

  // Images decoded before hydration never fire onLoad.
  const imgRef = useCallback(
    (el: HTMLImageElement | null) => {
      if (el?.complete) setSettledSrc(srcKey);
    },
    [srcKey]
  );

  return (
    <>
      <span
        aria-hidden
        className={cn(
          "pointer-events-none absolute inset-0 bg-[#f3b8c4]/[0.06] transition-opacity duration-300",
          settled ? "opacity-0" : "animate-pulse",
          placeholderClassName
        )}
      />
      <ProtectedImage
        ref={imgRef}
        src={src}
        onLoad={settle}
        onError={settle}
        wrapClassName={cn(
          wrapClassName,
          "transition-opacity duration-300 ease-out",
          settled ? "opacity-100" : "opacity-0"
        )}
        {...props}
      />
    </>
  );
}
