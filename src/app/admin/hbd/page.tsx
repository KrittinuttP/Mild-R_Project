import type { Metadata } from "next";

import { AdminHbdClient } from "@/components/admin/AdminHbdClient";

export const metadata: Metadata = {
  title: "Admin · HBD submissions",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminHbdPage() {
  return (
    <div className="relative min-h-[100dvh] bg-[#0c0709] px-4 py-10 text-[#fff5f7] sm:px-8 sm:py-14">
      {/* 🌟 Background Ambient Glow */}
      <div className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 size-96 bg-[radial-gradient(circle,rgba(232,90,122,0.12),transparent_70%)]" />
      <AdminHbdClient />
    </div>
  );
}
