// Pieces used on more than one screen: helplines, a plan's one-line summary, today's date.
import { ChevronRight, Phone } from 'lucide-react';
import { useEffect, useState } from 'react';
import { CARE_CITES } from '../data/cites';
import { daysBetween, today as todayOf, type ISODate } from '../engine/dates';
import { viewCourse } from '../engine/plan';
import { viewWatch } from '../engine/watch';
import type { BiteCase } from '../engine/record';
import { useLang, useT } from '../i18n';
import { dayDate } from '../lib/format';
import { href } from '../state/route';
import { SourceLine } from './controls';

interface InstallEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed' }>;
}

/**
 * The browser's own "install app" prompt, where it offers one (Chrome on Android and desktop).
 * Null when the app is installed already or the browser has no prompt.
 */
export function useInstallPrompt(): (() => void) | null {
  const [event, setEvent] = useState<InstallEvent | null>(null);
  useEffect(() => {
    const onPrompt = (e: Event) => {
      e.preventDefault();
      setEvent(e as InstallEvent);
    };
    const onInstalled = () => setEvent(null);
    window.addEventListener('beforeinstallprompt', onPrompt);
    window.addEventListener('appinstalled', onInstalled);
    return () => {
      window.removeEventListener('beforeinstallprompt', onPrompt);
      window.removeEventListener('appinstalled', onInstalled);
    };
  }, []);
  if (!event) return null;
  return () => {
    void event.prompt();
    void event.userChoice.finally(() => setEvent(null));
  };
}

/** Today's date, updated if the app stays open past midnight. */
export function useToday(): ISODate {
  const [d, setD] = useState(() => todayOf());
  useEffect(() => {
    const id = window.setInterval(() => setD(todayOf()), 60_000);
    return () => window.clearInterval(id);
  }, []);
  return d;
}

export function Helplines({ compact = false }: { compact?: boolean }) {
  const t = useT();
  const lines = [
    { n: '108', label: t.helpline.ambulance },
    { n: '112', label: t.helpline.emergency },
    { n: '15400', label: t.helpline.rabies, note: t.helpline.rabiesNote },
  ];
  return (
    <section className="section helplines" aria-labelledby="helplines-title">
      <h2 id="helplines-title" className="section__title">
        {t.home.helplines}
      </h2>
      <ul className="helplines__list">
        {lines.map((l) => (
          <li key={l.n}>
            <a className="helpline" href={`tel:${l.n}`}>
              <Phone size={20} aria-hidden="true" />
              <span className="helpline__number">{l.n}</span>
              <span className="helpline__label">{l.label}</span>
            </a>
            {l.note && !compact && <p className="helpline__note">{l.note}</p>}
          </li>
        ))}
      </ul>
      {!compact && <SourceLine cites={CARE_CITES.helpline} />}
    </section>
  );
}

export function displayName(c: BiteCase, fallback: string): string {
  return c.name.trim() || fallback;
}

/** One row per plan: who, the next dose and how it stands, progress. */
export function PlanSummary({ c, today }: { c: BiteCase; today: ISODate }) {
  const t = useT();
  const lang = useLang();
  if (!c.course) return null;
  const v = viewCourse(c.course, today, { rigNeeded: c.rigNeeded, rigGiven: !!c.rig });
  const next = v.next;
  const animalAlert = !!c.watch && viewWatch(c.watch, today).outcome === 'alert';
  const urgent = animalAlert || v.alerts.some((a) => a.kind === 'lateMajor');
  const late = next?.state === 'late';
  const status = v.complete
    ? t.plan.state.taken
    : next
      ? next.state === 'late'
        ? t.plan.state.late(next.daysLate ?? 0)
        : next.state === 'today'
          ? t.plan.state.today
          : t.plan.state.upcoming(daysBetween(today, next.dueOn))
      : '';
  return (
    <a className={`plan-row${late ? ' plan-row--late' : ''}${urgent ? ' plan-row--urgent' : ''}`} href={href({ name: 'plan', id: c.id })}>
      <span className="plan-row__who">{displayName(c, t.plan.nameFallback)}</span>
      <span className="plan-row__next">
        {v.complete || !next ? t.plan.completeShort : `${t.plan.dose(next.index + 1, v.doses.length)}, ${dayDate(next.dueOn, lang)}`}
      </span>
      <span className={`pill pill--${v.complete ? 'done' : late ? (urgent ? 'urgent' : 'warn') : next?.state === 'today' ? 'due' : 'quiet'}`}>{status}</span>
      <span className="plan-row__dots" aria-hidden="true">
        {v.doses.map((d) => (
          <span key={d.index} className={`dot dot--${d.state}`} />
        ))}
      </span>
      <ChevronRight className="plan-row__chev" size={20} aria-hidden="true" />
    </a>
  );
}
