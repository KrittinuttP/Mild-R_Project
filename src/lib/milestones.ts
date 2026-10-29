/**
 * Hero monitor readouts · day count since debut and the next milestone.
 * All dates are Bangkok calendar days (`YYYY-MM-DD`), so the count flips at local midnight.
 */

const DAY_MS = 86_400_000;
/** Day-count milestones: DAY 500, 1000, 1500 … */
const DAY_STEP = 500;

function ymdToDayIndex(ymd: string): number {
  const [y, m, d] = ymd.split("-").map(Number);
  return Date.UTC(y, m - 1, d) / DAY_MS;
}

function dayIndexToYmd(index: number): string {
  return new Date(index * DAY_MS).toISOString().slice(0, 10);
}

export function addDaysYmd(ymd: string, days: number): string {
  return dayIndexToYmd(ymdToDayIndex(ymd) + days);
}

/** Debut day is DAY 1. */
export function daysSinceDebut(debutYmd: string, todayYmd: string): number {
  return ymdToDayIndex(todayYmd) - ymdToDayIndex(debutYmd) + 1;
}

export type MilestoneKind = "birthday" | "anniversary" | "day";

export type Milestone = {
  kind: MilestoneKind;
  /** e.g. "BIRTHDAY", "DAY 1000", "3RD ANNIVERSARY" */
  label: string;
  dateYmd: string;
  /** 0 = today */
  daysLeft: number;
};

function ordinal(n: number): string {
  const tens = n % 100;
  if (tens >= 11 && tens <= 13) return `${n}TH`;
  return `${n}${["TH", "ST", "ND", "RD"][n % 10] ?? "TH"}`;
}

/** Next yearly date (`MM-DD`) on or after today. */
function nextYearly(monthDay: string, todayYmd: string): string {
  const year = Number(todayYmd.slice(0, 4));
  const thisYear = `${year}-${monthDay}`;
  return thisYear >= todayYmd ? thisYear : `${year + 1}-${monthDay}`;
}

/** Same-day ties: birthday › anniversary › day count. */
const KIND_RANK: Record<MilestoneKind, number> = { birthday: 0, anniversary: 1, day: 2 };

/**
 * The closest milestone on or after today — there is always one, so the corner never runs empty.
 * @param birthdayMonthDay `MM-DD`, e.g. "12-12"
 */
export function nextMilestone(debutYmd: string, birthdayMonthDay: string | undefined, todayYmd: string): Milestone {
  const today = ymdToDayIndex(todayYmd);
  const candidates: Milestone[] = [];

  if (birthdayMonthDay) {
    const date = nextYearly(birthdayMonthDay, todayYmd);
    candidates.push({ kind: "birthday", label: "BIRTHDAY", dateYmd: date, daysLeft: ymdToDayIndex(date) - today });
  }

  const anniversary = nextYearly(debutYmd.slice(5), todayYmd);
  const years = Number(anniversary.slice(0, 4)) - Number(debutYmd.slice(0, 4));
  if (years >= 1) {
    candidates.push({
      kind: "anniversary",
      label: `${ordinal(years)} ANNIVERSARY`,
      dateYmd: anniversary,
      daysLeft: ymdToDayIndex(anniversary) - today,
    });
  }

  const day = daysSinceDebut(debutYmd, todayYmd);
  const target = Math.max(DAY_STEP, Math.ceil(day / DAY_STEP) * DAY_STEP);
  const dayDate = addDaysYmd(debutYmd, target - 1);
  candidates.push({ kind: "day", label: `DAY ${target}`, dateYmd: dayDate, daysLeft: ymdToDayIndex(dayDate) - today });

  return candidates.sort((a, b) => a.daysLeft - b.daysLeft || KIND_RANK[a.kind] - KIND_RANK[b.kind])[0];
}
