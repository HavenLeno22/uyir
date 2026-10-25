// Calendar dates as 'YYYY-MM-DD' strings. Dose schedules count whole days ("day 0, 3, 7"),
// so all arithmetic is on day numbers, never on clock times, and time zones cannot shift a
// dose by a day.

export type ISODate = string;

const MS_PER_DAY = 86_400_000;
const ISO = /^(\d{4})-(\d{2})-(\d{2})$/;

export function isISODate(s: unknown): s is ISODate {
  if (typeof s !== 'string') return false;
  const m = ISO.exec(s);
  if (!m) return false;
  const d = new Date(Date.UTC(+m[1], +m[2] - 1, +m[3]));
  return d.getUTCFullYear() === +m[1] && d.getUTCMonth() === +m[2] - 1 && d.getUTCDate() === +m[3];
}

/** Days since 1970-01-01 for a calendar date. */
export function dayNumber(d: ISODate): number {
  const m = ISO.exec(d);
  if (!m) throw new Error(`not a date: ${d}`);
  return Date.UTC(+m[1], +m[2] - 1, +m[3]) / MS_PER_DAY;
}

export function fromDayNumber(n: number): ISODate {
  return new Date(n * MS_PER_DAY).toISOString().slice(0, 10);
}

export function addDays(d: ISODate, days: number): ISODate {
  return fromDayNumber(dayNumber(d) + days);
}

/** Whole days from `a` to `b` (positive when b is later). */
export function daysBetween(a: ISODate, b: ISODate): number {
  return dayNumber(b) - dayNumber(a);
}

/** Today's date where the phone is, not in UTC. */
export function today(now: Date = new Date()): ISODate {
  const y = now.getFullYear();
  const m = String(now.getMonth() + 1).padStart(2, '0');
  const d = String(now.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

export function minDate(a: ISODate, b: ISODate): ISODate {
  return a <= b ? a : b;
}
