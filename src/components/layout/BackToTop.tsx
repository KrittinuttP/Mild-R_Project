"use client";

import { useEffect, useState } from "react";
import { ChevronUp } from "lucide-react";

import { buttonVariants } from "@/components/ui/button";
import { cn } from "@/lib/utils";

export function BackToTop() {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      setVisible(window.scrollY > window.innerHeight * 0.65);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <button
      type="button"
      aria-label="กลับสู่ด้านบน"
      onClick={() => {
        const reduced = window.matchMedia(
          "(prefers-reduced-motion: reduce)"
        ).matches;
        window.scrollTo({ top: 0, behavior: reduced ? "auto" : "smooth" });
      }}
      className={cn(
        buttonVariants({ variant: "ghost", size: "icon" }),
        "fixed right-4 z-50 size-11 rounded-full border border-[#f3b8c4]/25 bg-[#140a0d]/85 text-[#fff5f7] shadow-lg backdrop-blur-md transition-all duration-300",
        "bottom-[max(1.25rem,env(safe-area-inset-bottom))] md:right-6",
        "hover:bg-[#e85a7a]/90 hover:text-white",
        "focus-visible:ring-2 focus-visible:ring-[#e85a7a]/60",
        visible
          ? "translate-y-0 opacity-100"
          : "pointer-events-none translate-y-3 opacity-0"
      )}
    >
      <ChevronUp className="size-5" />
    </button>
  );
}
