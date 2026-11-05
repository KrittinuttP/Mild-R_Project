/** Shared typography / badge tokens — align home + projects surfaces */

export const META_CLASS =
  "text-xs tracking-[0.12em] text-[#f3b8c4]/75 uppercase sm:text-sm";

export const META_MUTED_CLASS =
  "text-xs tracking-[0.12em] text-[#f3b8c4]/65 uppercase sm:text-sm";

export const DISPLAY_H1_CLASS =
  "font-[family-name:var(--font-display)] text-3xl font-normal leading-tight tracking-normal text-[#fff5f7] sm:text-4xl md:text-5xl";

export const DISPLAY_H2_CLASS =
  "font-[family-name:var(--font-display)] text-2xl font-normal leading-tight tracking-normal text-[#fff5f7] sm:text-3xl md:text-4xl";

export const DISPLAY_H3_CLASS =
  "font-[family-name:var(--font-display)] text-lg font-normal leading-snug tracking-normal text-[#fff5f7] sm:text-xl";

export const BODY_CLASS = "text-base leading-relaxed text-[#f7d7de]/85";

export const LEAD_CLASS =
  "text-base leading-relaxed text-[#f7d7de]/85 sm:text-lg";

export const BADGE_CLASS =
  "rounded-full border px-3 py-1 text-xs tracking-wide sm:text-sm";

export const BADGE_ACCENT_CLASS =
  "rounded-full border border-[#e85a7a]/35 bg-[#e85a7a]/15 px-3 py-1 text-xs tracking-wide text-[#f3b8c4] sm:text-sm";

export const BADGE_SOFT_CLASS =
  "rounded-full border border-[#f3b8c4]/20 bg-white/[0.03] px-3 py-1 text-xs tracking-wide text-[#f3b8c4]/80 sm:text-sm";

/**
 * RBadge (5 Nov · UI round 2 P1): one status / tag badge for the whole site.
 * Two sizes — S (20px · 11px) in cards and rows, M (24px · 12px) for card headers / hero.
 * 1px inset ring for every tinted tone · English tags uppercase + .06em · Thai never tracked.
 */
export const R_BADGE_S =
  "inline-flex h-5 shrink-0 items-center justify-center gap-1 rounded-full px-2 text-[11px] leading-none whitespace-nowrap";
export const R_BADGE_M =
  "inline-flex h-6 shrink-0 items-center justify-center gap-1.5 rounded-full px-2.5 text-xs leading-none whitespace-nowrap";

export const R_BADGE_TONE = {
  /** Happening now — LIVE · กำลังไลฟ์ · กำลังจัด (solid pink + dot) */
  now: "bg-r-pri font-semibold text-r-on-pri",
  /** Coming up — เร็วๆ นี้ (solid mint) */
  soon: "bg-r-acc font-semibold text-r-on-acc",
  /** Over — จบแล้ว · ไลฟ์จบแล้ว */
  done: "bg-white/[0.05] text-r-text-2/85 ring-1 ring-white/12 ring-inset",
  /** Live kinds (tint): Solo / own channel pink · Collab sky · Member purple · other channel = collab sky */
  solo: "bg-r-pri/14 text-r-text-2 uppercase tracking-[0.06em] ring-1 ring-r-pri/45 ring-inset",
  collab: "bg-r-collab/13 text-r-collab-text uppercase tracking-[0.06em] ring-1 ring-r-collab/48 ring-inset",
  member: "bg-[#9b8cff]/14 text-[#cfc6ff] uppercase tracking-[0.06em] ring-1 ring-[#9b8cff]/50 ring-inset",
  channel: "bg-r-collab/13 text-r-collab-text ring-1 ring-r-collab/48 ring-inset",
  /** No live today — mint tint */
  offline: "bg-r-acc/12 text-r-acc uppercase tracking-[0.06em] ring-1 ring-r-acc/45 ring-inset",
  cancelled: "bg-white/[0.03] text-[#d8d0d4] ring-1 ring-[#8a7f88]/45 ring-inset",
  /** Extra info — countdown · เวลาไทย */
  meta: "bg-white/[0.04] text-r-text-2 ring-1 ring-r-text-2/18 ring-inset",
} as const;
export type RBadgeTone = keyof typeof R_BADGE_TONE;

/** Live-tag aliases (older names) — now the RBadge sizes / tones. */
export const LIVE_BADGE_PILL_SM = R_BADGE_S;
export const LIVE_BADGE_PILL_MD = R_BADGE_M;
/** Calendar / table cells: size S, long channel names truncate. */
export const LIVE_BADGE_PILL_COMPACT = `${R_BADGE_S} max-w-[5.5rem] truncate`;
export const LIVE_BADGE_MILD = R_BADGE_TONE.solo;
export const LIVE_BADGE_CHANNEL = R_BADGE_TONE.channel;
export const LIVE_BADGE_MEMBER = R_BADGE_TONE.member;
export const LIVE_BADGE_COLLAB = R_BADGE_TONE.collab;
export const LIVE_BADGE_SOFT = R_BADGE_TONE.meta;
export const LIVE_BADGE_CANCELLED = R_BADGE_TONE.cancelled;

export const GLASS_CARD_CLASS =
  "rounded-3xl border border-[#f3b8c4]/12 bg-[#1a0c12]/60";

