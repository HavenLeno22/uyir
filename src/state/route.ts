// Hash routes, so the app works from any static host and offline.
import { useEffect, useState } from 'react';

export type Route =
  | { name: 'home' }
  | { name: 'bite' }
  | { name: 'snake' }
  | { name: 'check' }
  | { name: 'doses' }
  | { name: 'planNew' }
  | { name: 'plan'; id: string }
  | { name: 'card'; id: string }
  | { name: 'care'; snake: boolean }
  | { name: 'learn' };

export function parseHash(hash: string): Route {
  const parts = hash.replace(/^#\/?/, '').split('?')[0].split('/').filter(Boolean);
  const query = hash.includes('?') ? new URLSearchParams(hash.split('?')[1]) : null;
  switch (parts[0]) {
    case 'bite':
      return { name: 'bite' };
    case 'snake':
      return { name: 'snake' };
    case 'check':
      return { name: 'check' };
    case 'doses':
      return { name: 'doses' };
    case 'plan':
      return parts[1] === 'new' || !parts[1] ? { name: 'planNew' } : { name: 'plan', id: parts[1] };
    case 'card':
      return parts[1] ? { name: 'card', id: parts[1] } : { name: 'doses' };
    case 'care':
      return { name: 'care', snake: query?.get('for') === 'snake' };
    case 'learn':
      return { name: 'learn' };
    default:
      return { name: 'home' };
  }
}

export function href(r: Route): string {
  switch (r.name) {
    case 'home':
      return '#/';
    case 'plan':
      return `#/plan/${r.id}`;
    case 'card':
      return `#/card/${r.id}`;
    case 'planNew':
      return '#/plan/new';
    case 'care':
      return r.snake ? '#/care?for=snake' : '#/care';
    default:
      return `#/${r.name}`;
  }
}

export function go(r: Route): void {
  window.location.hash = href(r);
}

export function useRoute(): Route {
  const [route, setRoute] = useState(() => parseHash(window.location.hash));
  useEffect(() => {
    const on = () => {
      setRoute(parseHash(window.location.hash));
      window.scrollTo(0, 0);
    };
    window.addEventListener('hashchange', on);
    return () => window.removeEventListener('hashchange', on);
  }, []);
  return route;
}
