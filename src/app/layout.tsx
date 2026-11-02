import type { Metadata } from "next";

import { SoftNavMarker } from "@/components/layout/SoftNavMarker";

import "@/fonts/site-fonts.css";
import "./globals.css";

// Self-hosted fonts (src/fonts/site-fonts.css): Noto Sans Thai 400–700 → --font-sans,
// IBM Plex Sans Thai 300–600 → --font-display. Same files next/font/google used to fetch.
const notoSansThai = { variable: "font-v-sans" } as const;
const ibmPlexSansThai = { variable: "font-v-display" } as const;

export const metadata: Metadata = {
  title: "Mild-R | Lumina-World-End Fanclub",
  description:
    "Fanclub scrollytelling site for Mild-R from Lumina-World-End / Lumina Project.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${notoSansThai.variable} ${ibmPlexSansThai.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-r-bg font-sans text-base leading-relaxed text-r-text">
        <SoftNavMarker />
        {children}
      </body>
    </html>
  );
}
