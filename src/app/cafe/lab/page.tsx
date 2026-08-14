import type { Metadata } from "next";
import { redirect } from "next/navigation";
import Link from "next/link";

import { CafePromo } from "@/components/cafe/CafePromo";
import { mildRData } from "@/data/vtuber-data";
import { isCafeSettingsUnlocked } from "@/lib/cafe-settings-auth";
import { defaultCafeVisibility } from "@/lib/cafe-visibility";

export const metadata: Metadata = {
  title: "Cafe Lab · Full reveal",
  robots: { index: false, follow: false, nocache: true },
};

export const dynamic = "force-dynamic";

/** Secret full-reveal preview — unlock via /cafe/settings first. */
export default async function CafeLabPage() {
  if (!(await isCafeSettingsUnlocked())) {
    redirect("/cafe/settings");
  }

  return (
    <div>
      <div className="sticky top-0 z-50 border-b border-[#a84d5f]/40 bg-[#140c0e]/95 px-4 py-2.5 text-center backdrop-blur-sm sm:px-6">
        <p className="text-[0.62rem] tracking-[0.22em] text-[#c46a7a] uppercase">
          Lab · Full reveal · ไม่ใช้ visibility จาก DB
        </p>
        <div className="mt-1.5 flex flex-wrap items-center justify-center gap-3 text-xs text-[#c4b8a8]">
          <Link href="/cafe" className="hover:text-[#f4ebe3]">
            หน้าจริง `/cafe`
          </Link>
          <span className="text-[#9a7b5a]/50">·</span>
          <Link href="/cafe/settings" className="hover:text-[#f4ebe3]">
            Settings
          </Link>
        </div>
      </div>
      <CafePromo
        cafe={mildRData.cafe}
        visibility={defaultCafeVisibility()}
      />
    </div>
  );
}
