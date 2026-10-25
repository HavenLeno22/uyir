// What happened → what the clinic will usually do, by India's National Guidelines for Rabies
// Prophylaxis (2019). This prepares the person for the clinic; it never says a bite is safe
// without saying to ask a doctor, and the guideline's own rule is "when in doubt, start PEP".
import type { Cite } from '../data/sources';

export type Animal = 'dog' | 'cat' | 'monkey' | 'livestock' | 'wild' | 'rodent' | 'bat' | 'human' | 'other';

/**
 * touch: touched or fed the animal · lickIntact: lick on unbroken skin · nibble: nibble on
 * uncovered skin · scratch: minor scratch or graze without bleeding · bite: a bite or scratch that
 * went through the skin · lickBroken: lick on a wound or broken skin · mucosa: saliva in the eyes,
 * mouth or nose.
 */
export type Contact = 'touch' | 'lickIntact' | 'nibble' | 'scratch' | 'bite' | 'lickBroken' | 'mucosa';

export type YesNoUnsure = 'yes' | 'no' | 'unsure';

export interface ExposureAnswers {
  animal: Animal;
  contacts: Contact[];
  bleeding: boolean;
  forest: boolean;
  /** HIV, cancer treatment, long-term steroids or other medicines that weaken immunity. */
  weakImmunity: YesNoUnsure;
  /** Chloroquine or hydroxychloroquine. */
  antimalarial: boolean;
  /** An earlier rabies vaccine course: complete and with proof, or some doses / no proof. */
  previous: 'none' | 'complete' | 'partial';
  /** Only for a complete earlier course: finished within the last three months. */
  previousWithin3Months: boolean;
  /** Dogs and cats: was the animal vaccinated against rabies? */
  animalVaccinated: YesNoUnsure;
  /** Days since the bite (0 = today). */
  daysSince: number;
}

export type Need = 'yes' | 'no' | 'ask';

export type ReasonKey =
  | 'cat1'
  | 'cat2'
  | 'cat3'
  | 'bleeding'
  | 'wild'
  | 'forest'
  | 'rodent'
  | 'bat'
  | 'human'
  | 'cat1Doubt'
  | 'weakImmunity'
  | 'weakUnsure'
  | 'antimalarial'
  | 'previousComplete'
  | 'previousRecent'
  | 'previousPartial'
  | 'vaccinatedAnimal'
  | 'dontWait'
  | 'lateIsOk';

export interface Reason {
  key: ReasonKey;
  cite: Cite;
}

export interface Assessment {
  /** National exposure category, or null where the guideline treats the animal separately. */
  category: 1 | 2 | 3 | null;
  special: 'rodent' | 'bat' | 'human' | null;
  vaccine: Need;
  /** Rabies immunoglobulin (RIG), infiltrated into the wound. */
  rig: Need;
  /** full = 4 or 5 visits; reexposure = days 0 and 3; washOnly = wound care only. */
  course: 'full' | 'reexposure' | 'washOnly' | 'none' | 'ask';
  /** The intramuscular route is the one to use (weak immunity, or chloroquine). */
  imRoute: boolean;
  /** now: go to a hospital now · today: go today · doctor: see a doctor, no rush. */
  urgency: 'now' | 'today' | 'doctor';
  reasons: Reason[];
}

const g = (section: string, page: number): Cite => ({ source: 'nrcp2019', section, page });
const TABLE_1 = g('Table 1', 5);

const CAT3: Contact[] = ['bite', 'lickBroken', 'mucosa'];
const CAT2: Contact[] = ['nibble', 'scratch'];

export function categoryOf(contacts: Contact[], bleeding: boolean): 1 | 2 | 3 {
  if (bleeding || contacts.some((c) => CAT3.includes(c))) return 3;
  if (contacts.some((c) => CAT2.includes(c))) return 2;
  return 1;
}

export function assess(a: ExposureAnswers): Assessment {
  const reasons: Reason[] = [];
  const add = (key: ReasonKey, cite: Cite) => reasons.push({ key, cite });

  // Animals the guideline treats on their own terms (section 2.1).
  if (a.animal === 'bat') {
    add('bat', g('2.1', 3));
    return { category: null, special: 'bat', vaccine: 'no', rig: 'no', course: 'none', imRoute: false, urgency: 'doctor', reasons };
  }
  if (a.animal === 'human') {
    add('human', g('2.1', 3));
    return { category: null, special: 'human', vaccine: 'ask', rig: 'ask', course: 'ask', imRoute: false, urgency: 'today', reasons };
  }
  if (a.animal === 'rodent' && !a.forest) {
    add('rodent', { source: 'nrcp2019', section: 'FAQ 13', page: 35 });
    return { category: null, special: 'rodent', vaccine: 'ask', rig: 'no', course: 'ask', imRoute: false, urgency: 'doctor', reasons };
  }

  let category = categoryOf(a.contacts, a.bleeding);
  reasons.push({ key: (['cat1', 'cat2', 'cat3'] as const)[category - 1], cite: TABLE_1 });
  if (a.bleeding) add('bleeding', g('2.6.1.1', 7));
  if (a.animal === 'wild') {
    category = 3;
    add('wild', g('2.1', 3));
  } else if (a.forest) {
    category = 3;
    add('forest', TABLE_1);
  }

  const weak = a.weakImmunity === 'yes';
  const imRoute = weak || a.antimalarial;
  if (weak) add('weakImmunity', g('6', 20));
  else if (a.weakImmunity === 'unsure') add('weakUnsure', g('6', 20));
  if (a.antimalarial) add('antimalarial', g('2.5', 4));

  if ((a.animal === 'dog' || a.animal === 'cat') && category >= 2) {
    if (a.animalVaccinated === 'yes') add('vaccinatedAnimal', g('2.3', 4));
    add('dontWait', { source: 'nrcp2019', section: 'FAQ 9', page: 34 });
  }
  if (a.daysSince > 0 && category >= 2) add('lateIsOk', g('2.5', 4));

  if (category === 1) {
    // "None (if reliable case history is available)" and "when in doubt PEP should be initiated".
    add('cat1Doubt', g('2.5', 4));
    return { category, special: null, vaccine: 'no', rig: 'no', course: 'none', imRoute, urgency: 'doctor', reasons };
  }

  const rigNeeded = category === 3 || weak;
  // A documented complete course changes the plan, unless immunity is weak (section 6).
  if (a.previous === 'complete' && !weak) {
    if (a.previousWithin3Months) {
      add('previousRecent', g('5', 19));
      return { category, special: null, vaccine: 'no', rig: 'no', course: 'washOnly', imRoute, urgency: 'today', reasons };
    }
    add('previousComplete', g('5', 19));
    return { category, special: null, vaccine: 'yes', rig: 'no', course: 'reexposure', imRoute, urgency: 'today', reasons };
  }
  if (a.previous === 'partial') add('previousPartial', g('5', 19));

  return {
    category,
    special: null,
    vaccine: 'yes',
    rig: rigNeeded ? 'yes' : 'no',
    course: 'full',
    imRoute,
    urgency: category === 3 ? 'now' : 'today',
    reasons,
  };
}
