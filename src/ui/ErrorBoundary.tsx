// If a screen fails to load or crashes, say so and offer a way out, instead of a blank page.
// The emergency screens are in the main bundle, so this mostly covers a screen that loads on
// demand while the phone is offline before the app was ever cached.
import { Component, type ReactNode } from 'react';
import { useT } from '../i18n';
import { Notice } from './controls';

function Fallback() {
  const t = useT();
  return (
    <div className="page">
      <Notice tone="warn">
        <p>{t.common.loadError}</p>
      </Notice>
      <div className="actions">
        <button type="button" className="button" onClick={() => window.location.reload()}>
          {t.care.retry}
        </button>
        <a className="button button--quiet" href="#/" onClick={() => window.setTimeout(() => window.location.reload(), 0)}>
          {t.nav.home}
        </a>
      </div>
    </div>
  );
}

export class ErrorBoundary extends Component<{ resetKey: string; children: ReactNode }, { failed: boolean; key: string }> {
  state = { failed: false, key: this.props.resetKey };

  static getDerivedStateFromError() {
    return { failed: true };
  }

  static getDerivedStateFromProps(props: { resetKey: string }, state: { failed: boolean; key: string }) {
    // Moving to another screen clears the error.
    return props.resetKey !== state.key ? { failed: false, key: props.resetKey } : null;
  }

  render() {
    return this.state.failed ? <Fallback /> : this.props.children;
  }
}
