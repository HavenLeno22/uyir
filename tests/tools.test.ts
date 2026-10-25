import { describe, expect, it } from 'vitest';
import clinicData from '../src/data/clinics.json';
import { escapeText, foldLine, googleCalendarUrl, toICS, type CalendarEvent } from '../src/engine/calendar';
import { distanceKm, formatPhone, nearestClinics, searchClinics, telHref, type Clinic } from '../src/engine/clinics';
import { markTaken, newCourse } from '../src/engine/plan';
import { recordText, type BiteCase } from '../src/engine/record';

const clinics = clinicData.clinics as Clinic[];

describe('calendar file', () => {
  const ev: CalendarEvent = {
    uid: 'c1-dose2@uyir',
    date: '2026-10-28',
    hour: 9,
    durationMin: 60,
    title: 'Rabies vaccine, dose 2 of 4',
    description: 'Take your card; go even if you are late, don\'t start again.',
  };
  const ics = toICS([ev], new Date(Date.UTC(2026, 9, 25, 2, 15, 0)));

  it('is a valid calendar with CRLF line endings and local times', () => {
    expect(ics.startsWith('BEGIN:VCALENDAR\r\nVERSION:2.0\r\n')).toBe(true);
    expect(ics).toContain('DTSTART:20261028T090000\r\n');
    expect(ics).toContain('DTEND:20261028T100000\r\n');
    expect(ics).toContain('DTSTAMP:20261025T021500Z\r\n');
    expect(ics.endsWith('END:VCALENDAR\r\n')).toBe(true);
    expect(ics.split('\r\n').every((l) => !l.includes('\n'))).toBe(true);
  });
  it('reminds the evening before (6 p.m.) and at the time', () => {
    expect(ics).toContain('TRIGGER:-PT15H');
    expect(ics).toContain('TRIGGER:PT0M');
  });
  it('escapes text and folds long lines without splitting Tamil characters', () => {
    expect(escapeText('a,b;c\\d\ne')).toBe('a\\,b\\;c\\\\d\\ne');
    const tamil = 'SUMMARY:' + 'ரேபிஸ் தடுப்பூசி '.repeat(12);
    const folded = foldLine(tamil);
    const enc = new TextEncoder();
    for (const [i, part] of folded.split('\r\n').entries()) expect(enc.encode(part).length).toBeLessThanOrEqual(i === 0 ? 75 : 75);
    expect(folded.split('\r\n ').join('')).toBe(tamil);
  });
  it('makes a Google Calendar link with the same times', () => {
    const url = new URL(googleCalendarUrl(ev));
    expect(url.searchParams.get('dates')).toBe('20261028T090000/20261028T100000');
    expect(url.searchParams.get('text')).toBe(ev.title);
  });
});

describe('official clinic list', () => {
  it('has all 284 clinics, each with a state, district and facility', () => {
    expect(clinics).toHaveLength(284);
    for (const c of clinics) {
      expect(c.state.length).toBeGreaterThan(2);
      expect(c.facility.length).toBeGreaterThan(3);
    }
  });
  it('keeps only numbers that can be dialled', () => {
    for (const c of clinics) for (const p of c.phones) expect(p).toMatch(/^([6-9]\d{9}|0\d{10})$/);
    expect(clinics.filter((c) => c.phoneUnreadable).map((c) => c.id)).toEqual(['nrcp-13', 'nrcp-160', 'nrcp-165']);
  });
  it('has coordinates inside India for every clinic, and says how precise they are', () => {
    for (const c of clinics) {
      expect(c.lat).toBeGreaterThan(6);
      expect(c.lat).toBeLessThan(37);
      expect(c.lon).toBeGreaterThan(68);
      expect(c.lon).toBeLessThan(98);
      expect(['facility', 'town', 'pin', 'district']).toContain(c.geo);
    }
  });
  it('marks only district-centre distances as approximate', () => {
    const near = nearestClinics(clinics, 15.5, 73.9, 284);
    for (const n of near) expect(n.approximate).toBe(n.clinic.geo === 'district');
  });
  it('finds clinics by any words, in any order', () => {
    expect(searchClinics(clinics, 'tirupathi').map((c) => c.id)).toContain('nrcp-13');
    expect(searchClinics(clinics, 'north goa phc').length).toBeGreaterThan(5);
    expect(searchClinics(clinics, 'hospital', 'Kerala').every((c) => c.state === 'Kerala')).toBe(true);
  });
  it('sorts by distance from a point', () => {
    // Connaught Place, New Delhi: the nearest clinics are in Delhi.
    const near = nearestClinics(clinics, 28.6315, 77.2167, 5);
    expect(near.every((n) => n.clinic.state === 'Delhi')).toBe(true);
    expect(near[0].km).toBeLessThan(15);
    expect(distanceKm(13.0827, 80.2707, 12.9716, 77.5946)).toBeCloseTo(290, -1); // Chennai–Bengaluru
  });
  it('dials mobiles with +91 and landlines with their STD code', () => {
    expect(telHref('9701501070')).toBe('tel:+919701501070');
    expect(telHref('07922683721')).toBe('tel:07922683721');
    expect(formatPhone('9701501070')).toBe('97015 01070');
  });
});

describe('clinic record (Annexure IV fields)', () => {
  const c: BiteCase = {
    id: 'c1',
    name: 'Kavin',
    age: 9,
    kind: 'animal',
    date: '2026-10-25',
    sites: ['limbs'],
    washedMinutes: 15,
    answers: {
      animal: 'dog',
      contacts: ['bite'],
      bleeding: true,
      forest: false,
      weakImmunity: 'no',
      antimalarial: false,
      previous: 'none',
      previousWithin3Months: false,
      animalVaccinated: 'unsure',
      daysSince: 0,
    },
    course: markTaken(newCourse('pep-id', '2026-10-25'), 0, '2026-10-25'),
    watch: { animal: 'dog', from: '2026-10-25', checks: { '2026-10-26': 'well' } },
  };
  it('lists the register fields a clinic needs', () => {
    const text = recordText(c, '2026-10-26');
    expect(text).toContain('Name: Kavin, age 9');
    expect(text).toContain('Date of bite: 25 Oct 2026');
    expect(text).toContain('Animal: Dog');
    expect(text).toContain('Site: Extremities');
    expect(text).toContain('Category: III');
    expect(text).toContain('Wound washed: yes, 15 min');
    expect(text).toContain('ARV ID (days 0, 3, 7, 28): D0 25 Oct 2026 given; D3 due 28 Oct 2026');
    expect(text).toContain('Biting animal: alive so far (day 1 of 10)');
  });
  it('stays short enough for a QR code a phone camera reads easily', () => {
    expect(new TextEncoder().encode(recordText(c, '2026-10-26')).length).toBeLessThan(600);
  });
});
