// "What will the clinic do?": four short questions, then what to expect, with the guideline's
// reasons. It prepares the person for the clinic; the doctor decides.
import { Cat, ChevronLeft, Dog, Hospital, PawPrint, Plus, Rat, RotateCcw, User } from 'lucide-react';
import { useEffect, useRef, useState } from 'react';
import { RIG_WHERE_CITE } from '../data/cites';
import { daysBetween, today as todayOf, type ISODate } from '../engine/dates';
import { assess, type Animal, type Contact, type ExposureAnswers, type YesNoUnsure } from '../engine/exposure';
import { useT } from '../i18n';
import { go, href } from '../state/route';
import { useStore } from '../state/store';
import { BatIcon } from './art';
import { ChoiceGrid, Chips, DateField, Notice, Segmented, SourceLine, YesNo } from './controls';

const ANIMALS: Animal[] = ['dog', 'cat', 'monkey', 'livestock', 'wild', 'rodent', 'bat', 'human', 'other'];
const CONTACTS: Contact[] = ['touch', 'lickIntact', 'nibble', 'scratch', 'bite', 'lickBroken', 'mucosa'];
const ICONS: Partial<Record<Animal, JSX.Element>> = {
  dog: <Dog size={28} />,
  cat: <Cat size={28} />,
  monkey: <PawPrint size={28} />,
  livestock: <PawPrint size={28} />,
  wild: <PawPrint size={28} />,
  rodent: <Rat size={28} />,
  bat: <BatIcon size={28} />,
  human: <User size={28} />,
  other: <PawPrint size={28} />,
};

interface Partial_ {
  animal: Animal | null;
  contacts: Contact[];
  bleeding: boolean | null;
  forest: boolean | null;
  weakImmunity: YesNoUnsure | null;
  antimalarial: boolean | null;
  previous: ExposureAnswers['previous'] | null;
  previousWithin3Months: boolean | null;
  animalVaccinated: YesNoUnsure | null;
  date: ISODate;
}

/** Bats and contact with a patient need no more questions: the guideline answers them directly. */
const direct = (a: Animal | null) => a === 'bat' || a === 'human';

function complete(p: Partial_, today: ISODate): ExposureAnswers {
  return {
    animal: p.animal ?? 'other',
    contacts: p.contacts,
    bleeding: p.bleeding ?? false,
    forest: p.forest ?? false,
    weakImmunity: p.weakImmunity ?? 'no',
    antimalarial: p.antimalarial ?? false,
    previous: p.previous ?? 'none',
    previousWithin3Months: p.previous === 'complete' ? (p.previousWithin3Months ?? false) : false,
    animalVaccinated: p.animalVaccinated ?? 'unsure',
    daysSince: Math.max(0, daysBetween(p.date, today)),
  };
}

