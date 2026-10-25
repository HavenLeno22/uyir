// A person's vaccine course: when each dose is due, which are taken, and what the national
// guideline says when one is late. The app never moves or skips a dose by itself; the clinic's
// dates (entered by the person) and the doctor's decisions win.
import type { Cite } from '../data/sources';
import { addDays, daysBetween, type ISODate } from './dates';
import { REGIMENS, type RegimenId } from './regimens';

export interface DoseEntry {
  /** The day this dose was given. */
  takenOn?: ISODate;
  /** A date the clinic gave for this dose, replacing the standard one. */
  dueOn?: ISODate;
  /** Left out on the doctor's advice (for example day 14 after a 10-day animal watch). */
  skipped?: boolean;
}

export interface Course {
  regimen: RegimenId;
  /** Day 0: the date of the first dose (planned, until it is taken). */
  firstDose: ISODate;
  doses: DoseEntry[];
}

export type DoseState = 'taken' | 'skipped' | 'today' | 'upcoming' | 'late';

export interface DoseView {
  index: number;
  /** Schedule day (0, 3, 7, …). */
  day: number;
  /** Last schedule day of the window, when the guideline gives one (PrEP booster: 28). */
  dayLatest?: number;
  dueOn: ISODate;
  /** Set when the guideline allows a range: the last date of it. */
  dueBy?: ISODate;
  takenOn?: ISODate;
  state: DoseState;
  /** Days past the due date (or past the end of its window), when late. */
  daysLate?: number;
  /** True when the date came from the clinic, not the standard schedule. */
  clinicDate: boolean;
}

export type PlanAlert =
  /** First three doses not all given yet: the date by which they should be (section 8). */
  | { kind: 'firstThreeBy'; by: ISODate; cite: Cite }
  /** One of the first three doses is one or two days late: no restart, go today. */
  | { kind: 'lateMinor'; dose: number; days: number; cite: Cite }
  /** One of the first three doses missed (3+ days late, or past the 10-day mark): see the doctor today. */
  | { kind: 'lateMajor'; dose: number; days: number; cite: Cite }
  /** A later dose is late: go as soon as possible and tell the doctor. */
  | { kind: 'lateLater'; dose: number; days: number }
  /** Category III without immunoglobulin yet: it can be given until this date (section 2.9). */
  | { kind: 'rigWindow'; by: ISODate; daysLeft: number; cite: Cite }
  | { kind: 'complete'; on: ISODate };

export interface PlanView {
  day0: ISODate;
  doses: DoseView[];
  /** The first dose not yet taken or skipped. */
  next: DoseView | null;
  alerts: PlanAlert[];
  complete: boolean;
  taken: number;
  /** Doses that count toward finishing: all except those skipped on advice. */
  required: number;
}

const SECTION_8: Cite = { source: 'nrcp2019', section: '8', page: 22 };
const SECTION_2_9: Cite = { source: 'nrcp2019', section: '2.9', page: 9 };

export function newCourse(regimen: RegimenId, firstDose: ISODate): Course {
  return { regimen, firstDose, doses: REGIMENS[regimen].days.map(() => ({})) };
}

/** Day 0 is the date the first dose was actually given, once it has been. */
export function dayZero(course: Course): ISODate {
  return course.doses[0]?.takenOn ?? course.firstDose;
}

export interface ViewOptions {
  /** Immunoglobulin was recommended (Category III, or Category II with weak immunity). */
  rigNeeded?: boolean;
  rigGiven?: boolean;
}

