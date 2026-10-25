import { lazy, Suspense, useEffect, useRef } from 'react';
import { LangProvider } from './i18n';
import { useRoute } from './state/route';
import { useStore } from './state/store';
import { Doses } from './ui/Doses';
import { ErrorBoundary } from './ui/ErrorBoundary';
import { Home } from './ui/Home';
import { Shell } from './ui/Shell';
import { Snake } from './ui/Snake';
import { Wash } from './ui/Wash';

// The emergency screens (home, wash timer, snakebite) are in the first download. The rest load
// when opened; the service worker caches them all after the first visit.
const Check = lazy(() => import('./ui/Check').then((m) => ({ default: m.Check })));
const PlanNew = lazy(() => import('./ui/PlanNew').then((m) => ({ default: m.PlanNew })));
const Plan = lazy(() => import('./ui/Plan').then((m) => ({ default: m.Plan })));
const Card = lazy(() => import('./ui/Card').then((m) => ({ default: m.Card })));
const Care = lazy(() => import('./ui/Care').then((m) => ({ default: m.Care })));
const Learn = lazy(() => import('./ui/Learn').then((m) => ({ default: m.Learn })));

export function App() {
  const { state } = useStore();
  const route = useRoute();
  const { lang, theme } = state.prefs;
  const first = useRef(true);

  useEffect(() => {
    if (theme === 'system') delete document.documentElement.dataset.theme;
    else document.documentElement.dataset.theme = theme;
  }, [theme]);

  // After a route change, move focus to the new page's heading so screen readers announce it.
  const routeKey = JSON.stringify(route);
  useEffect(() => {
    if (first.current) {
      first.current = false;
      return;
    }
    const focusHeading = () => {
      const h = document.querySelector<HTMLElement>('main h1');
      if (!h) return false;
      h.tabIndex = -1;
      h.focus({ preventScroll: true });
      return true;
    };
    // A lazily loaded page may not have rendered its heading yet.
    if (!focusHeading()) {
      const id = window.setTimeout(focusHeading, 300);
      return () => window.clearTimeout(id);
    }
  }, [routeKey]);

  let page;
  switch (route.name) {
    case 'bite':
      page = <Wash />;
      break;
    case 'snake':
      page = <Snake />;
      break;
    case 'check':
      page = <Check />;
      break;
    case 'doses':
      page = <Doses />;
      break;
    case 'planNew':
      page = <PlanNew />;
      break;
    case 'plan':
      page = <Plan id={route.id} />;
      break;
    case 'card':
      page = <Card id={route.id} />;
      break;
    case 'care':
      page = <Care snake={route.snake} />;
      break;
    case 'learn':
      page = <Learn />;
      break;
    default:
      page = <Home />;
  }

  return (
    <LangProvider lang={lang}>
      <Shell route={route}>
        <ErrorBoundary resetKey={routeKey}>
          <Suspense fallback={<div className="page-loading" aria-busy="true" />}>{page}</Suspense>
        </ErrorBoundary>
      </Shell>
    </LangProvider>
  );
}
