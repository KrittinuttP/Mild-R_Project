import type { Metadata } from "next";
import type { ReactNode } from "react";

import { ShortFooter } from "@/components/layout/ShortFooter";
import { MediaProtection } from "@/components/media/MediaProtection";

/** Links handed to uploaders only: kept out of search results. */
export const metadata: Metadata = {
  robots: { index: false, follow: false },
};

/**
 * Standalone upload pages (/upload/*): no site header, menu or back-to-top,
 * and a short footer, so the visitor only sees the upload form.
 */
export default function UploadLayout({ children }: { children: ReactNode }) {
  return (
    <>
      <MediaProtection />
      <main className="flex-1 bg-[#140a0d] text-[#f7d7de]">{children}</main>
      <ShortFooter />
    </>
  );
}