export function viewCourse(course: Course, today: ISODate, opts: ViewOptions = {}): PlanView {
  const reg = REGIMENS[course.regimen];
  const day0 = dayZero(course);
  const doses: DoseView[] = reg.days.map((day, index) => {
    const entry = course.doses[index] ?? {};
    const dueOn = entry.dueOn ?? addDays(day0, day);
    const dayLatest = entry.dueOn ? undefined : reg.latest?.[index];
    const dueBy = dayLatest !== undefined ? addDays(day0, dayLatest) : undefined;
    const lastOk = dueBy ?? dueOn;
    let state: DoseState;
    let daysLate: number | undefined;
    if (entry.takenOn) state = 'taken';
    else if (entry.skipped) state = 'skipped';
    else if (today > lastOk) {
      state = 'late';
      daysLate = daysBetween(lastOk, today);
    } else if (today >= dueOn) state = 'today';
    else state = 'upcoming';
    return { index, day, dayLatest, dueOn, dueBy, takenOn: entry.takenOn, state, daysLate, clinicDate: !!entry.dueOn };
  });

  const next = doses.find((d) => d.state !== 'taken' && d.state !== 'skipped') ?? null;
  const required = doses.filter((d) => d.state !== 'skipped').length;
  const taken = doses.filter((d) => d.state === 'taken').length;
  const complete = next === null;
  const alerts: PlanAlert[] = [];

  if (complete) {
    const last = doses.filter((d) => d.takenOn).map((d) => d.takenOn as ISODate).sort().pop();
    if (last) alerts.push({ kind: 'complete', on: last });
  } else {
    const firstThreePending = reg.firstThreeWithin !== undefined && doses.slice(0, 3).some((d) => d.state !== 'taken');
    const deadline = reg.firstThreeWithin !== undefined ? addDays(day0, reg.firstThreeWithin) : null;
    for (const d of doses) {
      if (d.state !== 'late' || d.daysLate === undefined) continue;
      if (reg.firstThreeWithin !== undefined && d.index < 3) {
        const pastDeadline = deadline !== null && today > deadline;
        alerts.push(
          d.daysLate <= 2 && !pastDeadline
            ? { kind: 'lateMinor', dose: d.index, days: d.daysLate, cite: SECTION_8 }
            : { kind: 'lateMajor', dose: d.index, days: d.daysLate, cite: SECTION_8 },
        );
      } else alerts.push({ kind: 'lateLater', dose: d.index, days: d.daysLate });
    }
    if (firstThreePending && deadline && today <= deadline) alerts.push({ kind: 'firstThreeBy', by: deadline, cite: SECTION_8 });
  }

  if (opts.rigNeeded && !opts.rigGiven) {
    // "Not indicated beyond the seventh day after the first dose of rabies vaccine."
    const by = addDays(day0, 7);
    if (today <= by) alerts.push({ kind: 'rigWindow', by, daysLeft: daysBetween(today, by), cite: SECTION_2_9 });
  }

  return { day0, doses, next, alerts, complete, taken, required };
}

// ---- Changes. Each returns a new course; nothing is mutated. ----

function withDose(course: Course, index: number, patch: (d: DoseEntry) => DoseEntry): Course {
  const doses = course.doses.map((d, i) => (i === index ? patch({ ...d }) : d));
  return { ...course, doses };
}

/** Record a dose as given. The first dose sets day 0, so the standard dates follow it. */
export function markTaken(course: Course, index: number, on: ISODate): Course {
  const next = withDose(course, index, (d) => ({ ...d, takenOn: on, skipped: undefined }));
  return index === 0 ? { ...next, firstDose: on } : next;
}

export function unmarkTaken(course: Course, index: number): Course {
  return withDose(course, index, (d) => ({ ...d, takenOn: undefined }));
}

/** Use the clinic's date for a dose; `undefined` goes back to the standard schedule. */
export function setClinicDate(course: Course, index: number, on: ISODate | undefined): Course {
  if (index === 0) return on ? { ...course, firstDose: on } : course;
  return withDose(course, index, (d) => ({ ...d, dueOn: on }));
}

/** Only when the doctor said so; the app never suggests it on its own. */
export function setSkipped(course: Course, index: number, skipped: boolean): Course {
  return withDose(course, index, (d) => ({ ...d, skipped: skipped || undefined, takenOn: skipped ? undefined : d.takenOn }));
}
