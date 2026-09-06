"use client";

import { useCallback, useImperativeHandle, useRef, useState, type Ref } from "react";
import { LiveDetailModal } from "@/components/events/LiveDetailModal";
import type { LiveSlot } from "@/types/vtuber";

type DetailHandle = { open: (slot: LiveSlot) => void };

export function useLiveDetail() {
  const detailRef = useRef<DetailHandle>(null);
  const openDetail = useCallback((slot: LiveSlot) => {
    detailRef.current?.open(slot);
  }, []);
  return { detailRef, openDetail };
}

/** Keep modal interaction state out of the schedule's render tree. */
export function LiveDetailHost({ ref, slots }: { ref: Ref<DetailHandle>; slots: LiveSlot[] }) {
  const [slot, setSlot] = useState<LiveSlot | null>(null);
  useImperativeHandle(ref, () => ({ open: setSlot }), []);
  return (
    <LiveDetailModal
      slot={slot}
      open={slot !== null}
      onOpenChange={(open) => { if (!open) setSlot(null); }}
      onSelectSlot={(id) => {
        const related = slots.find((item) => item.id === id);
        if (related) setSlot(related);
      }}
    />
  );
}
