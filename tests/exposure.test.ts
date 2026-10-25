import { describe, expect, it } from 'vitest';
import { assess, categoryOf, type ExposureAnswers } from '../src/engine/exposure';
import { recordCheck, viewWatch, type Watch } from '../src/engine/watch';

const base: ExposureAnswers = {
  animal: 'dog',
  contacts: ['bite'],
  bleeding: false,
  forest: false,
  weakImmunity: 'no',
  antimalarial: false,
  previous: 'none',
  previousWithin3Months: false,
  animalVaccinated: 'unsure',
  daysSince: 0,
};
const keys = (a: ExposureAnswers) => assess(a).reasons.map((r) => r.key);

describe('exposure categories (NRCP 2019, Table 1)', () => {
  it('maps contacts to categories, worst one wins', () => {
    expect(categoryOf(['touch', 'lickIntact'], false)).toBe(1);
    expect(categoryOf(['nibble'], false)).toBe(2);
    expect(categoryOf(['scratch', 'touch'], false)).toBe(2);
    expect(categoryOf(['scratch', 'mucosa'], false)).toBe(3);
    expect(categoryOf(['lickBroken'], false)).toBe(3);
  });
  it('treats any bleeding as severe (section 2.6.1.1)', () => {
    expect(categoryOf(['scratch'], true)).toBe(3);
  });
  it('category III: wound care, immunoglobulin and the full vaccine course, now', () => {
    expect(assess(base)).toMatchObject({ category: 3, vaccine: 'yes', rig: 'yes', course: 'full', urgency: 'now' });
  });
  it('category II: vaccine without immunoglobulin, today', () => {
    expect(assess({ ...base, contacts: ['scratch'] })).toMatchObject({ category: 2, vaccine: 'yes', rig: 'no', urgency: 'today' });
  });
  it('category I: no vaccine if the history is reliable, with the guideline\'s "when in doubt" rule', () => {
    const a = assess({ ...base, contacts: ['touch'] });
    expect(a).toMatchObject({ category: 1, vaccine: 'no', course: 'none' });
    expect(a.reasons.map((r) => r.key)).toContain('cat1Doubt');
  });
});

describe('special rules', () => {
  it('wild animals and forest bites are category III', () => {
    expect(assess({ ...base, animal: 'wild', contacts: ['scratch'] })).toMatchObject({ category: 3, rig: 'yes' });
    expect(assess({ ...base, animal: 'monkey', contacts: ['nibble'], forest: true })).toMatchObject({ category: 3 });
  });
  it('house rats and rabbits do not ordinarily need the vaccine, but forest rodents do', () => {
    expect(assess({ ...base, animal: 'rodent' })).toMatchObject({ special: 'rodent', vaccine: 'ask', category: null });
    expect(assess({ ...base, animal: 'rodent', forest: true })).toMatchObject({ category: 3, vaccine: 'yes' });
  });
  it('bats: the 2019 guideline does not call for PEP in India', () => {
    expect(assess({ ...base, animal: 'bat' })).toMatchObject({ special: 'bat', vaccine: 'no', urgency: 'doctor' });
  });
  it('contact with a rabies patient: the doctor may offer PEP', () => {
    expect(assess({ ...base, animal: 'human' })).toMatchObject({ special: 'human', vaccine: 'ask' });
  });
  it('weak immunity: immunoglobulin even in category II, and the intramuscular route (section 6)', () => {
    expect(assess({ ...base, contacts: ['scratch'], weakImmunity: 'yes' })).toMatchObject({ category: 2, rig: 'yes', imRoute: true });
  });
  it('chloroquine means the intramuscular route (section 2.5)', () => {
    expect(assess({ ...base, antimalarial: true })).toMatchObject({ imRoute: true, rig: 'yes' });
  });
});

describe('earlier vaccination (section 5)', () => {
  it('a documented complete course: two doses, no immunoglobulin', () => {
    expect(assess({ ...base, previous: 'complete' })).toMatchObject({ course: 'reexposure', rig: 'no', vaccine: 'yes' });
  });
  it('within three months: wound washing only', () => {
    expect(assess({ ...base, previous: 'complete', previousWithin3Months: true })).toMatchObject({ course: 'washOnly', vaccine: 'no' });
  });
  it('some doses or no proof: treated as a fresh case', () => {
    expect(assess({ ...base, previous: 'partial' })).toMatchObject({ course: 'full', rig: 'yes' });
    expect(keys({ ...base, previous: 'partial' })).toContain('previousPartial');
  });
  it('weak immunity overrides an earlier course (section 6)', () => {
    expect(assess({ ...base, previous: 'complete', weakImmunity: 'yes' })).toMatchObject({ course: 'full', rig: 'yes' });
  });
});

describe('notes for the person', () => {
  it('a vaccinated dog still means the vaccine, and nobody waits 10 days to start', () => {
    const k = keys({ ...base, animalVaccinated: 'yes' });
    expect(k).toContain('vaccinatedAnimal');
    expect(k).toContain('dontWait');
  });
  it('coming late is still worth it', () => {
    expect(keys({ ...base, daysSince: 40 })).toContain('lateIsOk');
    expect(keys({ ...base, daysSince: 0 })).not.toContain('lateIsOk');
  });
  it('every reason has a page in the guideline', () => {
    for (const r of assess({ ...base, bleeding: true, antimalarial: true, weakImmunity: 'unsure', daysSince: 3 }).reasons) {
      expect(r.cite.page).toBeGreaterThan(0);
    }
  });
});

describe('10-day animal watch (section 2.2)', () => {
  const w: Watch = { animal: 'dog', from: '2026-10-01', checks: {} };
  it('asks for a check each day until day 10', () => {
    expect(viewWatch(w, '2026-10-03')).toMatchObject({ day: 2, checkDue: true, outcome: 'watching', endsOn: '2026-10-11' });
    expect(viewWatch(recordCheck(w, '2026-10-03', 'well'), '2026-10-03').checkDue).toBe(false);
  });
  it('raises an alert as soon as the animal is sick, dead or missing', () => {
    const v = viewWatch(recordCheck(recordCheck(w, '2026-10-02', 'well'), '2026-10-05', 'missing'), '2026-10-06');
    expect(v).toMatchObject({ outcome: 'alert', alertOn: '2026-10-05', alertStatus: 'missing' });
  });
  it('is well after 10 days only with a check on day 10 or later', () => {
    expect(viewWatch(recordCheck(w, '2026-10-10', 'well'), '2026-10-10').outcome).toBe('watching');
    expect(viewWatch(recordCheck(w, '2026-10-11', 'well'), '2026-10-11').outcome).toBe('wellAfter10');
    expect(viewWatch(recordCheck(w, '2026-10-04', 'well'), '2026-10-14').outcome).toBe('unknown');
  });
});
