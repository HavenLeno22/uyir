// Page frame: brand and language switch on top, tabs at the bottom on phones (in the header on
// wide screens), an offline line, and a skip link.
import { BookOpen, Hospital, House, Syringe } from 'lucide-react';
import { useEffect, useState, type ReactNode } from 'react';
import { LANG_NAMES, LANGS, useLang, useT, type Lang } from '../i18n';
import { href, type Route } from '../state/route';
import { useStore } from '../state/store';
import { Logo } from './art';

const SHORT: Record<Lang, string> = { en: 'EN', ta: 'த', hi: 'हि' };

function tabOf(r: Route): 'home' | 'doses' | 'care' | 'learn' {
  switch (r.name) {
    case 'doses':
    case 'plan':
    case 'planNew':
    case 'card':
      return 'doses';
    case 'care':
      return 'care';
    case 'learn':
      return 'learn';
    default:
      return 'home';
  }
}

function useOnline(): boolean {
  const [online, setOnline] = useState(() => (typeof navigator === 'undefined' ? true : navigator.onLine));
  useEffect(() => {
    const on = () => setOnline(true);
    const off = () => setOnline(false);
    window.addEventListener('online', on);
    window.addEventListener('offline', off);
    return () => {
      window.removeEventListener('online', on);
      window.removeEventListener('offline', off);
    };
  }, []);
  return online;
}

export function Shell({ route, children }: { route: Route; children: ReactNode }) {
  const t = useT();
  const shownLang = useLang();
  const { state, dispatch } = useStore();
  // The switch shows the choice at once, even while that language is still loading.
  const lang = state.prefs.lang ?? shownLang;
  const online = useOnline();
  const tab = tabOf(route);
  const tabs = [
    { key: 'home', label: t.nav.home, icon: House, to: href({ name: 'home' }) },
    { key: 'doses', label: t.nav.doses, icon: Syringe, to: href({ name: 'doses' }) },
    { key: 'care', label: t.nav.care, icon: Hospital, to: href({ name: 'care', snake: false }) },
    { key: 'learn', label: t.nav.learn, icon: BookOpen, to: href({ name: 'learn' }) },
  ] as const;

  return (
    <div className="app">
      <a
        className="skip-link"
        href="#main"
        onClick={(e) => {
          // Move focus without changing the hash, which is the router.
          e.preventDefault();
          document.getElementById('main')?.focus();
        }}
      >
        {t.skipToContent}
      </a>
      <header className="topbar">
        <a className="brand" href={href({ name: 'home' })}>
          <Logo />
          <span className="brand__name">Uyir</span>
          <span className="brand__native" lang="ta">
            உயிர்
          </span>
        </a>
        <nav className="tabbar" aria-label={t.appName}>
          {tabs.map(({ key, label, icon: Icon, to }) => (
            <a key={key} className="tabbar__tab" href={to} aria-current={tab === key ? 'page' : undefined}>
              <Icon size={22} aria-hidden="true" />
              <span>{label}</span>
            </a>
          ))}
        </nav>
        <div className="langs" role="group" aria-label={t.common.language}>
          {LANGS.map((l) => (
            <button
              key={l}
              type="button"
              className="langs__option"
              lang={l}
              aria-pressed={l === lang}
              aria-label={LANG_NAMES[l]}
              title={LANG_NAMES[l]}
              onClick={() => dispatch({ type: 'setPrefs', patch: { lang: l } })}
            >
              {SHORT[l]}
            </button>
          ))}
        </div>
      </header>
      {!online && (
        <p className="offline" role="status">
          {t.offline}
        </p>
      )}
      <main id="main" className="main" tabIndex={-1}>
        {children}
      </main>
    </div>
  );
}
