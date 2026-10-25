import { describe, expect, it } from 'vitest';
import { en } from '../src/i18n/en';
import { hi } from '../src/i18n/hi';
import { ta } from '../src/i18n/ta';

type Tree = Record<string, unknown>;

/** Every path in the English messages, with the shape found there. */
function shape(v: unknown, path = ''): [string, string][] {
  if (Array.isArray(v)) return [[path, `array:${v.length}`], ...v.flatMap((x, i) => shape(x, `${path}[${i}]`))];
  if (typeof v === 'function') return [[path, `fn:${v.length}`]];
  if (v && typeof v === 'object') return Object.entries(v as Tree).flatMap(([k, x]) => shape(x, path ? `${path}.${k}` : k));
  return [[path, typeof v]];
}

describe('translations', () => {
  for (const [name, msgs] of [
    ['Tamil', ta],
    ['Hindi', hi],
  ] as const) {
    it(`${name} has every message, list length and function of the English`, () => {
      expect(shape(msgs)).toEqual(shape(en));
    });
    it(`${name} has no leftover English sentences`, () => {
      // Brand names, units and codes are allowed; whole English sentences are not.
      const leftovers = shape(msgs)
        .filter(([, kind]) => kind === 'string')
        .map(([path]) => path.split(/\.|\[|\]/).filter(Boolean).reduce<unknown>((o, k) => (o as Tree)[k], msgs) as string)
        .filter((s) => /\b(the|and|you|your|with|to|of)\b/i.test(s) && !/OpenStreetMap|Google|WhatsApp/.test(s));
      expect(leftovers).toEqual([]);
    });
  }
  it('message functions give text for typical values', () => {
    for (const m of [en, ta, hi]) {
      expect(m.plan.state.late(3)).toMatch(/3/);
      expect(m.common.rel(-2)).toMatch(/2/);
      expect(m.plan.alerts.rigWindow('5 Oct', 0)).toMatch(/5 Oct/);
    }
  });
});
