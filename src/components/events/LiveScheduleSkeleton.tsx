import { buttonVariants } from "@/components/ui/button";
import {
  CTA_OUTLINE_CLASS,
  GLASS_CARD_CLASS,
  META_CLASS,
} from "@/lib/site-ui";
import { cn } from "@/lib/utils";

type LiveScheduleSkeletonProps = {
  variant?: "compact" | "full" | "calendar";
  className?: string;
};

function Pulse({ className }: { className?: string }) {
  return (
    <div
      className={cn("animate-pulse rounded-2xl bg-[#f3b8c4]/10", className)}
      aria-hidden
    />
  );
}

function CompactSkeleton() {
  return (
    <div
      className="space-y-5"
      aria-busy="true"
      aria-label="กำลังโหลดตารางไลฟ์"
    >
      <div className="flex items-center justify-between gap-3">
        <div className="space-y-2.5">
          <Pulse className="h-3.5 w-28 rounded-full" />
          <Pulse className="h-7 w-44" />
        </div>
        <Pulse className="h-10 w-28 rounded-2xl" />
      </div>
      <div className="grid grid-cols-7 gap-2 sm:gap-3">
        {Array.from({ length: 7 }).map((_, i) => (
          <div key={i} className="space-y-2">
            <Pulse className="mx-auto h-3 w-8 rounded-full" />
            <Pulse className="min-h-[5.75rem] w-full rounded-2xl border border-[#f3b8c4]/10 bg-[#1a0c12]/40 sm:min-h-[7.25rem]" />
          </div>
        ))}
      </div>
    </div>
  );
}

/** Month calendar card body — stats bar + weekday row + day cells */
function CalendarMonthSkeleton() {
  return (
    <div aria-busy="true" aria-label="กำลังโหลดปฏิทินรายเดือน">
      <div className="flex flex-wrap items-center justify-end gap-x-3 gap-y-1.5 border-b border-[#f3b8c4]/10 px-3 py-2 sm:gap-3 sm:px-4 sm:py-2.5">
        <Pulse className="mr-auto h-4 w-24 rounded-full" />
        <Pulse className="h-6 w-16 rounded-full sm:w-20" />
        <Pulse className="hidden h-6 w-16 rounded-full sm:block sm:w-20" />
        <Pulse className="hidden h-6 w-14 rounded-full sm:block sm:w-16" />
      </div>

      <div className="grid grid-cols-7 gap-px bg-[#f3b8c4]/08 p-px">
        {Array.from({ length: 7 }).map((_, i) => (
          <Pulse
            key={`wd-${i}`}
            className="h-8 rounded-none bg-[#1a0c12]/80 sm:h-9"
          />
        ))}
        {Array.from({ length: 42 }).map((_, i) => (
          <Pulse
            key={`day-${i}`}
            className="aspect-square rounded-none bg-[#140a0d]/55 sm:aspect-auto sm:min-h-[7.5rem] md:min-h-[8.5rem]"
          />
        ))}
      </div>

      <p className={cn(META_CLASS, "py-4 text-center text-[#f3b8c4]/45")}>
        กำลังโหลดปฏิทิน…
      </p>
    </div>
  );
}

function FullSkeleton() {
  return (
    <div
      className="space-y-14 sm:space-y-16"
      aria-busy="true"
      aria-label="กำลังโหลดตารางไลฟ์"
    >
      <section>
        <Pulse className="h-3.5 w-28 rounded-full" />
        <Pulse className="mt-4 h-8 w-52" />
        <Pulse className="mt-3 h-4 w-64 max-w-full rounded-full" />
        <div className="mt-8 grid grid-cols-7 gap-2 sm:gap-3">
          {Array.from({ length: 7 }).map((_, i) => (
            <Pulse
              key={i}
              className="min-h-[7rem] w-full rounded-2xl bg-[#f3b8c4]/8 sm:min-h-[8rem]"
            />
          ))}
        </div>
      </section>

      <section className="space-y-5">
        <div>
          <Pulse className="h-3.5 w-32 rounded-full" />
          <Pulse className="mt-4 h-8 w-48" />
        </div>
        <div className={cn(GLASS_CARD_CLASS, "overflow-hidden")}>
          <Pulse className="h-14 w-full rounded-none bg-[#f3b8c4]/8" />
          <div className="grid grid-cols-7 gap-px border-t border-[#f3b8c4]/10 bg-[#f3b8c4]/08 p-px">
            {Array.from({ length: 35 }).map((_, i) => (
              <Pulse
                key={i}
                className="aspect-square rounded-none bg-[#140a0d]/55 sm:aspect-auto sm:min-h-[6.5rem]"
              />
            ))}
          </div>
        </div>
      </section>

      <p className={cn(META_CLASS, "text-center text-[#f3b8c4]/45")}>
        กำลังโหลดตารางไลฟ์…
      </p>
    </div>
  );
}

export function LiveScheduleSkeleton({
  variant = "compact",
  className,
}: LiveScheduleSkeletonProps) {
  return (
    <div className={className}>
      {variant === "full" ? (
        <FullSkeleton />
      ) : variant === "calendar" ? (
        <CalendarMonthSkeleton />
      ) : (
        <CompactSkeleton />
      )}
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
        GLASS_CARD_CLASS,
        "px-5 py-10 text-center sm:px-8",
        className
      )}
      role="alert"
    >
      <p className={META_CLASS}>Live</p>
      <p className="mt-3 font-[family-name:var(--font-display)] text-lg font-normal text-[#fff5f7] sm:text-xl">
        โหลดตารางไลฟ์ไม่สำเร็จ
      </p>
      {message ? (
        <p className="mt-2 text-sm text-[#f3b8c4]/55">{message}</p>
      ) : null}
      <button
        type="button"
        onClick={onRetry}
        className={cn(
          buttonVariants({ variant: "outline", size: "lg" }),
          CTA_OUTLINE_CLASS,
          "mt-6"
        )}
      >
        ลองใหม่
      </button>
    </div>
  );
}
