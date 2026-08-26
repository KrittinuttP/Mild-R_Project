import type { Metadata } from "next";
import { IBM_Plex_Sans_Thai, Noto_Sans_Thai } from "next/font/google";

import { SoftNavMarker } from "@/components/layout/SoftNavMarker";

import "./globals.css";

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-sans",
  subsets: ["thai", "latin"],
  weight: ["400", "500", "600", "700"],
});

const ibmPlexSansThai = IBM_Plex_Sans_Thai({
  variable: "--font-display",
  subsets: ["thai", "latin"],
  weight: ["300", "400", "500", "600"],
});

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
      <body className="flex min-h-full flex-col bg-[#140a0d] font-sans text-base leading-relaxed text-[#fff5f7]">
        <SoftNavMarker />
        {children}
      </body>
    </html>
  );
}
