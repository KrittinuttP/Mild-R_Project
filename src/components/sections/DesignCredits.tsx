import type { ReactNode } from "react";
import Link from "next/link";

import { ProtectedImage } from "@/components/media/ProtectedImage";
import { cn } from "@/lib/utils";
import type { CharacterDesign, CreditPerson } from "@/types/vtuber";

export type CreditZone = "art" | "audio" | "loading";

export type CreditEntry = {
  id: string;
  role: string;
  person: CreditPerson;
  zone: CreditZone;
  /** What they made, in Thai (Mama / Papa only) */
  note?: string;
};

function isLoadingCredit(id: string, role: string) {
  const hay = `${id} ${role}`.toLowerCase();
  return hay.includes("loading");
}

/** Split Mama/Papa + staff credits into Art / Audio / Loading zones. */
export function getCreditZones(design: CharacterDesign): Record<
  CreditZone,
  CreditEntry[]
> {
  const art: CreditEntry[] = [
    {
      id: "illustrator",
      role: design.illustratorLabel ?? "Illustrator",
      person: design.illustrator,
      zone: "art",
      note: design.illustratorRoleLocal,
    },
    {
      id: "rigger",
      role: design.riggerLabel ?? "Rigger",
      person: design.rigger,
      zone: "art",
      note: design.riggerRoleLocal,
    },
  ];

  const audio: CreditEntry[] = [];
  const loading: CreditEntry[] = [];

  for (const credit of design.credits ?? []) {
    const entry: CreditEntry = {
      id: credit.id,
      role: credit.roleLocal ?? credit.role,
      person: credit,
      zone: isLoadingCredit(credit.id, credit.role) ? "loading" : "audio",
    };
    if (entry.zone === "loading") loading.push(entry);
    else audio.push(entry);
  }

  return { art, audio, loading };
}

const ZONE_LABEL: Record<CreditZone, string> = {
  art: "Art",
  audio: "Credits",
  loading: "Loading",
};

type AvatarSize = "sm" | "md" | "lg";

const AVATAR_SIZE: Record<AvatarSize, string> = {
  sm: "size-10 sm:size-11",
  md: "size-14 sm:size-16",
  lg: "size-16 sm:size-20 md:size-[5.5rem]",
};

const ROLE_TEXT: Record<AvatarSize, string> = {
  sm: "text-[0.6rem] sm:text-xs",
  md: "text-xs sm:text-sm",
  lg: "text-xs sm:text-sm",
};

const NAME_TEXT: Record<AvatarSize, string> = {
  sm: "text-xs sm:text-sm",
  md: "text-sm sm:text-base",
  lg: "text-sm sm:text-base",
};

const LABEL_MAX: Record<AvatarSize, string> = {
  sm: "w-[4.75rem] sm:w-[5.5rem]",
  md: "w-[6.75rem] sm:w-[8rem]",
  lg: "w-[8.5rem] sm:w-[10rem]",
};

type DesignCreditsProps = {
  design: CharacterDesign;
  zones?: CreditZone[];
  /** `aplus` = Project R home card (CI A+) — ART | CREDITS | LOADING columns */
  variant?: "list" | "strip" | "aplus";
  size?: AvatarSize;
  align?: "start" | "end";
  className?: string;
  hideHeading?: boolean;
  /** Hide @handle under names (overview / dense layouts) */
  showHandle?: boolean;
  /** Horizontal zone columns for overview footer */
  layout?: "stack" | "inline";
};

function CreditAvatar({
  entry,
  size = "lg",
  showHandle = true,
}: {
  entry: CreditEntry;
  size?: AvatarSize;
  showHandle?: boolean;
}) {
  const dim = AVATAR_SIZE[size];
  const img = entry.person.image ? (
    <ProtectedImage
      src={entry.person.image}
      alt={entry.person.name}
      className={cn(
        dim,
        "mx-auto rounded-full object-cover ring-1 ring-[#f3b8c4]/30",
        size !== "sm" && "shadow-[0_8px_24px_rgba(8,2,4,0.35)]"
      )}
    />
  ) : (
    <span
      className={cn(
        "mx-auto inline-flex items-center justify-center rounded-full bg-[#1a0d12] text-xs text-[#f3b8c4]/70 ring-1 ring-[#f3b8c4]/25",
        dim
      )}
    >
      {entry.person.name.slice(0, 1).toUpperCase()}
    </span>
  );

  const body = (
    <>
      {img}
      <span
        className={cn(
          "mx-auto mt-1.5 block text-center leading-snug tracking-[0.08em] break-words text-[#f3b8c4]/85 uppercase",
          size === "sm" ? "mt-1" : "mt-2.5",
          ROLE_TEXT[size],
          LABEL_MAX[size]
        )}
      >
        {entry.role}
      </span>
      <span
        className={cn(
          "mx-auto mt-1 block text-center leading-snug font-medium break-words text-[#fff5f7]",
          NAME_TEXT[size],
          LABEL_MAX[size]
        )}
      >
        {entry.person.name}
      </span>
      {showHandle && entry.person.handle ? (
        <span
          className={cn(
            "mx-auto mt-0.5 block text-center leading-snug break-all text-[#f3b8c4]/55",
            size === "lg" ? "text-xs sm:text-sm" : "text-[0.6rem]",
            LABEL_MAX[size]
          )}
        >
          {entry.person.handle}
        </span>
      ) : null}
    </>
  );

  if (entry.person.url) {
    return (
      <Link
        href={entry.person.url}
        target="_blank"
        rel="noopener noreferrer"
        className="block text-center transition hover:opacity-90"
        title={`${entry.role} · ${entry.person.handle ?? entry.person.name}`}
      >
        {body}
      </Link>
    );
  }

  return (
    <div
      className="text-center"
      title={`${entry.role} · ${entry.person.name}`}
    >
      {body}
    </div>
  );
}

