import type { Metadata } from "next";
import { redirect } from "next/navigation";

import { AdminXGalleryClient } from "@/components/admin/AdminXGalleryClient";
import { ADMIN_X_GALLERY_LOGIN } from "@/lib/admin-next";
import { isSiteAdminUnlocked } from "@/lib/site-admin-auth";
import { loadXGalleryAdmin } from "@/lib/x-gallery";

export const metadata: Metadata = {
  title: "Admin · Moments from X",
  robots: { index: false, follow: false, nocache: true },
};

export default async function AdminXGalleryPage() {
  // No team session: straight to the password form, then back here.
  if (!(await isSiteAdminUnlocked())) redirect(ADMIN_X_GALLERY_LOGIN);

  const { posts, hideSupported } = await loadXGalleryAdmin();

  return (
    <div className="relative min-h-[100dvh] overflow-x-clip bg-r-bg px-4 py-10 text-r-text sm:px-8 sm:py-14">
      <div className="pointer-events-none absolute -top-24 left-1/2 size-96 -translate-x-1/2 bg-[radial-gradient(circle,rgba(242,67,125,0.12),transparent_70%)]" />
      <AdminXGalleryClient posts={posts} hideSupported={hideSupported} />
    </div>
  );
}
