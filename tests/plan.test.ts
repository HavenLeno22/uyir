import { describe, expect, it } from 'vitest';
import { addDays, daysBetween, isISODate, today } from '../src/engine/dates';
import { markTaken, newCourse, setClinicDate, setSkipped, viewCourse, type PlanAlert } from '../src/engine/plan';

const kinds = (alerts: PlanAlert[]) => alerts.map((a) => a.kind);

describe('dates', () => {
  it('counts whole calendar days across months, leap days and years', () => {
    expect(addDays('2026-10-25', 7)).toBe('2026-11-01');
    expect(addDays('2028-02-28', 1)).toBe('2028-02-29');
    expect(addDays('2026-12-30', 3)).toBe('2027-01-02');
    expect(daysBetween('2026-10-25', '2026-11-22')).toBe(28);
  });
  it('validates dates strictly', () => {
    expect(isISODate('2026-02-29')).toBe(false);
    expect(isISODate('2028-02-29')).toBe(true);
    expect(isISODate('2026-1-5')).toBe(false);
  });
  it('uses the local calendar date, not UTC', () => {
    // 1 a.m. on 26 October in India is still 25 October in UTC.
    const d = new Date(2026, 9, 26, 1, 0, 0);
    expect(today(d)).toBe('2026-10-26');
  });
});

describe('standard schedules (NRCP 2019, section 10)', () => {
  it('intradermal PEP: days 0, 3, 7 and 28', () => {
    const v = viewCourse(newCourse('pep-id', '2026-10-25'), '2026-10-25');
    expect(v.doses.map((d) => d.dueOn)).toEqual(['2026-10-25', '2026-10-28', '2026-11-01', '2026-11-22']);
    expect(v.doses[0].state).toBe('today');
    expect(v.next?.index).toBe(0);
  });
  it('intramuscular PEP: days 0, 3, 7, 14 and 28', () => {
    const v = viewCourse(newCourse('pep-im', '2026-10-25'), '2026-10-25');
    expect(v.doses.map((d) => d.day)).toEqual([0, 3, 7, 14, 28]);
    expect(v.doses[4].dueOn).toBe('2026-11-22');
  });
  it('re-exposure: days 0 and 3', () => {
    expect(viewCourse(newCourse('reexposure', '2026-10-25'), '2026-10-25').doses.map((d) => d.dueOn)).toEqual([
      '2026-10-25',
      '2026-10-28',
    ]);
  });
  it('pre-exposure booster is due on day 21 and on time until day 28', () => {
    let c = newCourse('prep', '2026-10-01');
    c = markTaken(c, 0, '2026-10-01');
    c = markTaken(c, 1, '2026-10-08');
    const onDay25 = viewCourse(c, '2026-10-26');
    expect(onDay25.doses[2].dueOn).toBe('2026-10-22');
    expect(onDay25.doses[2].dueBy).toBe('2026-10-29');
    expect(onDay25.doses[2].state).toBe('today');
    expect(viewCourse(c, '2026-10-30').doses[2]).toMatchObject({ state: 'late', daysLate: 1 });
  });
});

describe('day 0 is the date of the first dose', () => {
  it('moves the whole plan when the first dose is given on another day', () => {
    let c = newCourse('pep-id', '2026-10-25');
    c = markTaken(c, 0, '2026-10-26');
    const v = viewCourse(c, '2026-10-26');
    expect(v.day0).toBe('2026-10-26');
    expect(v.doses[1].dueOn).toBe('2026-10-29');
    expect(v.doses[3].dueOn).toBe('2026-11-23');
  });
  it('keeps clinic dates for later doses, and goes back to the standard date when cleared', () => {
    let c = markTaken(newCourse('pep-id', '2026-10-25'), 0, '2026-10-25');
    c = setClinicDate(c, 1, '2026-10-29');
    expect(viewCourse(c, '2026-10-25').doses[1]).toMatchObject({ dueOn: '2026-10-29', clinicDate: true });
    c = setClinicDate(c, 1, undefined);
    expect(viewCourse(c, '2026-10-25').doses[1]).toMatchObject({ dueOn: '2026-10-28', clinicDate: false });
  });
});