export const CTA_PRIMARY_CLASS =
  "rounded-2xl border-transparent bg-[#e85a7a] text-[#140a0d] shadow-[0_10px_30px_rgba(232,90,122,0.35)] hover:bg-[#f3b8c4]";

export const CTA_OUTLINE_CLASS =
  "rounded-2xl border-[#f3b8c4]/30 bg-transparent text-[#fff5f7] hover:border-[#e85a7a]/50 hover:bg-[#e85a7a]/15 hover:text-[#fff5f7]";

/** Cover modals: frosted close control */
export const MODAL_CLOSE_BUTTON_CLASS =
  "top-3 right-3 z-30 size-10 rounded-full border border-[#140a0d]/50 bg-white/15 text-[#140a0d] shadow-[0_8px_24px_rgba(0,0,0,0.3)] backdrop-blur-md hover:border-[#140a0d]/70 hover:bg-white/25 hover:text-[#1a0c12] [&_svg]:size-5";

/* ── Project R · CI A+ (doc/project-r-implementation.md §1) ─────────
   New home sections use these; the classes above stay for pages not yet moved. */

/**
 * Heading of a card inside a section (4 Nov, UI round 2): plain white, bold, a hint of tracking.
 * Replaces the tiny pink tracked labels. Lore keeps its bilingual wording ("PROFILE · ข้อมูล").
 */
export const R_CARD_TITLE_CLASS = "text-[0.9375rem] font-semibold tracking-[0.03em] text-r-text";
/** Group label inside a card (Art / Credits / Mama …): small soft pink, no tracking, no uppercase. */
export const R_LABEL_CLASS = "text-[0.8125rem] font-medium text-r-text-2";

/** Small uppercase label above a section title — mint (decisions 3 Nov: คงมิ้นต์ทั้งเว็บ) */
export const R_EYEBROW_CLASS = "text-xs uppercase tracking-[0.24em] text-r-acc";

/** Page title (same as /live) */
export const R_H1_CLASS =
  "font-[family-name:var(--font-display)] text-[2.25rem] leading-tight font-normal tracking-normal text-r-text sm:text-5xl";

export const R_H2_CLASS =
  "font-[family-name:var(--font-display)] text-3xl font-normal leading-tight tracking-normal text-r-text md:text-4xl";

export const R_H3_CLASS =
  "font-[family-name:var(--font-display)] text-lg font-normal leading-snug tracking-normal text-r-text sm:text-xl";

export const R_BODY_CLASS = "text-[0.9375rem] leading-relaxed text-r-text-2";

/** Dates, captions, helper text */
export const R_META_CLASS = "text-xs text-r-text-3 sm:text-sm";

/** Card with the diagonal pink/mint wash (globals.css `.r-card`) */
export const R_CARD_CLASS = "r-card rounded-3xl";

const R_FOCUS =
  "focus-visible:outline-2 focus-visible:outline-offset-3 focus-visible:outline-solid focus-visible:outline-r-acc";

/** Primary button · normal / hover / active / focus / disabled */
export const R_CTA_PRIMARY_CLASS = [
  "inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[0.9375rem] font-medium transition-[background-color,box-shadow]",
  "bg-r-pri text-r-on-pri hover:bg-r-pri-hover hover:shadow-[0_8px_24px_color-mix(in_srgb,var(--r-pri)_35%,transparent)] active:bg-r-pri-active",
  "disabled:pointer-events-none disabled:bg-white/8 disabled:text-r-text/40 disabled:shadow-none",
  R_FOCUS,
].join(" ");

/** Outline button */
/**
 * Selected state of a pill / tab / segment (filters, view toggles, admin tabs) —
 * decided 4 Nov (option C): soft pink fill + pink ring + pink text, not white.
 * Not for the upload forms, where solid pink = the chosen option.
 */
export const R_PILL_ACTIVE_TEXT_CLASS = "font-semibold text-[#ff6b9a]";
/** Fill + ring only — for a sliding thumb behind segmented buttons. */
export const R_PILL_ACTIVE_FILL_CLASS = "bg-r-pri/16 ring-[1.5px] ring-r-pri/75 ring-inset";
export const R_PILL_ACTIVE_CLASS = `${R_PILL_ACTIVE_FILL_CLASS} ${R_PILL_ACTIVE_TEXT_CLASS}`;

export const R_CTA_OUTLINE_CLASS = [
  "inline-flex h-12 items-center justify-center gap-2 rounded-full px-6 text-[0.9375rem] transition-colors",
  "border border-r-text-2/35 text-r-text hover:border-r-pri/60 hover:bg-r-pri/10 active:bg-r-pri/20",
  "disabled:pointer-events-none disabled:opacity-40",
  R_FOCUS,
].join(" ");

/** Solid chips / tags — never gradient */
export const R_CHIP_PRI_CLASS =
  "inline-flex h-6 items-center rounded-full bg-r-pri px-2.5 text-xs font-medium text-r-on-pri";

export const R_CHIP_ACC_CLASS =
  "inline-flex h-6 items-center rounded-full bg-r-acc px-2.5 text-xs font-medium text-r-on-acc";

export const R_CHIP_SOFT_CLASS =
  "inline-flex h-6 items-center rounded-full bg-white/[0.04] px-2.5 text-xs text-r-text-2 ring-1 ring-r-line ring-inset";
