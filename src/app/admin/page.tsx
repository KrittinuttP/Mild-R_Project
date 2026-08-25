import type { Metadata } from "next";

import { AdminHubClient } from "@/components/admin/AdminHubClient";

export const metadata: Metadata = {
  title: "Admin · Control desk",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminPage() {
  return (
    <div className="min-h-[100dvh] bg-[#0a0c0e] px-4 py-10 text-[#d8d0c4] sm:px-8 sm:py-14">
      <AdminHubClient />
    </div>
  );
}
