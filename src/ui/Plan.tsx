// One person's dose plan, drawn as the clinic's vaccination card: what is due and when, what the
// guideline says when a dose is late, the immunoglobulin window, the 10-day animal watch, and
// reminders that work without a server.
import { Archive, CalendarPlus, MessageCircle, MessageSquareText, QrCode, Trash2 } from 'lucide-react';
import { useState } from 'react';
import { PLAN_TIP_CITES } from '../data/cites';
import { googleCalendarUrl, toICS, type CalendarEvent } from '../engine/calendar';
import { addDays, daysBetween, type ISODate } from '../engine/dates';
import { assess } from '../engine/exposure';
import { markTaken, setClinicDate, setSkipped, unmarkTaken, viewCourse, type Course, type DoseView, type PlanAlert, type PlanView } from '../engine/plan';
import type { BiteCase } from '../engine/record';
import { REGIMENS } from '../engine/regimens';
import { recordCheck, viewWatch, WATCH_CITE, WATCH_DAYS, type AnimalStatus } from '../engine/watch';
import { useLang, useT, type Messages } from '../i18n';
import { dayDate, fullDate, hourLabel, shortDate } from '../lib/format';
import { downloadFile, smsUrl, whatsappUrl } from '../lib/share';
import { go, href } from '../state/route';
import { useStore } from '../state/store';
import { Stamp } from './art';
import { displayName, useToday } from './bits';
import { DateField, Notice, SourceLine, type Tone } from './controls';

const SEVERITY: Record<PlanAlert['kind'], number> = { lateMajor: 0, lateMinor: 1, lateLater: 2, rigWindow: 3, firstThreeBy: 4, complete: 5 };
const TONE: Record<PlanAlert['kind'], Tone> = { lateMajor: 'urgent', lateMinor: 'warn', lateLater: 'warn', rigWindow: 'warn', firstThreeBy: 'info', complete: 'done' };

function alertText(a: PlanAlert, t: Messages, lang: Parameters<typeof dayDate>[1]): string {
  switch (a.kind) {
    case 'firstThreeBy':
      return t.plan.alerts.firstThreeBy(dayDate(a.by, lang));
    case 'lateMinor':
      return t.plan.alerts.lateMinor(a.dose + 1, a.days);
    case 'lateMajor':
      return t.plan.alerts.lateMajor(a.dose + 1, a.days);
    case 'lateLater':
      return t.plan.alerts.lateLater(a.dose + 1, a.days);
    case 'rigWindow':
      return t.plan.alerts.rigWindow(dayDate(a.by, lang), a.daysLeft);
    case 'complete':
      return t.plan.alerts.complete(fullDate(a.on, lang));
  }
}

