/**
 * Fonts used by the home hero, header logo, splash and standalone upload bar (Project R).
 * Self-hosted: the font files and @font-face rules live in `src/fonts/site-fonts.css`
 * (imported by the root layout). `@font-face` files only download where the font is used.
 * Each `variable` is a class that sets the CSS variable, like next/font's `.variable`.
 */

/** Name "Mild-R" · close to the logo lettering · OFL · sets --font-name */
export const heroNameFont = { variable: "font-v-name" } as const;

/** Monitor readouts + unit label · sets --font-courier */
export const heroMonoFont = { variable: "font-v-courier" } as const;
