// Messages by language. English ships in the main bundle; Tamil and Hindi load on demand (each
// is a large share of the download), and main.tsx loads the saved language before first paint.
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';
import { en, type Messages } from './en';

export type Lang = 'en' | 'ta' | 'hi';
export const LANGS: Lang[] = ['en', 'ta', 'hi'];
/** Each language's name in itself, for the switch (needed before its messages load). */
export const LANG_NAMES: Record<Lang, string> = { en: 'English', ta: 'தமிழ்', hi: 'हिन्दी' };
/** Intl locale for dates and numbers, and the speech synthesis language. */
export const LOCALE: Record<Lang, string> = { en: 'en-IN', ta: 'ta-IN', hi: 'hi-IN' };

const loaded: Partial<Record<Lang, Messages>> = { en };
const LOADERS: Record<Lang, () => Promise<Messages>> = {
  en: () => Promise.resolve(en),
  ta: () => import('./ta').then((m) => m.ta),
  hi: () => import('./hi').then((m) => m.hi),
};

export async function loadMessages(lang: Lang): Promise<Messages> {
  const m = loaded[lang] ?? (await LOADERS[lang]());
  loaded[lang] = m;
  return m;
}

const LangContext = createContext<{ lang: Lang; t: Messages }>({ lang: 'en', t: en });

/** Shows the requested language once its messages are in; until then, the last one shown. */
export function LangProvider({ lang, children }: { lang: Lang; children: ReactNode }) {
  const [shown, setShown] = useState<{ lang: Lang; t: Messages }>(() =>
    loaded[lang] ? { lang, t: loaded[lang] as Messages } : { lang: 'en', t: en },
  );
  useEffect(() => {
    if (shown.lang === lang) return;
    let alive = true;
    loadMessages(lang)
      .then((t) => alive && setShown({ lang, t }))
      .catch(() => undefined); // Offline before the language was ever loaded: keep the current one.
    return () => {
      alive = false;
    };
  }, [lang, shown.lang]);
  useEffect(() => {
    document.documentElement.lang = shown.lang;
  }, [shown.lang]);
  return <LangContext.Provider value={shown}>{children}</LangContext.Provider>;
}

export function useLang(): Lang {
  return useContext(LangContext).lang;
}

export function useT(): Messages {
  return useContext(LangContext).t;
}

export type { Messages };
