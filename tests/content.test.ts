import jsQR from 'jsqr';
import { describe, expect, it } from 'vitest';
import { MYTH_CITES, PLAN_TIP_CITES, STAT_CITES } from '../src/data/cites';
import { SOURCES } from '../src/data/sources';
import { markTaken, newCourse } from '../src/engine/plan';
import { recordText, type BiteCase } from '../src/engine/record';
import { en } from '../src/i18n/en';
import { qrPath } from '../src/lib/qr';
import { WASH_SCHEDULE, WASH_SECONDS } from '../src/ui/Wash';

describe('every statement on screen has a source', () => {
  it('myths, numbers and plan tips line up with their citations', () => {
    expect(MYTH_CITES).toHaveLength(en.myths.length);
    expect(STAT_CITES).toHaveLength(en.learn.stats.length);
    expect(PLAN_TIP_CITES).toHaveLength(en.plan.tips.length);
  });
  it('every citation points to a known document', () => {
    for (const c of [...MYTH_CITES, ...STAT_CITES.flat(), ...PLAN_TIP_CITES]) expect(SOURCES[c.source]).toBeDefined();
  });
});

describe('wash timer', () => {
  it('has one spoken step per scheduled time, all within the 15 minutes, in order', () => {
    expect(WASH_SCHEDULE).toHaveLength(en.wash.steps.length);
    expect(WASH_SECONDS).toBe(900);
    expect([...WASH_SCHEDULE].sort((a, b) => a - b)).toEqual(WASH_SCHEDULE);
    expect(WASH_SCHEDULE.every((s) => s >= 0 && s < WASH_SECONDS)).toBe(true);
  });
});

/** Draws the QR modules as pixels and reads them back with an independent decoder. */
function decode(text: string): string | null {
  const { size, d } = qrPath(text);
  const scale = 4;
  const quiet = 4;
  const w = (size + quiet * 2) * scale;
  const px = new Uint8ClampedArray(w * w * 4).fill(255);
  for (const m of d.matchAll(/M(\d+) (\d+)h(\d+)/g)) {
    const [c, r, run] = [Number(m[1]), Number(m[2]), Number(m[3])];
    for (let y = (r + quiet) * scale; y < (r + quiet + 1) * scale; y++) {
      for (let x = (c + quiet) * scale; x < (c + run + quiet) * scale; x++) {
        const i = (y * w + x) * 4;
        px[i] = px[i + 1] = px[i + 2] = 0;
      }
    }
  }
  return jsQR(px, w, w)?.data ?? null;
}

describe('clinic QR code', () => {
  const c: BiteCase = {
    id: 'q1',
    name: 'கவின்',
    age: 9,
    kind: 'animal',
    date: '2026-10-25',
    animal: 'dog',
    sites: ['limbs', 'headNeckFace'],
    washedMinutes: 15,
    rigNeeded: true,
    course: markTaken(newCourse('pep-id', '2026-10-25'), 0, '2026-10-25'),
  };
  it('decodes to exactly the record text, Tamil name included', () => {
    const text = recordText(c, '2026-10-26');
    expect(decode(text)).toBe(text);
  });
  it('decodes a short record too', () => {
    const text = recordText({ ...c, name: 'Me', course: undefined, sites: [] }, '2026-10-26');
    expect(decode(text)).toBe(text);
  });
});
