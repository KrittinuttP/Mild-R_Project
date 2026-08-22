import { cn } from "@/lib/utils";

type LiveScheduleSkeletonProps = {
  variant?: "compact" | "full";
  className?: string;
};

function Pulse({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-sm bg-[#f3b8c4]/10", className)}
      aria-hidden
    />
  );
}

function CompactSkeleton() {
  return (
    <div className="space-y-4" aria-busy="true" aria-label="กำลังโหลดตารางไลฟ์">
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2">
          <Pulse className="h-3 w-28" />
          <Pulse className="h-6 w-40" />
        </div>
        <Pulse className="h-9 w-24" />
      </div>
      <div className="grid grid-cols-7 gap-2 sm:gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Pulse className="mx-auto h-3 w-8" />
            <Pulse className="min-h-[5.75rem] w-full sm:min-h-[7.25rem]" />
          </div>
        ))}
      </div>
    </div>
  );
}

function FullSkeleton() {
  return (
    <div className="space-y-16 sm:space-y-20" aria-busy="true" aria-label="กำลังโหลดตารางไลฟ์">
      <section className="border border-[#e85a7a]/20 bg-[#1a0d12]/35 px-4 py-6 sm:px-6 sm:py-8">
        <Pulse className="h-4 w-36" />
        <Pulse className="mt-4 h-8 w-52" />
        <Pulse className="mt-2 h-4 w-64 max-w-full" />
        <div className="mt-8 grid grid-cols-7 gap-2 sm:gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Pulse key={i} className="min-h-[7rem] w-full sm:min-h-[8rem]" />
          ))}
        </div>
      </section>

      <section>
        <Pulse className="h-4 w-32" />
        <Pulse className="mt-4 h-8 w-48" />
        <Pulse className="mt-8 h-10 w-full max-w-md" />
        <div className="mt-4 grid grid-cols-7 gap-px border border-[#f3b8c4]/10 bg-[#f3b8c4]/10">
          {Array.from({ length: 42 }).map((_, i) => (
            <Pulse key={i} className="aspect-square bg-[#140a0d] sm:aspect-auto sm:min-h-[7rem]" />
          ))}
        </div>
      </section>
    </div>
  );
}

export function LiveScheduleSkeleton({
  variant = "compact",
  className,
}: LiveScheduleSkeletonProps) {
  return (
    <div className={className}>
      {variant === "full" ? <FullSkeleton /> : <CompactSkeleton />}
    </div>
  );
}

export function LiveScheduleError({
  message,
  onRetry,
  className,
}: {
  message?: string | null;
  onRetry: () => void;
  className?: string;
}) {
  return (
    <div
      className={cn(
        "border border-dashed border-[#f3b8c4]/25 bg-[#1a0d12]/35 px-5 py-8 text-center text-sm text-[#f3b8c4]/70",
        className
      )}
      role="alert"
    >
      <p>โหลดตารางไลฟ์ไม่สำเร็จ</p>
      {message ? (
        <p className="mt-1 text-xs text-[#f3b8c4]/45">{message}</p>
      ) : null}
      <button
        type="button"
        onClick={onRetry}
        className="mt-4 border border-[#e85a7a]/40 px-4 py-2 text-xs tracking-wide text-[#e85a7a] uppercase transition hover:bg-[#e85a7a]/10"
      >
        ลองใหม่
      </button>
    </div>
  );
}
