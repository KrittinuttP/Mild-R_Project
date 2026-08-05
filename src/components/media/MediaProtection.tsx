"use client";

import { useEffect } from "react";

function isProtectedTarget(target: EventTarget | null) {
  if (!(target instanceof Element)) return false;
  return Boolean(target.closest("img, [data-protect-media]"));
}

/** Blocks right-click / drag on images across the page (deterrent only). */
export function MediaProtection() {
  useEffect(() => {
    const onContextMenu = (event: MouseEvent) => {
      if (isProtectedTarget(event.target)) {
        event.preventDefault();
      }
    };

    const onDragStart = (event: DragEvent) => {
      if (isProtectedTarget(event.target)) {
        event.preventDefault();
      }
    };

    document.addEventListener("contextmenu", onContextMenu);
    document.addEventListener("dragstart", onDragStart);

    return () => {
      document.removeEventListener("contextmenu", onContextMenu);
      document.removeEventListener("dragstart", onDragStart);
    };
  }, []);

  return null;
}
