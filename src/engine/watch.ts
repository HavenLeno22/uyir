// The 10-day watch on a biting dog or cat (NRCP 2019, section 2.2 and FAQ 9). The vaccine starts
// at once regardless; the watch only tells the doctor something. If the animal stays healthy for
// 10 days the doctor may change an intramuscular course (skip day 14, keep day 28); with the
// intradermal course every dose is still given. The app shows this to the person for their
// doctor and never changes the plan itself.
import type { Cite } from '../data/sources';
import { addDays, daysBetween, type ISODate } from './dates';

export type AnimalStatus = 'well' | 'sick' | 'dead' | 'missing';

export interface Watch {
  animal: 'dog' | 'cat';
  /** The day of the bite. */
  from: ISODate;
  /** What the person saw, by date. */
  checks: Record<ISODate, AnimalStatus>;
}

export const WATCH_DAYS = 10;
export const WATCH_CITE: Cite = { source: 'nrcp2019', section: '2.2', page: 3 };

export interface WatchView {
  /** Days since the bite; day 10 is the last day of the watch. */
  day: number;
  endsOn: ISODate;
  /** No check recorded today and the watch is still running. */
  checkDue: boolean;
  /**
   * watching: under way · alert: the animal fell sick, died or went missing, tell the doctor today ·
   * wellAfter10: seen well on or after day 10 with nothing worrying before · unknown: the watch is
   * over without a check on day 10 or later.
   */
  outcome: 'watching' | 'alert' | 'wellAfter10' | 'unknown';
  /** The first worrying report, for the alert. */
  alertOn?: ISODate;
  alertStatus?: Exclude<AnimalStatus, 'well'>;
}

export function viewWatch(w: Watch, today: ISODate): WatchView {
  const day = daysBetween(w.from, today);
  const endsOn = addDays(w.from, WATCH_DAYS);
  const dates = Object.keys(w.checks).sort();
  const bad = dates.find((d) => w.checks[d] !== 'well');
  if (bad) return { day, endsOn, checkDue: false, outcome: 'alert', alertOn: bad, alertStatus: w.checks[bad] as Exclude<AnimalStatus, 'well'> };
  if (dates.some((d) => d >= endsOn && w.checks[d] === 'well')) return { day, endsOn, checkDue: false, outcome: 'wellAfter10' };
  if (day > WATCH_DAYS) return { day, endsOn, checkDue: false, outcome: 'unknown' };
  return { day, endsOn, checkDue: day >= 0 && !(today in w.checks), outcome: 'watching' };
}

export function recordCheck(w: Watch, on: ISODate, status: AnimalStatus): Watch {
  return { ...w, checks: { ...w.checks, [on]: status } };
}