export function Check() {
  const t = useT();
  const { dispatch } = useStore();
  const today = todayOf();
  const [step, setStep] = useState(0);
  const [p, setP] = useState<Partial_>({
    animal: null,
    contacts: [],
    bleeding: null,
    forest: null,
    weakImmunity: null,
    antimalarial: null,
    previous: null,
    previousWithin3Months: null,
    animalVaccinated: null,
    date: today,
  });
  const set = (patch: Partial<Partial_>) => setP((x) => ({ ...x, ...patch }));
  const dogOrCat = p.animal === 'dog' || p.animal === 'cat';
  const TOTAL = 4;

  // Each new question starts at the top, with focus on its title so screen readers read it.
  const firstRender = useRef(true);
  useEffect(() => {
    if (firstRender.current) {
      firstRender.current = false;
      return;
    }
    window.scrollTo(0, 0);
    const title = document.querySelector<HTMLElement>('main .question__title, main h1');
    if (title) {
      title.tabIndex = -1;
      title.focus({ preventScroll: true });
    }
  }, [step]);

  const canNext = [
    p.animal !== null,
    p.contacts.length > 0 && p.bleeding !== null && (p.animal === 'wild' || p.forest !== null),
    p.weakImmunity !== null && p.antimalarial !== null && p.previous !== null && (p.previous !== 'complete' || p.previousWithin3Months !== null),
    !dogOrCat || p.animalVaccinated !== null,
  ];

  if (step >= TOTAL) {
    const answers = complete(p, today);
    return (
      <Result
        answers={answers}
        onBack={() => setStep(direct(p.animal) ? 0 : TOTAL - 1)}
        onRestart={() => {
          setP((x) => ({ ...x, animal: null, contacts: [], bleeding: null, forest: null }));
          setStep(0);
        }}
        onPlan={() => {
          dispatch({ type: 'setDraft', draft: { answers, date: p.date } });
          go({ name: 'planNew' });
        }}
      />
    );
  }

  return (
    <div className="page check">
      <h1 className="page__title">{t.check.title}</h1>
      {step === 0 && <p className="page__lead">{t.check.lead}</p>}
      <p className="check__progress">
        <span>{t.check.step(step + 1, TOTAL)}</span>
        <span className="progress-bar" aria-hidden="true">
          <span style={{ width: `${((step + 1) / TOTAL) * 100}%` }} />
        </span>
      </p>

      {step === 0 && (
        <fieldset className="question">
          <legend className="question__title">{t.check.animalQ}</legend>
          <ChoiceGrid
            label={t.check.animalQ}
            value={p.animal}
            options={ANIMALS.map((a) => ({ value: a, label: t.check.animals[a], icon: ICONS[a] }))}
            onChange={(a) => set({ animal: a, forest: a === 'wild' ? true : p.forest })}
          />
        </fieldset>
      )}

      {step === 1 && (
        <fieldset className="question">
          <legend className="question__title">{t.check.contactQ}</legend>
          <Chips
            label={t.check.contactQ}
            hideLabel
            values={p.contacts}
            options={CONTACTS.map((c) => ({ value: c, label: t.check.contacts[c] }))}
            onChange={(contacts) => set({ contacts })}
          />
          <YesNo label={t.check.bleedingQ} value={p.bleeding} onChange={(bleeding) => set({ bleeding })} />
          {p.animal !== 'wild' && <YesNo label={t.check.forestQ} value={p.forest} onChange={(forest) => set({ forest })} />}
        </fieldset>
      )}

      {step === 2 && (
        <fieldset className="question">
          <legend className="question__title">{t.check.personQ}</legend>
          <Segmented
            label={t.check.weakQ}
            value={p.weakImmunity}
            options={[
              { value: 'yes', label: t.common.yes },
              { value: 'no', label: t.common.no },
              { value: 'unsure', label: t.common.notSure },
            ]}
            onChange={(weakImmunity) => set({ weakImmunity })}
          />
          <YesNo label={t.check.antimalarialQ} value={p.antimalarial} onChange={(antimalarial) => set({ antimalarial })} />
          <Segmented
            label={t.check.previousQ}
            stack
            value={p.previous}
            options={(['none', 'complete', 'partial'] as const).map((v) => ({ value: v, label: t.check.previous[v] }))}
            onChange={(previous) => set({ previous })}
          />
          {p.previous === 'complete' && (
            <YesNo label={t.check.recentQ} value={p.previousWithin3Months} onChange={(previousWithin3Months) => set({ previousWithin3Months })} />
          )}
        </fieldset>
      )}

      {step === 3 && (
        <fieldset className="question">
          <legend className="question__title">{t.check.whenQ}</legend>
          <DateField label={t.check.whenQ} hideLabel value={p.date} max={today} onChange={(date) => set({ date })} />
          {dogOrCat && (
            <Segmented
              label={t.check.vaccinatedQ}
              value={p.animalVaccinated}
              options={[
                { value: 'yes', label: t.common.yes },
                { value: 'no', label: t.common.no },
                { value: 'unsure', label: t.common.notSure },
              ]}
              onChange={(animalVaccinated) => set({ animalVaccinated })}
            />
          )}
        </fieldset>
      )}

      <div className="wizard-nav">
        {step > 0 && (
          <button type="button" className="button button--quiet" onClick={() => setStep(step - 1)}>
            <ChevronLeft size={20} aria-hidden="true" />
            {t.common.back}
          </button>
        )}
        <button
          type="button"
          className="button"
          disabled={!canNext[step]}
          onClick={() => setStep(step === 0 && direct(p.animal) ? TOTAL : step + 1)}
        >
          {step === TOTAL - 1 || (step === 0 && direct(p.animal)) ? t.check.seeResult : t.common.next}
        </button>
      </div>
    </div>
  );
}

