// Where each piece of on-screen content comes from. Index-aligned with the lists in the
// message files (tests/content.test.ts checks the lengths match).
import type { Cite } from './sources';

const g = (section: string, page: number): Cite => ({ source: 'nrcp2019', section, page });

export const WASH_CITES: Cite[] = [
  { source: 'nrcpFaq', section: 'Q 7' },
  { source: 'nrcpWound', section: 'Standard Operating Procedures', page: 3 },
  g('2.6.1.1', 7),
];

export const SNAKE_CITES: Cite[] = [{ source: 'snake2017', section: 'First aid measures', page: 7 }];

export const MYTH_CITES: Cite[] = [
  g('FAQ 2', 33),
  g('FAQ 3', 33),
  g('2.3', 4),
  g('FAQ 9', 34),
  g('10', 24),
  g('FAQ 10', 34),
  g('3.1', 11),
  g('FAQ 15', 35),
  g('8', 22),
  { source: 'nrcpFaq', section: 'Q 12' },
  { source: 'nrcpWound', section: 'Introduction', page: 1 },
  g('FAQ 13', 35),
  { source: 'nrcpFaq', section: 'Q 9' },
  { source: 'snake2017', section: 'Important don\'ts', page: 8 },
  { source: 'snake2017', section: 'Important don\'ts', page: 8 },
];

export const STAT_CITES: Cite[][] = [
  [{ source: 'bites2024' }],
  [{ source: 'icmr2025' }, { source: 'bites2024' }],
  [{ source: 'debnath2025' }],
  [{ source: 'suraweera2020' }],
];

export const PLAN_TIP_CITES: Cite[] = [g('4.1.3.4', 16), g('FAQ 3', 33), g('FAQ 18', 36), { source: 'nrcpFaq', section: 'Q 12' }];

export const CARE_CITES: Record<'free' | 'tn' | 'helpline' | 'list', Cite[]> = {
  free: [{ source: 'nrcpNote', section: 'point 8', page: 1 }],
  tn: [
    { source: 'tnSapre', page: 39 },
    { source: 'tnSapre', page: 64 },
  ],
  helpline: [{ source: 'nrcpFaq', section: 'Rabies Helpline' }],
  list: [{ source: 'nrcpClinics' }],
};

export const RIG_WHERE_CITE: Cite = { source: 'tnSapre', page: 39 };
