import type { Metadata } from "next";

import { FanartUploadClient } from "@/components/fanart/FanartUploadClient";
import { mildRData } from "@/data/vtuber-data";
import { getFanartUsage } from "@/lib/fanart-usage";
import { heroNameFont } from "@/lib/hero-fonts";

export const metadata: Metadata = {
  title: "ส่งแฟนอาร์ต | Mild-R",
  description: "อัปโหลดแฟนอาร์ต Mild-R ให้ทีมงานตรวจก่อนเก็บเข้าคลัง",
};

/** Standalone copy of /fanart/upload for sharing with uploaders. */
export default function StandaloneFanartUploadPage() {
  return (
    <>
      {/* Logo only (not a link): this page stays separate from the main site. */}
      <div
        className={`${heroNameFont.variable} sticky top-0 z-30 border-b border-white/10 bg-r-bg/88 pt-[env(safe-area-inset-top)] shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md`}
      >
        <div className="mx-auto flex h-14 max-w-lg items-center px-4 sm:h-16 sm:px-5 lg:max-w-[1160px] lg:px-10">
          <span className="inline-flex items-baseline gap-1.5 font-r-name text-[1.3rem] leading-none font-extrabold text-r-text sm:text-[1.45rem]">
            {mildRData.basic.name}
            <span className="font-sans text-[13px] font-normal" aria-hidden>
              {mildRData.fan.oshiMark}
            </span>
          </span>
        </div>
      </div>
      <FanartUploadClient standalone usage={getFanartUsage()} />
    </>
  );
}
