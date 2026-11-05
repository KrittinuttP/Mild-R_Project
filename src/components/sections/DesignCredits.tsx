import type { ReactNode } from "react";
import Link from "next/link";

import { ProtectedImage } from "@/components/media/ProtectedImage";
import { cn } from "@/lib/utils";
import type { CharacterDesign, CreditPerson } from "@/types/vtuber";
import { R_LABEL_CLASS } from "@/lib/site-ui";

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

type DesignCreditsProps = {
  design: CharacterDesign;
  zones?: CreditZone[];
  className?: string;
};

/** Project R home card (CI A+) — ART | CREDITS | LOADING columns. */
export function DesignCredits({
  design,
  zones = ["art", "audio", "loading"],
  className,
}: DesignCreditsProps) {
  const grouped = getCreditZones(design);
  const activeZones = zones.filter((z) => grouped[z].length > 0);

  if (activeZones.length === 0) return null;

  return <AplusCredits grouped={grouped} zones={activeZones} className={className} />;
}

/* ── CI A+ · Project R home (About · ทีมผู้สร้าง) ─────────────────── */

const APLUS_ZONE_LABEL = R_LABEL_CLASS; // Art / Credits / Loading (4 Nov: no uppercase tracked pink)

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
                      <span className={cn("block", R_LABEL_CLASS)}>{entry.role}</span>
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
