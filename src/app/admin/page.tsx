import type { Metadata } from "next";

import { AdminHubClient } from "@/components/admin/AdminHubClient";

export const metadata: Metadata = {
  title: "Admin · Control desk",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminPage() {
  return (
    <div className="relative min-h-[100dvh] overflow-x-clip bg-r-bg px-4 py-10 text-r-text sm:px-8 sm:py-14">
      {/* 🌟 Background Ambient Glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-96 bg-[radial-gradient(circle,rgba(242,67,125,0.12),transparent_70%)]" />
      <AdminHubClient />
    </div>
  );
}
