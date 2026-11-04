import { Palette } from "lucide-react";

import { cn } from "@/lib/utils";

/** Fan art gallery before any picture has been approved (the upload banner sits above it). */
export function FanArtEmpty({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mt-10 flex flex-col items-center rounded-3xl r-card px-6 py-14 text-center",
        className
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-r-pri/15 text-r-pri">
        <Palette className="size-5" aria-hidden />
      </span>
      <p className="mt-4 font-[family-name:var(--font-display)] text-xl text-r-text">ยังไม่มีแฟนอาร์ต</p>
    </div>
  );
}