export function Plan({ id }: { id: string }) {
  const t = useT();
  const lang = useLang();
  const today = useToday();
  const { state, dispatch } = useStore();
  const c = state.cases.find((x) => x.id === id);
  const [editing, setEditing] = useState<number | null>(null);

  if (!c || !c.course) {
    return (
      <div className="page">
        <h1 className="page__title">{t.nav.doses}</h1>
        <p>{t.plan.notFound}</p>
        <a className="button button--quiet" href={href({ name: 'doses' })}>
          {t.common.back}
        </a>
      </div>
    );
  }

  const course = c.course;
  const update = (patch: Partial<BiteCase>) => dispatch({ type: 'updateCase', id: c.id, patch });
  const setCourse = (next: Course) => update({ course: next });
  const v = viewCourse(course, today, { rigNeeded: c.rigNeeded, rigGiven: !!c.rig });
  const reg = REGIMENS[course.regimen];
  const name = displayName(c, '');
  const category = c.answers ? assess(c.answers).category : null;
  const alerts = [...v.alerts].sort((a, b) => SEVERITY[a.kind] - SEVERITY[b.kind]);
  // A sick, dead or missing animal is the most important thing on the page, so it goes first.
  const watch = c.watch ? viewWatch(c.watch, today) : null;

  return (
    <div className="page plan">
      <header className="plan__head">
        <h1 className="page__title">{name ? t.plan.title(name) : t.plan.titleMe}</h1>
        <p className="plan__meta">
          {course.regimen !== 'prep' && <span>{t.plan.bitten(fullDate(c.date, lang))}</span>}
          {category && <span className="pill pill--quiet">{t.result.category(category)}</span>}
          <span className="pill pill--quiet">{t.plan.regimens[course.regimen].name}</span>
        </p>
      </header>

      {watch?.outcome === 'alert' && (
        <Notice tone="urgent">
          <p>{t.watch.alert(t.watch.status[watch.alertStatus ?? 'sick'], fullDate(watch.alertOn ?? today, lang))}</p>
          <SourceLine cites={[WATCH_CITE]} />
        </Notice>
      )}
      {alerts.map((a, i) => (
        <Notice key={`${a.kind}-${i}`} tone={TONE[a.kind]}>
          <p>{alertText(a, t, lang)}</p>
          {'cite' in a && <SourceLine cites={[a.cite]} />}
        </Notice>
      ))}

      <NextDose v={v} today={today} onTaken={(i) => setCourse(markTaken(course, i, today))} />

      <section className="vcard" aria-labelledby="vcard-title">
        <div className="vcard__band">
          <h2 id="vcard-title" className="vcard__title">
            {t.plan.cardTitle}
          </h2>
          <span className="vcard__who">{name || t.plan.nameFallback}</span>
        </div>
        <ol className="vcard__rows">
          {v.doses.map((d) => (
            <DoseRow
              key={d.index}
              d={d}
              total={v.doses.length}
              today={today}
              editing={editing === d.index}
              onEdit={() => setEditing(editing === d.index ? null : d.index)}
              onTaken={(on) => {
                setCourse(markTaken(course, d.index, on));
                setEditing(null);
              }}
              onUndo={() => setCourse(unmarkTaken(course, d.index))}
              onClinicDate={(on) => setCourse(setClinicDate(course, d.index, on))}
              onSkip={(skip) => {
                setCourse(setSkipped(course, d.index, skip));
                setEditing(null);
              }}
            />
          ))}
        </ol>
        <p className="vcard__foot">{t.plan.regimens[course.regimen].detail}</p>
      </section>
      <SourceLine cites={[reg.cite]} />

      {c.rigNeeded && <RigPanel c={c} today={today} onGiven={(on) => update({ rig: { on } })} onUndo={() => update({ rig: undefined })} />}

      <WatchPanel c={c} today={today} onChange={(watch) => update({ watch })} />

      <Reminders c={c} v={v} />

      <section className="section" aria-labelledby="tips-title">
        <h2 id="tips-title" className="section__title">
          {t.plan.tipsTitle}
        </h2>
        <ul className="reasons">
          {t.plan.tips.map((tip, i) => (
            <li key={tip}>
              <p>{tip}</p>
              <SourceLine cites={[PLAN_TIP_CITES[i]]} />
            </li>
          ))}
        </ul>
      </section>

      <div className="actions">
        <a className="button" href={href({ name: 'card', id: c.id })}>
          <QrCode size={20} aria-hidden="true" />
          {t.plan.showClinic}
        </a>
        <button type="button" className="button button--quiet" onClick={() => update({ archived: !c.archived })}>
          <Archive size={20} aria-hidden="true" />
          {c.archived ? t.plan.unarchive : t.plan.archive}
        </button>
        <button
          type="button"
          className="button button--quiet button--danger"
          onClick={() => {
            if (window.confirm(t.plan.deleteConfirm)) {
              dispatch({ type: 'removeCase', id: c.id });
              go({ name: 'doses' });
            }
          }}
        >
          <Trash2 size={20} aria-hidden="true" />
          {t.plan.deletePlan}
        </button>
      </div>
      <p className="disclaimer">{t.notDoctor}</p>
    </div>
  );
}