function Result(props: { answers: ExposureAnswers; onBack: () => void; onRestart: () => void; onPlan: () => void }) {
  const t = useT();
  const a = assess(props.answers);
  const tone = a.urgency === 'now' ? 'urgent' : a.urgency === 'today' ? 'warn' : 'info';
  const heading =
    a.category !== null ? t.result.category(a.category) : a.special ? t.result.special[a.special] : '';
  const lead = a.category !== null ? t.result.categoryLead[a.category] : '';

  return (
    <div className="page result">
      <h1 className="page__title">{t.result.title}</h1>
      <div className={`verdict verdict--${a.category ?? 'special'}`}>
        <p className="verdict__head">{heading}</p>
        {lead && <p className="verdict__lead">{lead}</p>}
      </div>
      <Notice tone={tone}>
        <p className="notice__strong">{t.result.urgency[a.urgency]}</p>
      </Notice>

      {a.category !== null && (
        <section className="section" aria-labelledby="clinic-title">
          <h2 id="clinic-title" className="section__title">
            {t.result.clinicTitle}
          </h2>
          <ul className="checklist">
            <li>{t.result.washItem}</li>
            {a.course === 'full' && <li>{t.result.vaccineFull}</li>}
            {a.course === 'reexposure' && <li>{t.result.vaccineReexposure}</li>}
            {a.course === 'washOnly' && <li>{t.result.washOnly}</li>}
            {a.rig === 'yes' && <li>{t.result.rigItem}</li>}
            {a.imRoute && a.vaccine === 'yes' && <li>{t.result.imItem}</li>}
            <li>{t.result.tetanus}</li>
          </ul>
          {a.rig === 'yes' && (
            <>
              <p className="muted">{t.result.rigWhere}</p>
              <SourceLine cites={[RIG_WHERE_CITE]} />
            </>
          )}
        </section>
      )}

      <section className="section" aria-labelledby="why-title">
        <h2 id="why-title" className="section__title">
          {t.result.whyTitle}
        </h2>
        <ul className="reasons">
          {a.reasons.map((r) => (
            <li key={r.key}>
              <p>{t.result.reasons[r.key]}</p>
              <SourceLine cites={[r.cite]} />
            </li>
          ))}
        </ul>
      </section>

      <div className="actions">
        <a className="button button--big" href={href({ name: 'care', snake: false })}>
          <Hospital size={22} aria-hidden="true" />
          {t.result.findClinic}
        </a>
        {a.vaccine !== 'no' && (
          <button type="button" className="button button--quiet" onClick={props.onPlan}>
            <Plus size={20} aria-hidden="true" />
            {t.result.startPlan}
          </button>
        )}
        <button type="button" className="button button--quiet" onClick={props.onBack}>
          <ChevronLeft size={20} aria-hidden="true" />
          {t.common.back}
        </button>
        <button type="button" className="link-button" onClick={props.onRestart}>
          <RotateCcw size={16} aria-hidden="true" /> {t.result.again}
        </button>
      </div>
      <p className="disclaimer">{t.notDoctor}</p>
    </div>
  );
}
