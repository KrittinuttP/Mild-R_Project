import type { Metadata } from "next";
import { Figtree, Syne } from "next/font/google";

import "./globals.css";

const figtree = Figtree({
  variable: "--font-sans",
  subsets: ["latin"],
});

const syne = Syne({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600", "700", "800"],
});

export const metadata: Metadata = {
  title: "Mild-R | Pixela-World-End Fanclub",
  description:
    "Fanclub scrollytelling site for Mild-R from Pixela-World-End / Pixela Project.",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${figtree.variable} ${syne.variable} h-full antialiased`}
    >
      <body className="flex min-h-full flex-col bg-[#140a0d] font-sans text-[#fff5f7]">
        {children}
      </body>
    </html>
  );
}
