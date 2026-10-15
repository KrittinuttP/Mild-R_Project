import type { Metadata } from "next";

import { FanartUploadClient } from "@/components/fanart/FanartUploadClient";

export const metadata: Metadata = {
  title: "ส่งแฟนอาร์ต | Mild-R",
  description: "อัปโหลดแฟนอาร์ต Mild-R ให้ทีมงานตรวจก่อนเก็บเข้าคลัง",
};

/** Standalone copy of /fanart/upload for sharing with uploaders. */
export default function StandaloneFanartUploadPage() {
  return <FanartUploadClient standalone />;
}
