import type { Metadata } from "next";

import { AdminHbdClient } from "@/components/admin/AdminHbdClient";

export const metadata: Metadata = {
  title: "Admin · HBD submissions",
  robots: { index: false, follow: false, nocache: true },
};

export default function AdminHbdPage() {
  return (
    <div className="min-h-[100dvh] bg-[#0a0c0e] px-4 py-10 text-[#d8d0c4] sm:px-8 sm:py-14">
      <AdminHbdClient />
    </div>
  );
}
