import { Courier_Prime, Sansita_Swashed } from "next/font/google";

/**
 * Fonts used only by the home hero (Project R) — loaded here, not in the root layout,
 * so other pages don't preload them. Applied as CSS variables on the hero <section>.
 */

/** Name "Mild-R" · close to the logo lettering · OFL */
export const heroNameFont = Sansita_Swashed({
  variable: "--font-name",
  subsets: ["latin"],
  weight: ["700", "800"],
  display: "swap",
});

/** Monitor readouts + unit label */
export const heroMonoFont = Courier_Prime({
  variable: "--font-courier",
  subsets: ["latin"],
  weight: ["400", "700"],
  display: "swap",
});
