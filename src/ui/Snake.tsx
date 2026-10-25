// Snakebite first aid (MoHFW Standard Treatment Guidelines, 2017). No wash timer here: for a
// snakebite the guideline says not to wash or touch the wound.
import { Ambulance, Ban, Hospital } from 'lucide-react';
import { SNAKE_CITES } from '../data/cites';
import { useT } from '../i18n';
import { href } from '../state/route';
import { Notice, SourceLine } from './controls';

export function Snake() {
  const t = useT();
  return (
    <div className="page snake">
      <h1 className="page__title">{t.snake.title}</h1>
      <div className="snake__stop" role="alert">
        <Ban className="snake__stop-icon" size={30} aria-hidden="true" />
        <div>
          <p className="snake__stop-title">{t.snake.noWash}</p>
          <p>{t.snake.noWashWhy}</p>
        </div>
      </div>

      <a className="button button--big button--urgent" href="tel:108">
        <Ambulance size={24} aria-hidden="true" />
        {t.common.call('108')}
      </a>
      <p className="page__lead">{t.snake.calm}</p>

      <section className="section" aria-labelledby="snake-steps">
        <h2 id="snake-steps" className="section__title">
          {t.snake.stepsTitle}
        </h2>
        <ol className="steps">
          {t.snake.steps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
      </section>

      <section className="section" aria-labelledby="snake-donts">
        <h2 id="snake-donts" className="section__title">
          {t.snake.dontTitle}
        </h2>
        <ul className="donts">
          {t.snake.donts.map((s) => (
            <li key={s}>
              <Ban size={20} aria-hidden="true" />
              <span>{s}</span>
            </li>
          ))}
        </ul>
      </section>

      <Notice tone="warn">
        <p>{t.snake.krait}</p>
      </Notice>

      <a className="button button--quiet" href={href({ name: 'care', snake: true })}>
        <Hospital size={20} aria-hidden="true" />
        {t.snake.findHospital}
      </a>
      <SourceLine cites={SNAKE_CITES} />
    </div>
  );
}
