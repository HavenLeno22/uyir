// The bite record for the clinic: the government register's fields as text and as a QR code
// that any phone camera reads. Printable.
import { Copy, Printer } from 'lucide-react';
import { useMemo, useState } from 'react';
import { recordText } from '../engine/record';
import { useT } from '../i18n';
import { qrPath } from '../lib/qr';
import { href } from '../state/route';
import { useStore } from '../state/store';
import { useToday } from './bits';

export function Card({ id }: { id: string }) {
  const t = useT();
  const today = useToday();
  const { state } = useStore();
  const c = state.cases.find((x) => x.id === id);
  const [copied, setCopied] = useState(false);
  const text = c ? recordText(c, today) : '';
  const qr = useMemo(() => (text ? qrPath(text) : null), [text]);

  if (!c || !qr) {
    return (
      <div className="page">
        <h1 className="page__title">{t.card.title}</h1>
        <p>{t.plan.notFound}</p>
      </div>
    );
  }

  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      window.setTimeout(() => setCopied(false), 2500);
    } catch {
      // Clipboard blocked (plain http, or permission refused): the text is on screen to copy by hand.
    }
  };

  return (
    <div className="page card-page">
      <a className="link-button no-print" href={href({ name: 'plan', id: c.id })}>
        {t.common.back}
      </a>
      <h1 className="page__title">{t.card.title}</h1>
      <p className="page__lead no-print">{t.card.lead}</p>
      <div className="record">
        <svg className="record__qr" viewBox={`-4 -4 ${qr.size + 8} ${qr.size + 8}`} role="img" aria-label={t.card.qrLabel} shapeRendering="crispEdges">
          <rect x="-4" y="-4" width={qr.size + 8} height={qr.size + 8} fill="#fff" />
          <path d={qr.d} fill="#000" />
        </svg>
        <pre className="record__text" lang="en">
          {text}
        </pre>
      </div>
      <div className="actions no-print">
        <button type="button" className="button" onClick={() => window.print()}>
          <Printer size={20} aria-hidden="true" />
          {t.card.print}
        </button>
        <button type="button" className="button button--quiet" onClick={copy}>
          <Copy size={20} aria-hidden="true" />
          {copied ? t.card.copied : t.card.copy}
        </button>
      </div>
    </div>
  );
}
