// All dose plans on this phone, newest first.
import { Plus } from 'lucide-react';
import { useT } from '../i18n';
import { href } from '../state/route';
import { useStore } from '../state/store';
import { PlanSummary, useToday } from './bits';

export function Doses() {
  const t = useT();
  const today = useToday();
  const { state } = useStore();
  const plans = state.cases.filter((c) => c.course).reverse();
  const active = plans.filter((c) => !c.archived);
  const archived = plans.filter((c) => c.archived);
  return (
    <div className="page doses">
      <h1 className="page__title">{t.home.plansTitle}</h1>
      {plans.length === 0 && <p className="page__lead">{t.home.noPlans}</p>}
      {active.length > 0 && (
        <div className="plan-rows">
          {active.map((c) => (
            <PlanSummary key={c.id} c={c} today={today} />
          ))}
        </div>
      )}
      <a className="button" href={href({ name: 'planNew' })}>
        <Plus size={20} aria-hidden="true" />
        {t.home.startPlan}
      </a>
      {archived.length > 0 && (
        <section className="section" aria-labelledby="archived-title">
          <h2 id="archived-title" className="section__title">
            {t.home.hiddenTitle}
          </h2>
          <div className="plan-rows">
            {archived.map((c) => (
              <PlanSummary key={c.id} c={c} today={today} />
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
