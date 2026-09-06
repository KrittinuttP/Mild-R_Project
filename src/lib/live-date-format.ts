import { parseISODate } from "@/lib/events";

export function englishWeekday(date: Date): string {
  return date.toLocaleDateString("en-US", { weekday: "short" });
}

export function englishMonth(month: number): string {
  return new Date(2026, month, 1, 12).toLocaleDateString("en-US", { month: "long" });
}

export function formatLiveShortDate(iso: string): string {
  const date = parseISODate(iso);
  const month = date.toLocaleDateString("en-US", { month: "short" });
  return `${String(date.getDate()).padStart(2, "0")} ${month}`;
}

export function formatLiveDate(iso: string): string {
  const date = parseISODate(iso);
  return `${englishWeekday(date)}, ${formatLiveShortDate(iso)} ${date.getFullYear()}`;
}

export function formatLiveDateRange(from: string, to: string): string {
  const start = parseISODate(from);
  const end = parseISODate(to);
  if (start.getFullYear() !== end.getFullYear()) {
    return `${formatLiveShortDate(from)} ${start.getFullYear()}–${formatLiveShortDate(to)} ${end.getFullYear()}`;
  }
  const first = start.getMonth() === end.getMonth()
    ? String(start.getDate()).padStart(2, "0")
    : formatLiveShortDate(from);
  return `${first}–${formatLiveShortDate(to)} ${end.getFullYear()}`;
}
