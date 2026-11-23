import type { Metadata } from "next";

import { HbdStandaloneBar } from "@/components/hbd/HbdStandaloneBar";
import { HbdUploadClient } from "@/components/hbd/HbdUploadClient";
import { loadHbdSentNames } from "@/lib/hbd-submissions-store";

export const metadata: Metadata = {
  title: "ส่งการ์ดอวยพร | Mild-R HBD 2026",
  description:
    "อัปโหลดการ์ดอวยพรวันเกิด Mild-R · 12 Dec 2026 — จากฮันนี่ถึง mutant สาวของเรา",
};

/** The sent count on the list button; a send or an admin change refreshes it at once. */
export const revalidate = 60;

/** Standalone copy of /hbd/2026/upload for sharing with uploaders (reached from /upload/hbd). */
export default async function StandaloneHbdSendPage() {
  const sentCount = (await loadHbdSentNames()).length;
  return (
    <>
      <HbdStandaloneBar wide />
      <HbdUploadClient standalone sentCount={sentCount} />
    </>
  );
}
