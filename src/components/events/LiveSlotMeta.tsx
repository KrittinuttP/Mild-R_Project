"use client";

import { cn } from "@/lib/utils";
import {
  LIVE_BADGE_CANCELLED,
  LIVE_BADGE_CHANNEL,
  LIVE_BADGE_COLLAB,
  LIVE_BADGE_MEMBER,
  LIVE_BADGE_MILD,
  LIVE_BADGE_PILL_COMPACT,
  LIVE_BADGE_PILL_MD,
  LIVE_BADGE_PILL_SM,
} from "@/lib/site-ui";

/** Time label: optional strikethrough previous → updated, or LIVE / plain */
export function LiveSlotTime({
  time,
  timePrevious,
  timeUpdated,
  className,
  accentClassName,
}: {
  time: string;
  timePrevious?: string;
  timeUpdated?: string;
  className?: string;
  accentClassName?: string;
}) {
  if (time === "LIVE") {
    return (
      <span className={cn("tabular-nums tracking-wide text-red-300", className)}>
        LIVE
      </span>
    );
  }

  if (timePrevious && (timeUpdated || time)) {
    return (
      <span
        className={cn(
          "inline-flex flex-wrap items-center gap-1 tabular-nums tracking-wide",
          className
        )}
      >
        <span className="text-[#f3b8c4]/45 line-through decoration-[#f3b8c4]/50">
          {timePrevious}
        </span>
        <span className="text-[#f3b8c4]/45" aria-hidden>
          →
        </span>
        <span className={cn(accentClassName)}>{timeUpdated ?? time}</span>
      </span>
    );
  }

  return (
    <span className={cn("tabular-nums tracking-wide", accentClassName, className)}>
      {time}
    </span>
  );
}

export function LiveSourceBadges({
  isOwnChannel,
  sourceTitle,
  isCollab,
  isMember,
  className,
  size = "sm",
  showChannel = true,
  showCollab = true,
  showMember = true,
  /** Smaller calendar pill size (channel name only, same as other compact badges). */
  compactChannel = false,
}: {
  isOwnChannel?: boolean;
  sourceTitle?: string | null;
  isCollab?: boolean;
  isMember?: boolean;
  className?: string;
  size?: "sm" | "md";
  showChannel?: boolean;
  showCollab?: boolean;
  showMember?: boolean;
  compactChannel?: boolean;
}) {
  const pill = compactChannel
    ? LIVE_BADGE_PILL_COMPACT
    : size === "md"
      ? LIVE_BADGE_PILL_MD
      : LIVE_BADGE_PILL_SM;

  const channel =
    showChannel && isOwnChannel ? (
      <span className={cn(pill, LIVE_BADGE_MILD)}>Mild-R</span>
    ) : showChannel && sourceTitle ? (
      <span
        title={sourceTitle}
        className={cn(pill, LIVE_BADGE_CHANNEL, "normal-case")}
      >
        {sourceTitle}
      </span>
    ) : null;

  const memberBadge =
    showMember && isMember ? (
      <span className={cn(pill, LIVE_BADGE_MEMBER)}>Member</span>
    ) : null;

  const collabBadge =
    showCollab && isCollab ? (
      <span className={cn(pill, LIVE_BADGE_COLLAB)}>Collab</span>
    ) : null;

  if (!channel && !memberBadge && !collabBadge) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-1.5", className)}>
      {channel}
      {memberBadge}
      {collabBadge}
    </div>
  );
}

export function LiveCancelledBadge({
  className,
  compact = false,
}: {
  className?: string;
  compact?: boolean;
}) {
  return (
    <span
      className={cn(
        compact ? LIVE_BADGE_PILL_COMPACT : LIVE_BADGE_PILL_SM,
        LIVE_BADGE_CANCELLED,
        className
      )}
    >
      ยกเลิก
    </span>
  );
}

/** Parse HH:mm → minutes from midnight; null if invalid. */
function timeToMinutes(time: string | null | undefined): number | null {
  if (!time) return null;
  const m = /^(\d{1,2}):(\d{2})$/.exec(time.trim());
  if (!m) return null;
  const h = Number(m[1]);
  const min = Number(m[2]);
  if (!Number.isFinite(h) || !Number.isFinite(min)) return null;
  return h * 60 + min;
}

export function slotDisplayTime(slot: {
  time?: string | null;
  timeUpdated?: string | null;
}) {
  return slot.timeUpdated ?? slot.time ?? null;
}

/** True when |Δtime| ≤ windowMinutes (default 15). */
export function isSameTimeWindow(
  a: string | null | undefined,
  b: string | null | undefined,
  windowMinutes = 15
) {
  const am = timeToMinutes(a);
  const bm = timeToMinutes(b);
  if (am == null || bm == null) return false;
  return Math.abs(am - bm) <= windowMinutes;
}

/**
 * When Mild-R has an own-channel live, drop guest slots that start in the
 * same time window (collab VODs on friends' channels).
 */
export function preferOwnChannelSlots<
  T extends {
    isOwnChannel?: boolean;
    time?: string | null;
    timeUpdated?: string | null;
  },
>(slots: T[], windowMinutes = 15): T[] {
  const own = slots.filter((s) => s.isOwnChannel);
  if (own.length === 0) return slots;
  return slots.filter((s) => {
    if (s.isOwnChannel) return true;
    const guestTime = slotDisplayTime(s);
    return !own.some((o) =>
      isSameTimeWindow(guestTime, slotDisplayTime(o), windowMinutes)
    );
  });
}

/** Unique channel badges for a day's slots (own Mild-R + guest source titles). */
export function LiveDayChannelBadges({
  slots,
  className,
  size = "sm",
  /** Calendar: sit beside day number; compact pill size. */
  compact = false,
}: {
  slots: {
    isOwnChannel?: boolean;
    sourceTitle?: string | null;
    /** Bangkok wall clock HH:mm — used to hide guest badges overlapping own lives */
    time?: string | null;
    timeUpdated?: string | null;
  }[];
  className?: string;
  size?: "sm" | "md";
  compact?: boolean;
}) {
  const displaySlots = preferOwnChannelSlots(slots);
  const hasOwn = displaySlots.some((s) => s.isOwnChannel);

  // Day has Mild-R: only show Mild-R badge (hide concurrent guest channel badges)
  const guestTitles = hasOwn
    ? []
    : [
        ...new Set(
          displaySlots
            .filter((s) => !s.isOwnChannel)
            .map((s) => s.sourceTitle?.trim())
            .filter((t): t is string => Boolean(t))
        ),
      ];

  if (!hasOwn && guestTitles.length === 0) return null;

  return (
    <div
      className={cn(
        "flex min-w-0 flex-wrap items-center gap-1",
        compact ? "justify-start" : "justify-center",
        className
      )}
    >
      {hasOwn ? (
        <LiveSourceBadges
          isOwnChannel
          showCollab={false}
          size={size}
          compactChannel={compact}
        />
      ) : null}
      {guestTitles.map((title) => (
        <LiveSourceBadges
          key={title}
          sourceTitle={title}
          showCollab={false}
          size={size}
          compactChannel={compact}
        />
      ))}
    </div>
  );
}
