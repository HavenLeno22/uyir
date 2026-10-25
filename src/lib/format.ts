// Dates in the reader's language. Calendar dates are formatted in UTC so the day never shifts.
import type { ISODate } from '../engine/dates';
import { LOCALE, type Lang } from '../i18n';

const cache = new Map<string, Intl.DateTimeFormat>();
function formatter(lang: Lang, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = lang + JSON.stringify(opts);
  let f = cache.get(key);
  if (!f) {
    f = new Intl.DateTimeFormat(LOCALE[lang], { ...opts, timeZone: 'UTC' });
    cache.set(key, f);
  }
  return f;
}
const asDate = (d: ISODate) => new Date(`${d}T00:00:00Z`);

/** "Wed, 28 Oct" */
export const dayDate = (d: ISODate, lang: Lang) => formatter(lang, { weekday: 'short', day: 'numeric', month: 'short' }).format(asDate(d));
/** "28 Oct 2026" */
export const fullDate = (d: ISODate, lang: Lang) => formatter(lang, { day: 'numeric', month: 'short', year: 'numeric' }).format(asDate(d));
/** "28 Oct" */
export const shortDate = (d: ISODate, lang: Lang) => formatter(lang, { day: 'numeric', month: 'short' }).format(asDate(d));
/** "9 am" style hour label in the reader's language. */
export const hourLabel = (h: number, lang: Lang) =>
  new Intl.DateTimeFormat(LOCALE[lang], { hour: 'numeric', timeZone: 'UTC' }).format(new Date(Date.UTC(2026, 0, 1, h)));

/** "12:05" for a number of seconds. */
export function clock(seconds: number): string {
  const s = Math.max(0, Math.ceil(seconds));
  return `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
}
