// The vaccine schedules in India's National Guidelines for Rabies Prophylaxis (2019),
// section 10 "Summary of vaccination schedule". Day 0 is the date of the first dose.
import type { Cite } from '../data/sources';

export type RegimenId = 'pep-id' | 'pep-im' | 'reexposure' | 'prep';

export interface Regimen {
  id: RegimenId;
  /** Day of each dose, counted from the first dose (day 0). */
  days: number[];
  /** Where the guideline allows a range ("booster on either day 21 or 28"): dose index → last day. */
  latest?: Record<number, number>;
  /** All of the first three doses (days 0, 3, 7) should be given within this many days (section 8). */
  firstThreeWithin?: number;
  /** Injections at each visit: 2 for the intradermal PEP schedule (one on each upper arm). */
  injectionsPerVisit: number;
  route: 'id' | 'im' | 'id-or-im';
  cite: Cite;
}

export const REGIMENS: Record<RegimenId, Regimen> = {
  // Updated Thai Red Cross schedule (2-2-2-0-2): 0.1 ml at two sites, one on each deltoid.
  'pep-id': {
    id: 'pep-id',
    days: [0, 3, 7, 28],
    firstThreeWithin: 10,
    injectionsPerVisit: 2,
    route: 'id',
    cite: { source: 'nrcp2019', section: '4.1.3', page: 15 },
  },
  // Essen schedule (1-1-1-1-1): one vial in the upper arm, or the thigh for small children.
  'pep-im': {
    id: 'pep-im',
    days: [0, 3, 7, 14, 28],
    firstThreeWithin: 10,
    injectionsPerVisit: 1,
    route: 'im',
    cite: { source: 'nrcp2019', section: '4.2.1', page: 17 },
  },
  // Someone who can show a complete earlier PEP or PrEP: two doses, no immunoglobulin.
  reexposure: {
    id: 'reexposure',
    days: [0, 3],
    injectionsPerVisit: 1,
    route: 'id-or-im',
    cite: { source: 'nrcp2019', section: '5', page: 19 },
  },
  // Pre-exposure: days 0 and 7, booster on day 21 or 28.
  prep: {
    id: 'prep',
    days: [0, 7, 21],
    latest: { 2: 28 },
    injectionsPerVisit: 1,
    route: 'id-or-im',
    cite: { source: 'nrcp2019', section: '7.2', page: 21 },
  },
};

export const REGIMEN_IDS = Object.keys(REGIMENS) as RegimenId[];
