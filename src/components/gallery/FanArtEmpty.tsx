import Link from "next/link";
import { Palette, Upload } from "lucide-react";

import { cn } from "@/lib/utils";

/** Fan art gallery before any picture has been approved. */
export function FanArtEmpty({ className }: { className?: string }) {
  return (
    <div
      className={cn(
        "mt-10 flex flex-col items-center rounded-3xl border border-dashed border-[#e85a7a]/35 bg-[#e85a7a]/[0.05] px-6 py-14 text-center",
        className
      )}
    >
      <span className="flex size-12 items-center justify-center rounded-full bg-[#e85a7a]/15 text-[#e85a7a]">
        <Palette className="size-5" aria-hidden />
      </span>
      <p className="mt-4 font-[family-name:var(--font-display)] text-xl text-[#fff5f7]">ยังไม่มีแฟนอาร์ต</p>
      <p className="mt-2 max-w-sm text-sm leading-relaxed text-[#f3b8c4]/80">
        ส่งแฟนอาร์ตของ Mild-R มาร่วมโปรเจกต์วันเกิดได้เลย ทีมงานจะตรวจก่อนขึ้นหน้านี้
      </p>
      <Link
        href="/fanart/upload"
        className="mt-6 inline-flex min-h-11 items-center gap-2 rounded-2xl bg-[#e85a7a] px-5 text-sm font-semibold text-[#140a0d] transition-colors hover:bg-[#f3b8c4] focus-visible:ring-2 focus-visible:ring-[#f3b8c4] focus-visible:ring-offset-2 focus-visible:ring-offset-[#140a0d] focus-visible:outline-none"
      >
        <Upload className="size-4" aria-hidden />
        ส่งแฟนอาร์ต
      </Link>
    </div>
  );
}