function NextDose({ v, today, onTaken }: { v: PlanView; today: ISODate; onTaken: (i: number) => void }) {
  const t = useT();
  const lang = useLang();
  const d = v.next;
  if (!d) return null;
  const rel = t.common.rel(daysBetween(today, d.dueOn));
  const dueNow = d.state === 'today' || d.state === 'late';
  return (
    <section className={`next next--${d.state}`} aria-label={t.plan.next(t.plan.dose(d.index + 1, v.doses.length), dayDate(d.dueOn, lang), rel)}>
      <p className="next__label">{t.plan.dose(d.index + 1, v.doses.length)}</p>
      <p className="next__date">{dayDate(d.dueOn, lang)}</p>
      <p className="next__rel">
        {d.state === 'late' ? t.plan.state.late(d.daysLate ?? 0) : d.state === 'today' ? t.plan.state.today : t.plan.state.upcoming(daysBetween(today, d.dueOn))}
        {d.dueBy && ` (${t.plan.dayRange(d.day, d.dayLatest ?? d.day)})`}
      </p>
      {dueNow && (
        <button type="button" className="button button--big" onClick={() => onTaken(d.index)}>
          {t.plan.markTaken}
        </button>
      )}
    </section>
  );
}

function DoseRow(props: {
  d: DoseView;
  total: number;
  today: ISODate;
  editing: boolean;
  onEdit: () => void;
  onTaken: (on: ISODate) => void;
  onUndo: () => void;
  onClinicDate: (on: ISODate | undefined) => void;
  onSkip: (skip: boolean) => void;
}) {
  const t = useT();
  const lang = useLang();
  const { d, today } = props;
  const [takenOn, setTakenOn] = useState<ISODate>(d.takenOn ?? today);
  const [clinic, setClinic] = useState<ISODate>(d.dueOn);
  const state =
    d.state === 'taken' ? t.plan.state.taken
    : d.state === 'skipped' ? t.plan.state.skipped
    : d.state === 'late' ? t.plan.state.late(d.daysLate ?? 0)
    : d.state === 'today' ? t.plan.state.today
    : t.plan.state.upcoming(daysBetween(today, d.dueOn));
  const editorId = `dose-edit-${d.index}`;

  return (
    <li className={`dose dose--${d.state}`}>
      <div className="dose__main">
        <p className="dose__n">{t.plan.dose(d.index + 1, props.total)}</p>
        <p className="dose__day">{d.dayLatest !== undefined ? t.plan.dayRange(d.day, d.dayLatest) : t.plan.day(d.day)}</p>
        <p className="dose__date">
          {dayDate(d.takenOn ?? d.dueOn, lang)}
          {d.clinicDate && !d.takenOn && <span className="tag">{t.plan.clinicDate}</span>}
        </p>
      </div>
      <div className="dose__status">
        {d.state === 'taken' && d.takenOn ? (
          <Stamp word={t.plan.stamp} date={shortDate(d.takenOn, lang)} />
        ) : (
          <span className={`pill pill--${d.state === 'late' ? 'warn' : d.state === 'today' ? 'due' : 'quiet'}`}>{state}</span>
        )}
        <button type="button" className="link-button dose__edit" aria-expanded={props.editing} aria-controls={editorId} onClick={props.onEdit}>
          {t.common.edit}
        </button>
      </div>
      {props.editing && (
        <div className="dose__editor" id={editorId}>
          {d.state === 'taken' ? (
            <button type="button" className="button button--quiet" onClick={props.onUndo}>
              {t.plan.undo}
            </button>
          ) : d.state === 'skipped' ? (
            <button type="button" className="button button--quiet" onClick={() => props.onSkip(false)}>
              {t.plan.unskip}
            </button>
          ) : (
            <>
              <div className="editor-row">
                <DateField label={t.plan.takenOnQ} value={takenOn} max={today} onChange={setTakenOn} />
                <button type="button" className="button" onClick={() => props.onTaken(takenOn)}>
                  {t.plan.markTaken}
                </button>
              </div>
              {d.index > 0 && (
                <div className="editor-row">
                  <DateField label={t.plan.changeDate} value={clinic} onChange={setClinic} />
                  <button type="button" className="button button--quiet" onClick={() => props.onClinicDate(clinic)}>
                    {t.common.save}
                  </button>
                  {d.clinicDate && (
                    <button type="button" className="link-button" onClick={() => props.onClinicDate(undefined)}>
                      {t.plan.useStandard}
                    </button>
                  )}
                </div>
              )}
              {d.index > 0 && <p className="field__help">{t.plan.clinicDateHelp}</p>}
              {d.index > 0 && (
                <button
                  type="button"
                  className="link-button link-button--quiet"
                  onClick={() => window.confirm(t.plan.skipConfirm) && props.onSkip(true)}
                >
                  {t.plan.skip}
                </button>
              )}
            </>
          )}
        </div>
      )}
    </li>
  );
}

