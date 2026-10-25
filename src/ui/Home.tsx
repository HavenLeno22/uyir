// Home: the emergency fork first ("what bit you?"), then the person's dose plans.
import { ChevronRight, Download, Droplets, ListChecks, PawPrint, Plus, Syringe } from 'lucide-react';
import { useState } from 'react';
import { viewCourse } from '../engine/plan';
import { useT } from '../i18n';
import { href } from '../state/route';
import { useStore } from '../state/store';
import { SnakeIcon } from './art';
import { displayName, Helplines, PlanSummary, useInstallPrompt, useToday } from './bits';

export function Home() {
  const t = useT();
  const { state } = useStore();
  const today = useToday();
  const [showArchived, setShowArchived] = useState(false);
  const install = useInstallPrompt();
  const plans = state.cases.filter((c) => c.course);
  const active = plans.filter((c) => !c.archived);
  const archived = plans.filter((c) => c.archived);

  // Doses due today or late come first: on a dose day that is why the app was opened.
  const due = active
    .map((c) => ({ c, v: viewCourse(c.course!, today, { rigNeeded: c.rigNeeded, rigGiven: !!c.rig }) }))
    .filter(({ v }) => v.next && (v.next.state === 'today' || v.next.state === 'late'))
    .sort((a, b) => (b.v.next?.daysLate ?? 0) - (a.v.next?.daysLate ?? 0));

  return (
    <div className="page home">
      {due.map(({ c, v }) => {
        const d = v.next!;
        const late = d.state === 'late';
        // Red only when the guideline says to see the doctor (a missed early dose).
        const severe = v.alerts.some((a) => a.kind === 'lateMajor');
        return (
          <a key={c.id} className={`due-banner${severe ? ' due-banner--late' : ''}`} href={href({ name: 'plan', id: c.id })}>
            <Syringe size={20} aria-hidden="true" />
            <span>
              <strong>{displayName(c, t.plan.nameFallback)}</strong>: {t.plan.dose(d.index + 1, v.doses.length)},{' '}
              {late ? t.plan.state.late(d.daysLate ?? 0) : t.plan.state.today}
            </span>
            <ChevronRight size={20} aria-hidden="true" />
          </a>
        );
      })}
      <section className="sos" aria-labelledby="sos-title">
        <h1 id="sos-title" className="sos__title">
          {t.home.bittenTitle}
        </h1>
        <p className="sos__lead">{t.home.bittenLead}</p>
        <div className="sos__tiles">
          <a className="sos-tile sos-tile--animal" href={href({ name: 'bite' })}>
            <PawPrint className="sos-tile__icon" size={34} aria-hidden="true" />
            <span className="sos-tile__title">{t.home.animal}</span>
            <span className="sos-tile__hint">
              <Droplets size={18} aria-hidden="true" />
              {t.home.animalHint}
            </span>
          </a>
          <a className="sos-tile sos-tile--snake" href={href({ name: 'snake' })}>
            <span className="sos-tile__icon">
              <SnakeIcon size={34} />
            </span>
            <span className="sos-tile__title">{t.home.snake}</span>
            <span className="sos-tile__hint">{t.home.snakeHint}</span>
          </a>
        </div>
      </section>

      <section className="section" aria-labelledby="plans-title">
        <h2 id="plans-title" className="section__title">
          {t.home.plansTitle}
        </h2>
        {active.length === 0 && <p className="section__lead">{t.home.noPlans}</p>}
        {active.length > 0 && (
          <div className="plan-rows">
            {active.map((c) => (
              <PlanSummary key={c.id} c={c} today={today} />
            ))}
          </div>
        )}
        {archived.length > 0 && (
          <p className="muted">
            {t.home.archived(archived.length)}{' '}
            <button type="button" className="link-button" onClick={() => setShowArchived((s) => !s)} aria-expanded={showArchived}>
              {t.home.showArchived}
            </button>
          </p>
        )}
        {showArchived && (
          <div className="plan-rows">
            {archived.map((c) => (
              <PlanSummary key={c.id} c={c} today={today} />
            ))}
          </div>
        )}
        <a className="button button--quiet" href={href({ name: 'planNew' })}>
          <Plus size={20} aria-hidden="true" />
          {t.home.startPlan}
        </a>
      </section>

      <section className="section check-cta" aria-labelledby="check-title">
        <h2 id="check-title" className="section__title">
          {t.check.title}
        </h2>
        <p className="section__lead">{t.home.checkLead}</p>
        <a className="button button--quiet" href={href({ name: 'check' })}>
          <ListChecks size={20} aria-hidden="true" />
          {t.home.checkCta}
        </a>
      </section>

      {install && (
        <section className="section install" aria-labelledby="install-title">
          <h2 id="install-title" className="section__title">
            {t.home.installTitle}
          </h2>
          <p className="section__lead">{t.home.installLead}</p>
          <button type="button" className="button button--quiet" onClick={install}>
            <Download size={20} aria-hidden="true" />
            {t.home.install}
          </button>
        </section>
      )}

      <Helplines />
      <p className="disclaimer">{t.notDoctor}</p>
    </div>
  );
}
