// One person's bite, as the app keeps it, and the summary a clinic can read. The summary uses
// the fields of the government's Animal Bite Exposure Register (NRCP 2019, Annexure IV), in
// English, so any clinic can copy it into the register, from paper or from a QR code.
import { daysBetween, type ISODate } from './dates';
import { assess, type Animal, type ExposureAnswers } from './exposure';
import { viewCourse, type Course } from './plan';
import { REGIMENS } from './regimens';
import { viewWatch, type Watch } from './watch';

/** The register's body sites: extremities, trunk, head-neck-face, back. */
export type BodySite = 'limbs' | 'trunk' | 'headNeckFace' | 'back';

export interface BiteCase {
  id: string;
  /** Who was bitten, as the person calls them ("Me", "Amma", a child's name). */
  name: string;
  age?: number;
  kind: 'animal' | 'snake';
  /** The day of the bite. */
  date: ISODate;
  /** Which animal, when the plan was made without the exposure check. */
  animal?: Animal;
  answers?: ExposureAnswers;
  sites: BodySite[];
  /** Minutes the wound was washed with the timer running. */
  washedMinutes?: number;
  rig?: { on: ISODate };
  /** The doctor (or the exposure check) said immunoglobulin is needed. */
  rigNeeded?: boolean;
  course?: Course;
  watch?: Watch;
  /** Hidden from the home screen once finished or no longer relevant. */
  archived?: boolean;
}

const MONTHS = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
export function shortDate(d: ISODate): string {
  const [y, m, day] = d.split('-');
  return `${Number(day)} ${MONTHS[Number(m) - 1]} ${y}`;
}

const ANIMAL: Record<Animal, string> = {
  dog: 'Dog',
  cat: 'Cat',
  monkey: 'Monkey',
  livestock: 'Cattle/goat/other livestock',
  wild: 'Wild animal',
  rodent: 'Rat/rodent/rabbit',
  bat: 'Bat',
  human: 'Contact with a rabies patient',
  other: 'Other',
};
const SITE: Record<BodySite, string> = { limbs: 'Extremities', trunk: 'Trunk', headNeckFace: 'Head-Neck-Face', back: 'Back' };
const ROMAN = ['', 'I', 'II', 'III'];

/** Plain text for the clinic: printed on the card and carried in its QR code. */
export function recordText(c: BiteCase, today: ISODate): string {
  const lines = ['UYIR BITE RECORD (self-reported)'];
  lines.push(`Name: ${c.name}${c.age !== undefined ? `, age ${c.age}` : ''}`);
  if (c.kind === 'snake') {
    lines.push(`Snakebite on ${shortDate(c.date)}`);
    if (c.sites.length) lines.push(`Site: ${c.sites.map((s) => SITE[s]).join(', ')}`);
    return lines.join('\n');
  }
  const a = c.answers ? assess(c.answers) : null;
  const animal = c.answers?.animal ?? c.animal;
  if (c.course?.regimen !== 'prep') lines.push(`Date of bite: ${shortDate(c.date)}`);
  if (animal) lines.push(`Animal: ${ANIMAL[animal]}`);
  if (c.sites.length) lines.push(`Site: ${c.sites.map((s) => SITE[s]).join(', ')}`);
  if (a?.category) lines.push(`Category: ${ROMAN[a.category]}`);
  lines.push(`Wound washed: ${c.washedMinutes ? `yes, ${c.washedMinutes} min` : 'not recorded'}`);
  lines.push(`RIG: ${c.rig ? `given ${shortDate(c.rig.on)}` : c.rigNeeded ? 'needed, not yet given' : 'not recorded'}`);
  if (c.answers) {
    const prev = { none: 'none', complete: 'complete (documented)', partial: 'partial / not documented' }[c.answers.previous];
    lines.push(`Previous ARV: ${prev}`);
    if (c.answers.weakImmunity === 'yes') lines.push('Immunocompromised: yes');
    if (c.answers.antimalarial) lines.push('On chloroquine/HCQ: yes');
  }
  if (c.course) {
    const reg = REGIMENS[c.course.regimen];
    const v = viewCourse(c.course, today);
    const route = reg.route === 'id' ? 'ID' : reg.route === 'im' ? 'IM' : 'ID/IM';
    const doses = v.doses
      .map((d) => `D${d.day} ${d.takenOn ? `${shortDate(d.takenOn)} given` : d.state === 'skipped' ? 'skipped (doctor)' : `due ${shortDate(d.dueOn)}`}`)
      .join('; ');
    lines.push(`ARV ${route} (days ${reg.days.join(', ')}): ${doses}`);
  }
  if (c.watch) {
    const w = viewWatch(c.watch, today);
    const status =
      w.outcome === 'alert'
        ? `${w.alertStatus === 'missing' ? 'not traceable' : w.alertStatus} (${shortDate(w.alertOn as ISODate)})`
        : w.outcome === 'wellAfter10'
          ? 'alive after 10 days'
          : w.outcome === 'unknown'
            ? 'not known'
            : `alive so far (day ${Math.max(0, daysBetween(c.watch.from, today))} of 10)`;
    lines.push(`Biting animal: ${status}`);
  }
  return lines.join('\n');
}
