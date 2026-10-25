// Why the app exists (numbers with sources), myths and facts, settings, backup, and the full
// list of sources.
import { Download, Upload } from 'lucide-react';
import { useId, useRef, useState } from 'react';
import { MYTH_CITES, STAT_CITES } from '../data/cites';
import { SOURCES } from '../data/sources';
import { useT } from '../i18n';
import { downloadFile } from '../lib/share';
import { useStore, validCase, type Theme } from '../state/store';
import { Segmented, SourceLine } from './controls';

export function Learn() {
  const t = useT();
  const { state, dispatch } = useStore();
  const fileId = useId();
  const fileRef = useRef<HTMLInputElement>(null);
  const [importMsg, setImportMsg] = useState('');

  const exportData = () => {
    const stamp = new Date().toISOString().slice(0, 10);
    downloadFile(`uyir-backup-${stamp}.json`, 'application/json', JSON.stringify({ app: 'uyir', version: 1, cases: state.cases }, null, 1));
  };
  const importData = async (file: File) => {
    try {
      const data = JSON.parse(await file.text()) as { app?: string; cases?: unknown[] };
      if (data.app !== 'uyir' || !Array.isArray(data.cases)) throw new Error('not a backup');
      const cases = data.cases.filter(validCase);
      dispatch({ type: 'importCases', cases });
      setImportMsg(t.learn.importDone(cases.length));
    } catch {
      setImportMsg(t.learn.importBad);
    }
  };

  return (
    <div className="page learn">
      <h1 className="page__title">{t.learn.title}</h1>

      <section className="section" aria-labelledby="why-title">
        <h2 id="why-title" className="section__title">
          {t.learn.whyTitle}
        </h2>
        <ul className="stats">
          {t.learn.stats.map((s, i) => (
            <li key={s.n} className="stat">
              <p className="stat__n">{s.n}</p>
              <p className="stat__text">{s.text}</p>
              <SourceLine cites={STAT_CITES[i]} />
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="myths-title">
        <h2 id="myths-title" className="section__title">
          {t.learn.mythsTitle}
        </h2>
        <ul className="myths">
          {t.myths.map((m, i) => (
            <li key={m.myth} className="myth">
              <p className="myth__myth">
                <span className="myth__tag">{t.learn.myth}</span> {m.myth}
              </p>
              <p className="myth__fact">
                <span className="myth__tag myth__tag--fact">{t.learn.fact}</span> {m.fact}
              </p>
              <SourceLine cites={[MYTH_CITES[i]]} />
            </li>
          ))}
        </ul>
      </section>

      <section className="section" aria-labelledby="about-title">
        <h2 id="about-title" className="section__title">
          {t.learn.aboutTitle}
        </h2>
        {t.learn.about.map((p) => (
          <p key={p}>{p}</p>
        ))}
        <p className="disclaimer">{t.notDoctor}</p>
        <Segmented<Theme>
          label={t.common.theme}
          value={state.prefs.theme}
          options={(['system', 'light', 'dark'] as const).map((v) => ({ value: v, label: t.common.themes[v] }))}
          onChange={(theme) => dispatch({ type: 'setPrefs', patch: { theme } })}
        />
      </section>

      <section className="section" aria-labelledby="data-title">
        <h2 id="data-title" className="section__title">
          {t.learn.dataTitle}
        </h2>
        <div className="share-row">
          <button type="button" className="button button--quiet" onClick={exportData} disabled={state.cases.length === 0}>
            <Download size={20} aria-hidden="true" />
            {t.learn.exportData}
          </button>
          <label className="button button--quiet" htmlFor={fileId}>
            <Upload size={20} aria-hidden="true" />
            {t.learn.importData}
          </label>
          <input
            id={fileId}
            ref={fileRef}
            className="visually-hidden"
            type="file"
            accept="application/json,.json"
            onChange={(e) => {
              const f = e.target.files?.[0];
              if (f) void importData(f);
              if (fileRef.current) fileRef.current.value = '';
            }}
          />
        </div>
        {importMsg && <p role="status">{importMsg}</p>}
      </section>

      <section className="section" aria-labelledby="sources-title">
        <h2 id="sources-title" className="section__title">
          {t.learn.sourcesTitle}
        </h2>
        <ul className="source-list">
          {Object.values(SOURCES).map((s) => (
            <li key={s.url}>
              <a href={s.url} target="_blank" rel="noopener noreferrer">
                {s.title}
              </a>
              <span className="muted">
                {' '}
                {s.publisher}, {s.year}
              </span>
            </li>
          ))}
        </ul>
        <p className="muted">{t.learn.madeBy}</p>
      </section>
    </div>
  );
}
