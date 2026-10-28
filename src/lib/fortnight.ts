// Fortnight / payslip date math.
// Uses calendar-day arithmetic (never raw 24h millisecond blocks) so daylight
// saving changes can't shift dates by an hour and break day counts.

const MS_PER_DAY = 86400000;

/** Local-midnight Date for an ISO date string (YYYY-MM-DD). */
export function parseLocalDate(iso: string): Date {
  const [y, m, d] = iso.slice(0, 10).split("-").map(Number);
  return new Date(y, m - 1, d);
}

export function addDays(d: Date, n: number): Date {
  return new Date(d.getFullYear(), d.getMonth(), d.getDate() + n);
}

/** Whole calendar days from a to b (DST-safe). */
export function dayDiff(a: Date, b: Date): number {
  return Math.round(
    (Date.UTC(b.getFullYear(), b.getMonth(), b.getDate()) -
      Date.UTC(a.getFullYear(), a.getMonth(), a.getDate())) / MS_PER_DAY
  );
}

export function startOfToday(now: Date = new Date()): Date {
  return new Date(now.getFullYear(), now.getMonth(), now.getDate());
}

/** Fortnight `index`: pay period [payslip-14d, payslip-1d]; pay lands the day after payslip. */
export function fortnightBounds(index: number, anchor: Date) {
  const payslipDate = addDays(anchor, index * 14);
  return {
    payslipDate,
    start: addDays(payslipDate, -14),
    end: addDays(payslipDate, -1),
    payDate: addDays(payslipDate, 1),
  };
}

/** Fortnight a shift date belongs to (a shift on payslip day starts the next period). */
export function fortnightIndexForShift(date: Date, anchor: Date): number {
  return Math.floor(dayDiff(anchor, date) / 14) + 1;
}

/** "Current" fortnight = next payslip that is today or later, so payslip day still shows the closing period. */
export function currentFortnightIndex(today: Date, anchor: Date): number {
  return Math.ceil(dayDiff(anchor, today) / 14);
}