function RigPanel(props: { c: BiteCase; today: ISODate; onGiven: (on: ISODate) => void; onUndo: () => void }) {
  const t = useT();
  const lang = useLang();
  const [on, setOn] = useState<ISODate>(props.today);
  return (
    <section className="section" aria-labelledby="rig-title">
      <h2 id="rig-title" className="section__title">
        {t.plan.rigQ}
      </h2>
      {props.c.rig ? (
        <p>
          {t.plan.rigOptions.given}: {fullDate(props.c.rig.on, lang)}{' '}
          <button type="button" className="link-button" onClick={props.onUndo}>
            {t.plan.undo}
          </button>
        </p>
      ) : (
        <div className="editor-row">
          <DateField label={t.plan.rigGivenOn} value={on} max={props.today} onChange={setOn} />
          <button type="button" className="button button--quiet" onClick={() => props.onGiven(on)}>
            {t.plan.rigOptions.given}
          </button>
        </div>
      )}
    </section>
  );
}

const STATUSES: AnimalStatus[] = ['well', 'sick', 'dead', 'missing'];

function WatchPanel({ c, today, onChange }: { c: BiteCase; today: ISODate; onChange: (w: BiteCase['watch']) => void }) {
  const t = useT();
  const lang = useLang();
  const animal = c.answers?.animal ?? c.animal;
  if (!c.watch) {
    // Offered only for a dog or cat, while the 10 days are not over.
    if ((animal !== 'dog' && animal !== 'cat') || daysBetween(c.date, today) > WATCH_DAYS) return null;
    return (
      <section className="section watch" aria-labelledby="watch-title">
        <h2 id="watch-title" className="section__title">
          {t.watch.title}
        </h2>
        <p className="section__lead">{t.watch.lead}</p>
        <button type="button" className="button button--quiet" onClick={() => onChange({ animal, from: c.date, checks: {} })}>
          {t.watch.start}
        </button>
        <SourceLine cites={[WATCH_CITE]} />
      </section>
    );
  }
  const w = viewWatch(c.watch, today);
  const record = (s: AnimalStatus) => onChange(recordCheck(c.watch!, today, s));
  return (
    <section className="section watch" aria-labelledby="watch-title">
      <h2 id="watch-title" className="section__title">
        {t.watch.title}
      </h2>
      <p className="section__lead">{t.watch.lead}</p>
      <ol className="watch__days" aria-hidden="true">
        {Array.from({ length: WATCH_DAYS + 1 }, (_, i) => {
          const d = addDays(c.watch!.from, i);
          const s = c.watch!.checks[d];
          return <li key={d} className={`watch__day${s ? ` watch__day--${s}` : ''}${d === today ? ' watch__day--today' : ''}`} title={shortDate(d, lang)} />;
        })}
      </ol>
      {w.outcome === 'watching' && w.day >= 0 && <p className="watch__count">{t.watch.day(Math.min(w.day, WATCH_DAYS))}</p>}
      {w.outcome === 'wellAfter10' && (
        <Notice tone="done">
          <p>{t.watch.wellAfter10}</p>
        </Notice>
      )}
      {w.outcome === 'unknown' && (
        <Notice tone="info">
          <p>{t.watch.unknown}</p>
        </Notice>
      )}
      {w.outcome === 'watching' && w.day >= 0 && (
        <fieldset className="question">
          <legend className="question__title">{t.watch.question}</legend>
          <div className="watch__options">
            {STATUSES.map((s) => (
              <button key={s} type="button" className={`chip chip--${s}`} aria-pressed={c.watch!.checks[today] === s} onClick={() => record(s)}>
                {t.watch.status[s]}
              </button>
            ))}
          </div>
          {!w.checkDue && <p className="muted">{t.watch.recorded}</p>}
        </fieldset>
      )}
      <SourceLine cites={[WATCH_CITE]} />
    </section>
  );
}

