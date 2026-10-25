import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App';
import { loadMessages } from './i18n';
import { loadState, StoreProvider } from './state/store';
import './styles/tokens.css';
import './styles/app.css';

const initial = loadState();

// Load the saved language before the first paint, so the page never flashes in English.
loadMessages(initial.prefs.lang)
  .catch(() => undefined)
  .finally(() => {
    createRoot(document.getElementById('root') as HTMLElement).render(
      <StrictMode>
        <StoreProvider initial={initial}>
          <App />
        </StoreProvider>
      </StrictMode>,
    );
  });

// Offline support. Only in production builds, so development always shows fresh code.
if (import.meta.env.PROD && 'serviceWorker' in navigator) {
  window.addEventListener('load', () => {
    navigator.serviceWorker.register('./sw.js').catch(() => {
      // Without a service worker the app still works online.
    });
  });
}
