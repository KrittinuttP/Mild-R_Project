import type { Metadata } from "next";

import { HbdUploadClient } from "@/components/hbd/HbdUploadClient";

export const metadata: Metadata = {
  title: "ส่งการ์ดอวยพร | Mild-R HBD 2026",
  description:
    "อัปโหลดการ์ดอวยพรวันเกิด Mild-R · 12.12.2026 — จากฮันนี่ถึง mutant สาวของเรา",
};

/** Standalone copy of /hbd/2026/upload for sharing with uploaders. */
export default function StandaloneHbdUploadPage() {
  return <HbdUploadClient standalone />;
}
