import { DeveloperCredit } from "@/components/layout/Footer";

/** Short footer (2–3 lines) for the standalone upload pages: no links out of the page. */
export function ShortFooter() {
  const year = new Date().getFullYear();

  return (
    <footer className="border-t border-r-text-2/10 bg-[var(--r-footer)] px-5 py-6 pb-[max(1.5rem,env(safe-area-inset-bottom))] text-center text-xs leading-relaxed text-r-text-2/50">
      <p>
        {/* Phones: two lines (the one-liner wrapped mid-phrase) · sm+: one line as before. */}
        <span className="block sm:inline">Mild-R · Unofficial fanclub site</span>
        <span aria-hidden className="hidden sm:inline"> · </span>
        <span className="block sm:inline">© {year} · Not affiliated with Lumina Project</span>
      </p>
      <div className="mt-2 flex justify-center text-r-text-2/45">
        <DeveloperCredit />
      </div>
    </footer>
  );
}
