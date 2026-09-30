import { redirect } from "next/navigation";

import { parseGalleryCategory } from "@/components/gallery/gallery-categories";

type GalleryPageProps = {
  searchParams: Promise<{ [key: string]: string | string[] | undefined }>;
};

/** /gallery (and legacy /gallery?tab=…) → /gallery/{category}. */
export default async function GalleryPage({ searchParams }: GalleryPageProps) {
  const { tab } = await searchParams;
  redirect(`/gallery/${parseGalleryCategory(Array.isArray(tab) ? tab[0] : tab)}`);
}