describe('late doses (NRCP 2019, section 8)', () => {
  const started = markTaken(newCourse('pep-id', '2026-10-01'), 0, '2026-10-01');

  it('shows the 10-day deadline for the first three doses while they are pending', () => {
    const v = viewCourse(started, '2026-10-02');
    expect(v.alerts).toContainEqual(expect.objectContaining({ kind: 'firstThreeBy', by: '2026-10-11' }));
  });
  it('one or two days late on dose 2 is minor: no restart, go today', () => {
    const v = viewCourse(started, '2026-10-06'); // due 4 Oct
    expect(v.doses[1]).toMatchObject({ state: 'late', daysLate: 2 });
    expect(kinds(v.alerts)).toContain('lateMinor');
    expect(kinds(v.alerts)).not.toContain('lateMajor');
  });
  it('three or more days late on one of the first three doses means see the doctor', () => {
    const v = viewCourse(started, '2026-10-07');
    expect(v.alerts).toContainEqual(expect.objectContaining({ kind: 'lateMajor', dose: 1, days: 3 }));
  });
  it('anything pending past day 10 is major, and the deadline is no longer shown', () => {
    let c = markTaken(started, 1, '2026-10-04');
    const v = viewCourse(c, '2026-10-12'); // dose 3 due 8 Oct, 4 days late, past day 10
    expect(kinds(v.alerts)).toEqual(['lateMajor']);
    c = markTaken(c, 2, '2026-10-09');
    expect(kinds(viewCourse(c, '2026-10-12').alerts)).toEqual([]);
  });
  it('a late day-28 dose is a later-dose alert, not a first-three one', () => {
    let c = markTaken(started, 1, '2026-10-04');
    c = markTaken(c, 2, '2026-10-08');
    const v = viewCourse(c, '2026-11-01'); // due 29 Oct
    expect(v.alerts).toEqual([{ kind: 'lateLater', dose: 3, days: 3 }]);
  });
  it('is complete when every dose is taken, dated by the last one', () => {
    let c = started;
    for (const [i, d] of [[1, '2026-10-04'], [2, '2026-10-08'], [3, '2026-10-29']] as const) c = markTaken(c, i, d);
    const v = viewCourse(c, '2026-11-05');
    expect(v.complete).toBe(true);
    expect(v.alerts).toEqual([{ kind: 'complete', on: '2026-10-29' }]);
  });
  it('a dose skipped on the doctor\'s advice does not block completion', () => {
    let c = markTaken(newCourse('pep-im', '2026-10-01'), 0, '2026-10-01');
    for (const [i, d] of [[1, '2026-10-04'], [2, '2026-10-08']] as const) c = markTaken(c, i, d);
    c = setSkipped(c, 3, true);
    c = markTaken(c, 4, '2026-10-29');
    const v = viewCourse(c, '2026-10-29');
    expect(v.complete).toBe(true);
    expect(v.required).toBe(4);
  });
});

describe('immunoglobulin window (NRCP 2019, section 2.9)', () => {
  const c = markTaken(newCourse('pep-id', '2026-10-01'), 0, '2026-10-01');
  it('counts down to day 7 after the first dose when it is needed and not yet given', () => {
    expect(viewCourse(c, '2026-10-05', { rigNeeded: true }).alerts).toContainEqual(
      expect.objectContaining({ kind: 'rigWindow', by: '2026-10-08', daysLeft: 3 }),
    );
  });
  it('says nothing after day 7, when it is no longer given, or once it is given', () => {
    expect(kinds(viewCourse(c, '2026-10-09', { rigNeeded: true }).alerts)).not.toContain('rigWindow');
    expect(kinds(viewCourse(c, '2026-10-05', { rigNeeded: true, rigGiven: true }).alerts)).not.toContain('rigWindow');
    expect(kinds(viewCourse(c, '2026-10-05').alerts)).not.toContain('rigWindow');
  });
});
