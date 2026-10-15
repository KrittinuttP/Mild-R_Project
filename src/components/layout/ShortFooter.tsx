import { DeveloperCredit } from "@/components/layout/Footer";

/** Two-line footer for the standalone upload pages: no links out of the page. */
export function ShortFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-[#f3b8c4]/10 bg-[#0e0609] px-5 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-xs leading-relaxed text-[#f3b8c4]/50">
      <p>
        Mild-R · Unofficial fanclub site · © {year} Fan-made · Not affiliated
        with Lumina Project
      </p>
      <div className="mt-2 flex justify-center text-[#f3b8c4]/45">
        <DeveloperCredit />
      </div>
    </footer>
  );
}
