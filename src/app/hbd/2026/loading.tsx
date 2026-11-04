export default function Hbd2026Loading() {
  return (
    <div className="flex min-h-[100dvh] flex-1 flex-col items-center justify-center bg-r-bg px-6 text-r-text">
      <div
        className="size-10 animate-pulse rounded-full bg-r-pri/35 ring-2 ring-r-pri/25"
        aria-hidden
      />
      <p className="mt-5 text-xs tracking-[0.22em] text-r-text-2 uppercase sm:text-sm">
        Birthday · 2026
      </p>
      <p className="mt-3 font-[family-name:var(--font-display)] text-xl font-normal tracking-normal sm:text-2xl">
        กำลังโหลดคำอวยพร…
      </p>
      <p className="mt-2 max-w-xs text-center text-sm text-r-text-3">
        ดึงข้อมูลล่าสุดจากฮันนี่
      </p>
    </div>
  );
}
