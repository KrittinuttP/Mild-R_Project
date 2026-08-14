import type { Metadata } from "next";

import { CafeSettingsClient } from "@/components/cafe/CafeSettingsClient";

export const metadata: Metadata = {
  title: "Cafe Settings",
  robots: { index: false, follow: false, nocache: true },
};

export default function CafeSettingsPage() {
  return (
    <div className="min-h-[70dvh] px-4 py-10 sm:px-8 sm:py-14">
      <CafeSettingsClient />
    </div>
  );
}