export function DesignCredits({
  design,
  zones = ["art", "audio", "loading"],
  variant = "list",
  size = "lg",
  align = "start",
  className,
  hideHeading = false,
  showHandle = true,
  layout = "stack",
}: DesignCreditsProps) {
  const grouped = getCreditZones(design);
  const activeZones = zones.filter((z) => grouped[z].length > 0);

  if (activeZones.length === 0) return null;

  if (variant === "aplus") {
    return <AplusCredits grouped={grouped} zones={activeZones} className={className} />;
  }

  if (variant === "strip") {
    const compact = size === "sm";

    return (
      <div
        className={cn(
          "pointer-events-auto",
          layout === "inline"
            ? "flex flex-wrap items-start gap-x-6 gap-y-4 lg:gap-x-10"
            : compact
              ? "space-y-3"
              : "space-y-8",
          align === "end" && "text-right",
          className
        )}
      >
        {activeZones.map((zone) => (
          <div
            key={zone}
            className={cn(layout === "inline" && "min-w-0 shrink-0")}
          >
            {!hideHeading ? (
              <p
                className={cn(
                  "tracking-[0.18em] text-[#e85a7a] uppercase",
                  compact ? "text-xs" : "text-xs sm:text-sm"
                )}
              >
                {ZONE_LABEL[zone]}
              </p>
            ) : null}
            <ul
              className={cn(
                "flex flex-wrap",
                compact
                  ? "gap-x-3 gap-y-2"
                  : "gap-x-5 gap-y-6 sm:gap-x-7 sm:gap-y-7",
                !hideHeading && (compact ? "mt-2" : "mt-4"),
                align === "end" && "justify-end"
              )}
            >
              {grouped[zone].map((entry) => (
                <li key={entry.id} className="shrink-0">
                  <CreditAvatar
                    entry={entry}
                    size={size}
                    showHandle={showHandle}
                  />
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
    );
  }

  return (
    <div className={cn("space-y-10", className)}>
      {activeZones.map((zone) => (
        <div key={zone}>
          {!hideHeading ? (
            <p className="text-[0.7rem] tracking-[0.28em] text-[#e85a7a] uppercase sm:text-xs">
              {ZONE_LABEL[zone]}
            </p>
          ) : null}
          <ul className={cn("space-y-4", !hideHeading && "mt-4")}>
            {grouped[zone].map((entry) => {
              const row = (
                <>
                  {entry.person.image ? (
                    <ProtectedImage
                      src={entry.person.image}
                      alt={entry.person.name}
                      className="size-12 shrink-0 rounded-full object-cover ring-1 ring-[#f3b8c4]/25 sm:size-14"
                    />
                  ) : (
                    <span className="inline-flex size-12 shrink-0 items-center justify-center rounded-full bg-[#1a0d12] text-sm text-[#f3b8c4]/70 ring-1 ring-[#f3b8c4]/20 sm:size-14">
                      {entry.person.name.slice(0, 1).toUpperCase()}
                    </span>
                  )}
                  <span className="min-w-0">
                    <span className="block text-[0.7rem] tracking-[0.16em] text-[#f3b8c4]/65 uppercase">
                      {entry.role}
                    </span>
                    <span className="mt-0.5 block truncate text-base text-[#fff5f7] sm:text-lg">
                      {entry.person.name}
                    </span>
                    {showHandle && entry.person.handle ? (
                      <span className="mt-0.5 block truncate text-sm text-[#f3b8c4]/50">
                        {entry.person.handle}
                      </span>
                    ) : null}
                  </span>
                </>
              );

              return (
                <li key={entry.id}>
                  {entry.person.url ? (
                    <Link
                      href={entry.person.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="flex items-center gap-4 transition hover:text-[#e85a7a]"
                    >
                      {row}
                    </Link>
                  ) : (
                    <div className="flex items-center gap-4">{row}</div>
                  )}
                </li>
              );
            })}
          </ul>
        </div>
      ))}
    </div>
  );
}

/* ── CI A+ · Project R home (About · ทีมผู้สร้าง) ─────────────────── */

const APLUS_ZONE_LABEL = "text-xs tracking-[0.24em] text-r-pri uppercase";

function AplusPersonLink({ entry, className, children }: { entry: CreditEntry; className?: string; children: ReactNode }) {
  const title = `${entry.role} · ${entry.person.handle ?? entry.person.name}`;
  if (!entry.person.url) {
    return (
      <div className={className} title={title}>
        {children}
      </div>
    );
  }
  return (
    <Link
      href={entry.person.url}
      target="_blank"
      rel="noopener noreferrer"
      title={title}
      className={cn(
        "rounded-2xl transition-opacity hover:opacity-85 focus-visible:outline-2 focus-visible:outline-offset-4 focus-visible:outline-r-acc",
        className
      )}
    >
      {children}
    </Link>
  );
}

function AplusAvatar({ entry, big = false }: { entry: CreditEntry; big?: boolean }) {
  const dim = big ? "size-[68px]" : "size-12";
  const ring = big
    ? "ring-[1.5px] ring-r-acc ring-offset-2 ring-offset-r-bg"
    : "ring-[1.5px] ring-r-text-2/15";
  return entry.person.image ? (
    <ProtectedImage
      src={entry.person.image}
      alt=""
      loading="lazy"
      className={cn(dim, ring, "shrink-0 rounded-full object-cover")}
    />
  ) : (
    <span
      aria-hidden
      className={cn(dim, ring, "inline-flex shrink-0 items-center justify-center rounded-full bg-white/5 text-sm text-r-text-2")}
    >
      {entry.person.name.slice(0, 1).toUpperCase()}
    </span>
  );
}

function AplusCredits({
  grouped,
  zones,
  className,
}: {
  grouped: Record<CreditZone, CreditEntry[]>;
  zones: CreditZone[];
  className?: string;
}) {
  const cols: Record<CreditZone, string> = {
    art: "lg:flex-[2.3]",
    audio: "lg:flex-[1.75]",
    loading: "lg:flex-[1.2]",
  };

  return (
    <div
      className={cn(
        "flex flex-col gap-6 lg:flex-row lg:items-start",
        // dividers between zones: horizontal on phones, vertical on desktop
        "[&>*+*]:border-t [&>*+*]:border-r-text-2/15 [&>*+*]:pt-6 lg:[&>*+*]:border-t-0 lg:[&>*+*]:border-l lg:[&>*+*]:pt-0 lg:[&>*+*]:pl-6 lg:[&>*+*]:self-stretch",
        className
      )}
    >
      {zones.map((zone) => (
        <div key={zone} className={cn("min-w-0", cols[zone])}>
          <p className={cn(APLUS_ZONE_LABEL, zone === "art" ? "mb-4 lg:mb-[18px]" : "mb-3.5")}>{ZONE_LABEL[zone]}</p>

          {zone === "art" ? (
            <ul className="grid grid-cols-2 gap-4 lg:grid-cols-[minmax(0,1fr)_minmax(0,1.2fr)] lg:gap-5">
              {grouped.art.map((entry) => (
                <li key={entry.id} className="min-w-0">
                  <AplusPersonLink
                    entry={entry}
                    className="flex flex-col items-center gap-2.5 text-center lg:flex-row lg:gap-3.5 lg:text-left"
                  >
                    <AplusAvatar entry={entry} big />
                    <span className="min-w-0">
                      <span className="block text-[0.6875rem] tracking-[0.22em] text-r-pri uppercase">{entry.role}</span>
                      <span className="mt-0.5 block text-[0.9375rem] break-words text-r-text sm:text-base">
                        {entry.person.name}
                      </span>
                      {entry.note ? <span className="mt-0.5 block text-[0.8125rem] text-r-text-2">{entry.note}</span> : null}
                    </span>
                  </AplusPersonLink>
                </li>
              ))}
            </ul>
          ) : (
            <ul
              className={cn(
                "grid gap-2.5",
                zone === "audio"
                  ? "grid-cols-3"
                  : // phones: loading's two people sit centred, same column width as CREDITS
                    "mx-auto w-2/3 grid-cols-2 lg:mx-0 lg:w-auto"
              )}
            >
              {grouped[zone].map((entry) => (
                <li key={entry.id} className="min-w-0">
                  <AplusPersonLink entry={entry} className="block text-center">
                    <span className="flex justify-center">
                      <AplusAvatar entry={entry} />
                    </span>
                    <span className="mt-2 block text-xs leading-snug [overflow-wrap:anywhere] text-r-text">
                      {entry.person.name}
                    </span>
                    <span className="mt-0.5 block text-[0.6875rem] leading-snug text-r-pri">{entry.role}</span>
                  </AplusPersonLink>
                </li>
              ))}
            </ul>
          )}
        </div>
      ))}
    </div>
  );
}
