import type { Metadata, Viewport } from "next";

import { SherlockSweetieLogo } from "@/components/cafe/SherlockSweetieLogo";
import { FanartUploadClient } from "@/components/fanart/FanartUploadClient";
import { getFanartUsage } from "@/lib/fanart-usage";

// Cafe serif faces for the logo + headings (only this page loads them).
import "@/fonts/cafe-fonts.css";

export const metadata: Metadata = {
  title: "ส่งแฟนอาร์ต | Mild-R",
  description: "อัปโหลดแฟนอาร์ต Mild-R ให้ทีมงานตรวจก่อนเก็บเข้าคลัง",
};

/** Phone browser bar in the cafe's green, like /cafe. */
export const viewport: Viewport = {
  themeColor: "#0f2a24",
};

/**
 * Standalone copy of /fanart/upload for sharing with uploaders.
 * Cafe theme (5 Nov): `data-theme="cafe-upload"` swaps the Project R colour tokens
 * (globals.css) — same form as /fanart/upload, which keeps the main theme.
 */
export default function StandaloneFanartUploadPage() {
  return (
    <div data-theme="cafe-upload" className="font-v-cafe-serif font-v-cafe-thai">
      {/* Logo only (not a link): this page stays separate from the main site. */}
      <div className="sticky top-0 z-30 border-b border-cafe-gold/25 bg-r-bg/90 pt-[env(safe-area-inset-top)] shadow-[0_8px_24px_rgba(0,0,0,0.35)] backdrop-blur-md">
        <div className="mx-auto flex h-14 max-w-lg items-center px-4 sm:h-16 sm:px-5 lg:max-w-[1160px] lg:px-10">
          <SherlockSweetieLogo variant="inline" as="span" className="text-[15px] sm:text-[17px]" />
        </div>
      </div>
      <FanartUploadClient standalone usage={getFanartUsage()} />
    </div>
  );
}
