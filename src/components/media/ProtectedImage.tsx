import type { ComponentPropsWithoutRef } from "react";

import { cn } from "@/lib/utils";

type ProtectedImageProps = Omit<
  ComponentPropsWithoutRef<"img">,
  "draggable"
> & {
  wrapClassName?: string;
};

/** Image with drag disabled + protect marker for MediaProtection. */
export function ProtectedImage({
  className,
  wrapClassName,
  alt,
  ...props
}: ProtectedImageProps) {
  return (
    <span
      data-protect-media
      className={cn(wrapClassName ?? "contents")}
    >
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img
        alt={alt}
        draggable={false}
        className={cn("select-none [-webkit-user-drag:none]", className)}
        {...props}
      />
    </span>
  );
}
