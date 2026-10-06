"use client";

import { useEffect, useRef, useState } from "react";

type LoadMoreOnScrollOptions = {
  hasMore: boolean;
  onLoadMore: () => void;
  /** Change it whenever paging resets (filters, search) to restart the auto-load budget. */
  resetKey: string;
  /** Batches loaded by scrolling before falling back to the button, so the footer stays reachable. */
  maxAuto?: number;
  rootMargin?: string;
};

/**
 * Calls `onLoadMore` when the sentinel nears the viewport, up to `maxAuto` times
 * per `resetKey`. `auto` is false once the budget is spent: show the button then.
 */
export function useLoadMoreOnScroll({
  hasMore,
  onLoadMore,
  resetKey,
  maxAuto = 3,
  rootMargin = "800px 0px",
}: LoadMoreOnScrollOptions) {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const onLoadMoreRef = useRef(onLoadMore);
  const [loads, setLoads] = useState({ key: resetKey, count: 0 });
  const count = loads.key === resetKey ? loads.count : 0;
  const auto = hasMore && count < maxAuto;

  useEffect(() => {
    onLoadMoreRef.current = onLoadMore;
  });

  useEffect(() => {
    const el = sentinelRef.current;
    if (!el || !auto) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (!entries.some((entry) => entry.isIntersecting)) return;
        io.disconnect();
        setLoads({ key: resetKey, count: count + 1 });
        onLoadMoreRef.current();
      },
      { rootMargin }
    );
    io.observe(el);
    return () => io.disconnect();
  }, [auto, count, resetKey, rootMargin]);

  return { sentinelRef, auto };
}
