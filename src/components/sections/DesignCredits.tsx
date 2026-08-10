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
    },
    {
      id: "rigger",
      role: design.riggerLabel ?? "Rigger",
      person: design.rigger,
      zone: "art",
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
  sm: "text-[0.55rem] sm:text-[0.6rem]",
  md: "text-[0.65rem] sm:text-xs",
  lg: "text-xs sm:text-sm",
};

const NAME_TEXT: Record<AvatarSize, string> = {
  sm: "text-[0.65rem] sm:text-xs",
  md: "text-xs sm:text-sm",
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
  variant?: "list" | "strip";
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
                  "tracking-[0.2em] text-[#e85a7a] uppercase",
                  compact ? "text-[0.58rem]" : "text-[0.7rem] sm:text-xs"
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
