import type { Metadata } from "next";

import { HbdSentPage } from "@/components/hbd/HbdSentPage";
import { HbdStandaloneBar } from "@/components/hbd/HbdStandaloneBar";
import { loadHbdSentRows } from "@/lib/hbd-sent";

export const metadata: Metadata = {
  title: "ฮันนี่ที่ส่งการ์ดแล้ว | Mild-R HBD 2026",
  description: "รายชื่อฮันนี่ที่ส่งการ์ดอวยพรวันเกิด Mild-R · 12 Dec 2026 มาแล้ว",
};

export const revalidate = 60;

/** Standalone copy of /hbd/2026/sent: links stay inside /upload/hbd. */
export default async function StandaloneHbdSentPage() {
  const rows = await loadHbdSentRows();
  return (
    <>
      <HbdStandaloneBar />
      <HbdSentPage
        rows={rows}
        back={{ href: "/upload/hbd", label: "หน้าแรก" }}
        sendHref="/upload/hbd/send"
        className="pt-8 pb-16 sm:pt-12 sm:pb-20"
      />
    </>
  );
}
