import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminFanartClient } from "@/components/admin/AdminFanartClient";
import { ADMIN_FANART_LOGIN } from "@/lib/admin-next";
import { isSiteAdminUnlocked } from "@/lib/site-admin-auth";

export const metadata: Metadata = {
  title: "Admin · Fan art submissions",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminFanartPage() {
  // No team session: straight to the password form, then back here.
  if (!(await isSiteAdminUnlocked())) redirect(ADMIN_FANART_LOGIN);

  return (
    <div className="relative min-h-[100dvh] bg-[#0c0709] px-4 py-10 text-[#fff5f7] sm:px-8 sm:py-14">
      <div className="pointer-events-none absolute -top-24 left-1/2 size-96 -translate-x-1/2 bg-[radial-gradient(circle,rgba(232,90,122,0.12),transparent_70%)]" />
      <AdminFanartClient />
    </div>
  );
}
