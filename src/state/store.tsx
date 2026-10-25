// App state: bite records with their dose plans, preferences, and the in-progress check and
// wash timer. Everything lives in this browser only (localStorage).
import { createContext, useContext, useEffect, useReducer, type Dispatch, type ReactNode } from 'react';
import { isISODate, type ISODate } from '../engine/dates';
import type { ExposureAnswers } from '../engine/exposure';
import { REGIMENS } from '../engine/regimens';
import type { BiteCase } from '../engine/record';
import type { Lang } from '../i18n';

export type Theme = 'system' | 'light' | 'dark';

export interface Prefs {
  lang: Lang;
  theme: Theme;
  voice: boolean;
  /** Hour of the day for calendar reminders. */
  remindHour: number;
}

/** The answers from "What will the clinic do?", carried into a new plan. */
export interface Draft {
  answers: ExposureAnswers;
  date: ISODate;
}

/** The wash timer, kept here so it survives the phone locking or the tab reloading. */
export interface WashTimer {
  startedAt: number;
  /** Set while paused. */
  pausedAt: number | null;
  pausedMs: number;
}

export interface AppState {
  cases: BiteCase[];
  prefs: Prefs;
  draft: Draft | null;
  wash: WashTimer | null;
  /** The last finished wash, so a plan made afterwards can record it. */
  lastWash: { minutes: number; on: ISODate } | null;
}

export type Action =
  | { type: 'addCase'; c: BiteCase }
  | { type: 'updateCase'; id: string; patch: Partial<BiteCase> }
  | { type: 'removeCase'; id: string }
  | { type: 'importCases'; cases: BiteCase[] }
  | { type: 'setPrefs'; patch: Partial<Prefs> }
  | { type: 'setDraft'; draft: Draft | null }
  | { type: 'setWash'; wash: WashTimer | null }
  | { type: 'setLastWash'; lastWash: AppState['lastWash'] };

const KEY = 'uyir:v1';

function guessLang(): Lang {
  const l = (typeof navigator !== 'undefined' ? navigator.language : 'en').toLowerCase();
  if (l.startsWith('ta')) return 'ta';
  if (l.startsWith('hi')) return 'hi';
  return 'en';
}

export function defaultState(): AppState {
  return { cases: [], prefs: { lang: guessLang(), theme: 'system', voice: true, remindHour: 9 }, draft: null, wash: null, lastWash: null };
}

/** A stored or imported record is used only if its shape is right; bad entries are dropped. */
export function validCase(c: unknown): c is BiteCase {
  if (!c || typeof c !== 'object') return false;
  const x = c as Partial<BiteCase>;
  if (typeof x.id !== 'string' || typeof x.name !== 'string' || !isISODate(x.date) || !Array.isArray(x.sites)) return false;
  if (x.kind !== 'animal' && x.kind !== 'snake') return false;
  if (x.course) {
    const reg = REGIMENS[x.course.regimen];
    if (!reg || !isISODate(x.course.firstDose) || !Array.isArray(x.course.doses) || x.course.doses.length !== reg.days.length) return false;
  }
  return true;
}

export function loadState(): AppState {
  const base = defaultState();
  try {
    const raw = localStorage.getItem(KEY);
    if (!raw) return base;
    const parsed = JSON.parse(raw) as Partial<AppState>;
    return {
      cases: Array.isArray(parsed.cases) ? parsed.cases.filter(validCase) : [],
      prefs: { ...base.prefs, ...(parsed.prefs ?? {}) },
      draft: parsed.draft ?? null,
      wash: parsed.wash ?? null,
      lastWash: parsed.lastWash ?? null,
    };
  } catch {
    return base;
  }
}

function save(s: AppState): void {
  try {
    localStorage.setItem(KEY, JSON.stringify(s));
  } catch {
    // Storage full or blocked (private mode): the app still works for this visit.
  }
}

function reducer(s: AppState, a: Action): AppState {
  switch (a.type) {
    case 'addCase':
      return { ...s, cases: [...s.cases, a.c] };
    case 'updateCase':
      return { ...s, cases: s.cases.map((c) => (c.id === a.id ? { ...c, ...a.patch } : c)) };
    case 'removeCase':
      return { ...s, cases: s.cases.filter((c) => c.id !== a.id) };
    case 'importCases': {
      const ids = new Set(a.cases.map((c) => c.id));
      return { ...s, cases: [...s.cases.filter((c) => !ids.has(c.id)), ...a.cases] };
    }
    case 'setPrefs':
      return { ...s, prefs: { ...s.prefs, ...a.patch } };
    case 'setDraft':
      return { ...s, draft: a.draft };
    case 'setWash':
      return { ...s, wash: a.wash };
    case 'setLastWash':
      return { ...s, lastWash: a.lastWash };
  }
}

const StoreContext = createContext<{ state: AppState; dispatch: Dispatch<Action> } | null>(null);

export function StoreProvider({ children, initial }: { children: ReactNode; initial?: AppState }) {
  const [state, dispatch] = useReducer(reducer, initial ?? null, (i) => i ?? loadState());
  useEffect(() => save(state), [state]);
  return <StoreContext.Provider value={{ state, dispatch }}>{children}</StoreContext.Provider>;
}

export function useStore() {
  const ctx = useContext(StoreContext);
  if (!ctx) throw new Error('useStore outside StoreProvider');
  return ctx;
}

export function newId(): string {
  return typeof crypto !== 'undefined' && 'randomUUID' in crypto
    ? crypto.randomUUID().slice(0, 8)
    : Math.random().toString(36).slice(2, 10);
}
