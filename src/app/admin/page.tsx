import type { Metadata } from "next";

import { AdminHubClient } from "@/components/admin/AdminHubClient";

export const metadata: Metadata = {
  title: "Admin · Control desk",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminPage() {
  return (
    <div className="relative min-h-[100dvh] bg-[#0c0709] px-4 py-10 text-[#fff5f7] sm:px-8 sm:py-14">
      {/* 🌟 Background Ambient Glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-96 bg-[radial-gradient(circle,rgba(232,90,122,0.12),transparent_70%)]" />
      <AdminHubClient />
    </div>
  );
}
