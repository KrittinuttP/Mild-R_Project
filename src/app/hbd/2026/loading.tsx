export default function Hbd2026Loading() {
  return (
    <div className="flex min-h-[100dvh] flex-1 flex-col items-center justify-center bg-[#140a0d] px-6 text-[#fff5f7]">
      <div
        className="size-10 animate-pulse rounded-full bg-[#e85a7a]/35 ring-2 ring-[#e85a7a]/25"
        aria-hidden
      />
      <p className="mt-5 text-xs tracking-[0.22em] text-[#f3b8c4]/80 uppercase sm:text-sm">
        Birthday · 2026
      </p>
      <p className="mt-3 font-[family-name:var(--font-display)] text-xl font-normal tracking-normal sm:text-2xl">
        กำลังโหลดคำอวยพร…
      </p>
      <p className="mt-2 max-w-xs text-center text-sm text-[#f3b8c4]/65">
        ดึงข้อมูลล่าสุดจากฮันนี่
      </p>
    </div>
  );
}
