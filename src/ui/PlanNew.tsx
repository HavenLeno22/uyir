// Starting a dose plan: who, the bite, which schedule the clinic used, the first dose, and the
// immunoglobulin and animal-watch details that change what the plan screen shows.
import { useId, useState } from 'react';
import { daysBetween, today as todayOf, type ISODate } from '../engine/dates';
import { assess, type Animal } from '../engine/exposure';
import { markTaken, newCourse } from '../engine/plan';
import type { BiteCase, BodySite } from '../engine/record';
import { REGIMENS, REGIMEN_IDS, type RegimenId } from '../engine/regimens';
import { useT } from '../i18n';
import { go } from '../state/route';
import { newId, useStore } from '../state/store';
import { Chips, DateField, radioKeys, Segmented, YesNo } from './controls';

const ANIMALS: Animal[] = ['dog', 'cat', 'monkey', 'livestock', 'wild', 'rodent', 'other'];
const SITES: BodySite[] = ['limbs', 'trunk', 'headNeckFace', 'back'];
type RigMode = 'given' | 'needed' | 'notNeeded' | 'unsure';

export function PlanNew() {
  const t = useT();
  const { state, dispatch } = useStore();
  const draft = state.draft;
  const today = todayOf();
  const assessed = draft ? assess(draft.answers) : null;
  const nameId = useId();
  const ageId = useId();
  const animalId = useId();

  const [name, setName] = useState('');
  const [age, setAge] = useState('');
  const [biteDate, setBiteDate] = useState<ISODate>(draft?.date ?? today);
  const [animal, setAnimal] = useState<Animal>(draft?.answers.animal ?? 'dog');
  const [sites, setSites] = useState<BodySite[]>([]);
  const [regimen, setRegimen] = useState<RegimenId>(
    assessed?.course === 'reexposure' ? 'reexposure' : assessed?.imRoute ? 'pep-im' : 'pep-id',
  );
  const [firstMode, setFirstMode] = useState<'taken' | 'planned'>('taken');
  const [firstDate, setFirstDate] = useState<ISODate>(today);
  const [rigMode, setRigMode] = useState<RigMode | null>(assessed ? (assessed.rig === 'yes' ? 'needed' : 'notNeeded') : null);
  const [rigDate, setRigDate] = useState<ISODate>(today);
  const [watch, setWatch] = useState<boolean | null>(null);

  const regimenKeys = radioKeys(REGIMEN_IDS, regimen, setRegimen);
  const prep = regimen === 'prep';
  const pep = regimen === 'pep-id' || regimen === 'pep-im';
  const dogOrCat = !prep && (animal === 'dog' || animal === 'cat');
  const dateProblem = !prep && firstMode === 'taken' && firstDate < biteDate;

  const save = () => {
    const id = newId();
    const day0 = firstDate;
    let course = newCourse(regimen, day0);
    if (firstMode === 'taken') course = markTaken(course, 0, day0);
    const recentWash = state.lastWash && Math.abs(daysBetween(state.lastWash.on, biteDate)) <= 1 ? state.lastWash.minutes : undefined;
    const c: BiteCase = {
      id,
      name: name.trim(),
      age: age.trim() && Number.isFinite(Number(age)) ? Math.round(Number(age)) : undefined,
      kind: 'animal',
      date: prep ? day0 : biteDate,
      animal: prep ? undefined : animal,
      answers: !prep && draft ? { ...draft.answers, animal } : undefined,
      sites: prep ? [] : sites,
      washedMinutes: prep ? undefined : recentWash,
      rig: pep && rigMode === 'given' ? { on: rigDate } : undefined,
      rigNeeded: pep && (rigMode === 'needed' || rigMode === 'given'),
      course,
      watch: dogOrCat && watch ? { animal: animal as 'dog' | 'cat', from: biteDate, checks: {} } : undefined,
    };
    dispatch({ type: 'addCase', c });
    dispatch({ type: 'setDraft', draft: null });
    go({ name: 'plan', id });
  };

  return (
    <div className="page plan-new">
      <h1 className="page__title">{t.plan.newTitle}</h1>

      <div className="field">
        <label className="field__label" htmlFor={nameId}>
          {t.plan.whoQ}
        </label>
        <input id={nameId} className="input" value={name} placeholder={t.plan.whoPlaceholder} onChange={(e) => setName(e.target.value)} autoComplete="off" />
      </div>
      <div className="field field--narrow">
        <label className="field__label" htmlFor={ageId}>
          {t.plan.ageQ}
        </label>
        <input id={ageId} className="input" inputMode="numeric" value={age} onChange={(e) => setAge(e.target.value.replace(/[^\d]/g, '').slice(0, 3))} />
      </div>

      <fieldset className="question">
        <legend className="question__title">{t.plan.regimenQ}</legend>
        <p className="field__help">{t.plan.regimenHelp}</p>
        <div className="regimens" role="radiogroup" aria-label={t.plan.regimenQ}>
          {REGIMEN_IDS.map((r, i) => (
            <button
              key={r}
              type="button"
              role="radio"
              aria-checked={regimen === r}
              tabIndex={regimenKeys.tabIndex(i)}
              onKeyDown={regimenKeys.onKeyDown}
              className="regimen"
              onClick={() => setRegimen(r)}
            >
              <span className="regimen__name">{t.plan.regimens[r].name}</span>
              <span className="regimen__detail">{t.plan.regimens[r].detail}</span>
              <span className="regimen__days" aria-hidden="true">
                {REGIMENS[r].days.map((d) => (
                  <span key={d} className="regimen__day">
                    {d}
                  </span>
                ))}
              </span>
            </button>
          ))}
        </div>
      </fieldset>

      {!prep && (
        <>
          <DateField label={t.plan.biteDateQ} value={biteDate} max={today} onChange={setBiteDate} />
          <div className="field">
            <label className="field__label" htmlFor={animalId}>
              {t.check.animalQ}
            </label>
            <select id={animalId} className="input select" value={animal} onChange={(e) => setAnimal(e.target.value as Animal)}>
              {ANIMALS.map((a) => (
                <option key={a} value={a}>
                  {t.check.animals[a]}
                </option>
              ))}
            </select>
          </div>
          <Chips label={t.plan.siteQ} values={sites} options={SITES.map((s) => ({ value: s, label: t.plan.sites[s] }))} onChange={setSites} />
        </>
      )}

      <fieldset className="question">
        <legend className="question__title">{t.plan.firstDoseQ}</legend>
        <Segmented
          label={t.plan.firstDoseQ}
          hideLabel
          value={firstMode}
          options={[
            { value: 'taken', label: t.plan.firstDoseTaken },
            { value: 'planned', label: t.plan.firstDoseNotYet },
          ]}
          onChange={setFirstMode}
        />
        <DateField
          label={firstMode === 'taken' ? t.plan.firstDoseTaken : t.plan.firstDoseNotYet}
          hideLabel
          value={firstDate}
          max={firstMode === 'taken' ? today : undefined}
          min={firstMode === 'planned' ? today : undefined}
          onChange={setFirstDate}
        />
      </fieldset>

      {pep && (
        <fieldset className="question">
          <legend className="question__title">{t.plan.rigQ}</legend>
          <Segmented
            label={t.plan.rigQ}
            hideLabel
            stack
            value={rigMode}
            options={(['given', 'needed', 'notNeeded', 'unsure'] as const).map((v) => ({ value: v, label: t.plan.rigOptions[v] }))}
            onChange={setRigMode}
          />
          {rigMode === 'given' && <DateField label={t.plan.rigGivenOn} value={rigDate} max={today} onChange={setRigDate} />}
        </fieldset>
      )}

      {dogOrCat && (
        <div className="question">
          <YesNo label={t.plan.watchQ} value={watch} onChange={setWatch} />
          <p className="field__help">{t.plan.watchHelp}</p>
        </div>
      )}

      <div className="actions">
        <button type="button" className="button button--big" onClick={save} disabled={dateProblem}>
          {t.plan.create}
        </button>
      </div>
    </div>
  );
}
