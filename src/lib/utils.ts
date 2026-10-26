import { clsx, type ClassValue } from "clsx"
import { extendTailwindMerge } from "tailwind-merge"

/** Project R · CI A+ colours from globals.css (`--color-r-*`), so e.g. `border-r-text-2/35` overrides `border-transparent`. */
const R_COLORS = [
  "r-bg",
  "r-pri",
  "r-pri-hover",
  "r-pri-active",
  "r-on-pri",
  "r-acc",
  "r-on-acc",
  "r-nurse",
  "r-text",
  "r-text-2",
  "r-text-3",
  "r-line",
]

const twMerge = extendTailwindMerge({ extend: { theme: { color: R_COLORS } } })

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}