function Reminders({ c, v }: { c: BiteCase; v: PlanView }) {
  const t = useT();
  const lang = useLang();
  const { state, dispatch } = useStore();
  const hour = state.prefs.remindHour;
  const name = c.name.trim();
  const pending = v.doses.filter((d) => d.state !== 'taken' && d.state !== 'skipped');
  if (pending.length === 0) return null;
  const events: CalendarEvent[] = pending.map((d) => ({
    uid: `${c.id}-dose${d.index + 1}@uyir`,
    date: d.dueOn,
    hour,
    durationMin: 60,
    title: t.remind.eventTitle(d.index + 1, v.doses.length, name),
    description: t.remind.eventBody,
  }));
  const shareText = [t.remind.shareHead(name), ...pending.map((d) => t.remind.shareLine(d.index + 1, fullDate(d.dueOn, lang))), t.remind.shareFoot].join('\n');

  return (
    <section className="section reminders" aria-labelledby="remind-title">
      <h2 id="remind-title" className="section__title">
        {t.remind.title}
      </h2>
      <p className="section__lead">{t.remind.lead}</p>
      <label className="field field--inline">
        <span className="field__label">{t.remind.hourQ}</span>
        <select className="input select" value={hour} onChange={(e) => dispatch({ type: 'setPrefs', patch: { remindHour: Number(e.target.value) } })}>
          {Array.from({ length: 16 }, (_, i) => i + 6).map((h) => (
            <option key={h} value={h}>
              {hourLabel(h, lang)}
            </option>
          ))}
        </select>
      </label>
      <button
        type="button"
        className="button"
        onClick={() => downloadFile(`uyir-${name ? name.replace(/[^\p{L}\p{N}]+/gu, '-').toLowerCase() : 'doses'}.ics`, 'text/calendar;charset=utf-8', toICS(events, new Date()))}
      >
        <CalendarPlus size={20} aria-hidden="true" />
        {t.remind.ics}
      </button>
      <p className="field__help">{t.remind.icsHelp}</p>
      <div className="share-row">
        <a className="button button--quiet" href={whatsappUrl(shareText)} target="_blank" rel="noopener noreferrer">
          <MessageCircle size={20} aria-hidden="true" />
          {t.remind.whatsapp}
        </a>
        <a className="button button--quiet" href={smsUrl(shareText)}>
          <MessageSquareText size={20} aria-hidden="true" />
          {t.remind.sms}
        </a>
      </div>
      <p className="field__help">{t.remind.shareHelp}</p>
      <ul className="gcal">
        {events.map((e, i) => (
          <li key={e.uid}>
            <a href={googleCalendarUrl(e)} target="_blank" rel="noopener noreferrer">
              {t.remind.google}: {t.plan.dose(pending[i].index + 1, v.doses.length)}, {dayDate(e.date, lang)}
            </a>
          </li>
        ))}
      </ul>
    </section>
  );
}
