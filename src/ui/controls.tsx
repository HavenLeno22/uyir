// Small shared controls, styled in app.css. All keyboard accessible.
import { CircleAlert, CircleCheck, Info, TriangleAlert } from 'lucide-react';
import { Fragment, useId, type KeyboardEvent, type ReactNode } from 'react';
import { SOURCES, type Cite } from '../data/sources';
import { useT } from '../i18n';

/**
 * ARIA radio group keyboard pattern: the group is one Tab stop (the checked option, or the first
 * when none is), and arrow keys, Home and End move focus and select, as native radios do.
 */
export function radioKeys<T>(values: T[], value: T | null, onChange: (v: T) => void) {
  const current = value === null ? -1 : values.indexOf(value);
  const focusable = current === -1 ? 0 : current;
  return {
    tabIndex: (i: number) => (i === focusable ? 0 : -1),
    onKeyDown: (e: KeyboardEvent<HTMLElement>) => {
      const n = values.length;
      const next =
        e.key === 'ArrowRight' || e.key === 'ArrowDown' ? (focusable + 1) % n
        : e.key === 'ArrowLeft' || e.key === 'ArrowUp' ? (focusable - 1 + n) % n
        : e.key === 'Home' ? 0
        : e.key === 'End' ? n - 1
        : null;
      if (next === null) return;
      e.preventDefault();
      onChange(values[next]);
      const group = e.currentTarget.closest('[role="radiogroup"]');
      group?.querySelectorAll<HTMLElement>('[role="radio"]')[next]?.focus();
    },
  };
}

/** A row of options; one is chosen. */
export function Segmented<T extends string>(props: {
  label: string;
  value: T | null;
  options: { value: T; label: ReactNode }[];
  onChange: (v: T) => void;
  hideLabel?: boolean;
  stack?: boolean;
}) {
  const id = useId();
  const keys = radioKeys(
    props.options.map((o) => o.value),
    props.value,
    props.onChange,
  );
  return (
    <div className={`field segmented${props.stack ? ' segmented--stack' : ''}`} role="radiogroup" aria-labelledby={id}>
      <span id={id} className={props.hideLabel ? 'visually-hidden' : 'field__label'}>
        {props.label}
      </span>
      <div className="segmented__options">
        {props.options.map((o, i) => (
          <button
            key={o.value}
            type="button"
            role="radio"
            aria-checked={o.value === props.value}
            tabIndex={keys.tabIndex(i)}
            onKeyDown={keys.onKeyDown}
            className="segmented__option"
            onClick={() => props.onChange(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

/** Big tiles with an icon; one is chosen. */
export function ChoiceGrid<T extends string>(props: {
  label: string;
  value: T | null;
  options: { value: T; label: string; icon?: ReactNode }[];
  onChange: (v: T) => void;
}) {
  const id = useId();
  const keys = radioKeys(
    props.options.map((o) => o.value),
    props.value,
    props.onChange,
  );
  return (
    <div className="choice-grid" role="radiogroup" aria-labelledby={id}>
      <span id={id} className="visually-hidden">
        {props.label}
      </span>
      {props.options.map((o, i) => (
        <button
          key={o.value}
          type="button"
          role="radio"
          aria-checked={o.value === props.value}
          tabIndex={keys.tabIndex(i)}
          onKeyDown={keys.onKeyDown}
          className="choice"
          onClick={() => props.onChange(o.value)}
        >
          {o.icon && <span className="choice__icon">{o.icon}</span>}
          <span className="choice__label">{o.label}</span>
        </button>
      ))}
    </div>
  );
}

/** Options that can each be on or off. */
export function Chips<T extends string>(props: {
  label: string;
  values: T[];
  options: { value: T; label: string }[];
  onChange: (v: T[]) => void;
  hideLabel?: boolean;
}) {
  const id = useId();
  const toggle = (v: T) => props.onChange(props.values.includes(v) ? props.values.filter((x) => x !== v) : [...props.values, v]);
  return (
    <div className="field" role="group" aria-labelledby={id}>
      <span id={id} className={props.hideLabel ? 'visually-hidden' : 'field__label'}>
        {props.label}
      </span>
      <div className="chips">
        {props.options.map((o) => (
          <button
            key={o.value}
            type="button"
            className="chip"
            aria-pressed={props.values.includes(o.value)}
            onClick={() => toggle(o.value)}
          >
            {o.label}
          </button>
        ))}
      </div>
    </div>
  );
}

export function YesNo(props: { label: string; value: boolean | null; onChange: (v: boolean) => void }) {
  const t = useT();
  return (
    <Segmented
      label={props.label}
      value={props.value === null ? null : props.value ? 'yes' : 'no'}
      options={[
        { value: 'yes', label: t.common.yes },
        { value: 'no', label: t.common.no },
      ]}
      onChange={(v) => props.onChange(v === 'yes')}
    />
  );
}

export function DateField(props: { label: string; value: string; onChange: (v: string) => void; max?: string; min?: string; hideLabel?: boolean }) {
  const id = useId();
  return (
    <div className="field">
      <label className={props.hideLabel ? 'visually-hidden' : 'field__label'} htmlFor={id}>
        {props.label}
      </label>
      <input
        id={id}
        className="input input--date"
        type="date"
        value={props.value}
        max={props.max}
        min={props.min}
        onChange={(e) => e.target.value && props.onChange(e.target.value)}
      />
    </div>
  );
}

export type Tone = 'urgent' | 'warn' | 'info' | 'done';
const TONE_ICON = { urgent: CircleAlert, warn: TriangleAlert, info: Info, done: CircleCheck };

/** A message with an icon; urgent ones are announced. */
export function Notice(props: { tone: Tone; children: ReactNode; title?: ReactNode }) {
  const Icon = TONE_ICON[props.tone];
  return (
    <div className={`notice notice--${props.tone}`} role={props.tone === 'urgent' ? 'alert' : undefined}>
      <Icon className="notice__icon" size={22} aria-hidden="true" />
      <div className="notice__body">
        {props.title && <p className="notice__title">{props.title}</p>}
        {props.children}
      </div>
    </div>
  );
}

/** "Source: …" under a medical statement, linking to the document. */
export function SourceLine({ cites }: { cites: Cite[] }) {
  const t = useT();
  return (
    <p className="source">
      {t.common.source}:{' '}
      {cites.map((c, i) => {
        const s = SOURCES[c.source];
        const where = [c.section && t.common.section(c.section), c.page && t.common.page(c.page)].filter(Boolean).join(', ');
        return (
          <Fragment key={i}>
            {i > 0 && '; '}
            <a href={s.url} target="_blank" rel="noopener noreferrer">
              {t.common.sourceOf(s.short, where)}
            </a>
          </Fragment>
        );
      })}
    </p>
  );
}
