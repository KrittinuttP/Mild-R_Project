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

/** Shared live-tag pill sizes — Mild-R / Collab / Member / channel / stats */
export const LIVE_BADGE_PILL_SM =
  "inline-flex h-5 shrink-0 items-center justify-center rounded-full border px-2.5 text-xs leading-none tracking-[0.08em]";

export const LIVE_BADGE_PILL_MD =
  "inline-flex h-6 shrink-0 items-center justify-center gap-1 rounded-full border px-3 text-xs leading-none tracking-[0.08em] sm:text-sm";

export const LIVE_BADGE_PILL_COMPACT =
  "inline-flex h-[1.125rem] max-w-[5.5rem] shrink-0 items-center justify-center truncate rounded-full border px-2 text-[0.68rem] leading-none tracking-normal";

export const LIVE_BADGE_MILD =
  "border-[#f3b8c4]/40 bg-[#e85a7a]/12 text-[#f3b8c4] uppercase";

export const LIVE_BADGE_CHANNEL =
  "border-[#7eb6d4]/50 bg-[#7eb6d4]/14 text-[#b8d9ec]";

export const LIVE_BADGE_MEMBER =
  "border-[#9b8cff]/55 bg-[#9b8cff]/14 text-[#cfc6ff] uppercase";

export const LIVE_BADGE_COLLAB =
  "border-[#d4a574]/55 bg-[#d4a574]/14 text-[#e8c49a] uppercase";

export const LIVE_BADGE_SOFT =
  "border-[#f3b8c4]/20 bg-white/[0.03] text-[#f3b8c4]/80";

export const LIVE_BADGE_CANCELLED =
  "border-[#8a7f88]/45 bg-white/[0.03] text-[#d8d0d4]";

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

/** Small uppercase label above a section title — mint */
export const R_EYEBROW_CLASS = "text-xs uppercase tracking-[0.24em] text-r-acc";

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
  "bg-r-pri text-r-on-pri hover:bg-r-pri-hover hover:shadow-[0_8px_24px_rgba(242,67,125,0.35)] active:bg-r-pri-active",
  "disabled:pointer-events-none disabled:bg-white/8 disabled:text-r-text/40 disabled:shadow-none",
  R_FOCUS,
].join(" ");

/** Outline button */
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
