// The wound-wash timer: 15 minutes of soap and running water, with a spoken step every few
// minutes, the screen kept awake, and the time kept in storage so it survives the phone locking.
import { ClipboardList, Hospital, Pause, Play, Plus, RotateCcw, Volume2, VolumeX } from 'lucide-react';
import { useEffect, useId, useRef, useState } from 'react';
import { WASH_CITES } from '../data/cites';
import { today } from '../engine/dates';
import { useLang, useT } from '../i18n';
import { clock } from '../lib/format';
import { speak, stopSpeaking, useVoices, voiceFor } from '../lib/speech';
import { href } from '../state/route';
import { useStore } from '../state/store';
import { SourceLine } from './controls';

export const WASH_SECONDS = 15 * 60;
/** When each spoken step starts, in seconds (index-aligned with t.wash.steps). */
export const WASH_SCHEDULE = [0, 20, 180, 360, 450, 600, 780];

function stepAt(seconds: number): number {
  let i = 0;
  for (let k = 0; k < WASH_SCHEDULE.length; k++) if (seconds >= WASH_SCHEDULE[k]) i = k;
  return i;
}

/** Keep the screen on while the timer runs (Wake Lock API, where the browser has it). */
function useWakeLock(active: boolean) {
  useEffect(() => {
    if (!active || !('wakeLock' in navigator)) return;
    let lock: WakeLockSentinel | null = null;
    const request = () => {
      navigator.wakeLock
        .request('screen')
        .then((l) => (lock = l))
        .catch(() => undefined);
    };
    request();
    const onVisible = () => document.visibilityState === 'visible' && request();
    document.addEventListener('visibilitychange', onVisible);
    return () => {
      document.removeEventListener('visibilitychange', onVisible);
      lock?.release().catch(() => undefined);
    };
  }, [active]);
}

function Dial({ seconds }: { seconds: number }) {
  const id = useId().replace(/:/g, '');
  const progress = Math.min(1, seconds / WASH_SECONDS);
  // The bowl is a circle of radius 96 around (120, 120): its inside runs from y = 24 to y = 216.
  // The surface starts just below the bowl (the wave crests are 9 high), so nothing shows at 0:00.
  const surface = 226 - progress * 202;
  const minutesDone = Math.floor(seconds / 60);
  return (
    <svg className="dial" viewBox="0 0 240 240" aria-hidden="true">
      <defs>
        <clipPath id={`bowl-${id}`}>
          <circle cx="120" cy="120" r="96" />
        </clipPath>
      </defs>
      <circle className="dial__bowl" cx="120" cy="120" r="96" />
      <g clipPath={`url(#bowl-${id})`}>
        <g className="dial__water" style={{ transform: `translateY(${surface}px)` }}>
          <path className="dial__wave" d="M-240 0 q30 -9 60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 t60 0 V240 H-240 Z" />
        </g>
      </g>
      <circle className="dial__rim" cx="120" cy="120" r="96" />
      {Array.from({ length: 15 }, (_, i) => {
        const a = ((i * 24 - 90) * Math.PI) / 180;
        return (
          <line
            key={i}
            className={i < minutesDone ? 'dial__tick dial__tick--done' : 'dial__tick'}
            x1={120 + Math.cos(a) * 106}
            y1={120 + Math.sin(a) * 106}
            x2={120 + Math.cos(a) * 114}
            y2={120 + Math.sin(a) * 114}
          />
        );
      })}
    </svg>
  );
}

export function Wash() {
  const t = useT();
  const lang = useLang();
  const { state, dispatch } = useStore();
  const timer = state.wash;
  const voices = useVoices();
  const voice = voiceFor(lang, voices);
  const voiceOn = state.prefs.voice;
  const [now, setNow] = useState(() => Date.now());
  const [finished, setFinished] = useState<'timer' | 'skipped' | null>(null);
  const spoken = useRef<number>(-1);

  const running = !!timer && timer.pausedAt === null;
  const elapsed = timer ? Math.max(0, ((timer.pausedAt ?? now) - timer.startedAt - timer.pausedMs) / 1000) : 0;
  const step = stepAt(elapsed);

  useWakeLock(running);

  useEffect(() => {
    if (!running) return;
    const id = window.setInterval(() => setNow(Date.now()), 250);
    return () => window.clearInterval(id);
  }, [running]);

  // Speak each step once, as the timer reaches it.
  useEffect(() => {
    if (!running || elapsed >= WASH_SECONDS || step === spoken.current) return;
    spoken.current = step;
    if (voiceOn) speak(t.wash.steps[step], voice);
  }, [running, step, elapsed, voiceOn, voice, t]);

  // Finished: record it, speak, buzz, and show what comes next.
  useEffect(() => {
    if (!timer || elapsed < WASH_SECONDS) return;
    dispatch({ type: 'setLastWash', lastWash: { minutes: 15, on: today() } });
    dispatch({ type: 'setWash', wash: null });
    setFinished('timer');
    if (voiceOn) speak(t.wash.doneSpoken, voice);
    navigator.vibrate?.([300, 150, 300]);
  }, [timer, elapsed, dispatch, voiceOn, voice, t]);

  useEffect(() => () => stopSpeaking(), []);

  const start = () => {
    const at = Date.now();
    spoken.current = 0;
    setNow(at);
    dispatch({ type: 'setWash', wash: { startedAt: at, pausedAt: null, pausedMs: 0 } });
    // Spoken inside the tap, which phones require before a page may talk.
    if (voiceOn) speak(t.wash.steps[0], voice);
  };
  const pause = () => {
    if (!timer) return;
    stopSpeaking();
    dispatch({ type: 'setWash', wash: { ...timer, pausedAt: Date.now() } });
  };
  const resume = () => {
    if (!timer || timer.pausedAt === null) return;
    const at = Date.now();
    setNow(at);
    dispatch({ type: 'setWash', wash: { ...timer, pausedMs: timer.pausedMs + (at - timer.pausedAt), pausedAt: null } });
    if (voiceOn) speak(t.wash.steps[step], voice);
  };
  const restart = () => {
    stopSpeaking();
    spoken.current = -1;
    dispatch({ type: 'setWash', wash: null });
  };
  const toggleVoice = () => {
    if (voiceOn) stopSpeaking();
    dispatch({ type: 'setPrefs', patch: { voice: !voiceOn } });
  };

  if (finished) {
    return (
      <div className="page wash wash--done">
        <h1 className="page__title">{finished === 'timer' ? t.wash.doneTitle : t.wash.nextTitle}</h1>
        <ol className="done-steps">
          {t.wash.doneSteps.map((s) => (
            <li key={s}>{s}</li>
          ))}
        </ol>
        <div className="actions">
          <a className="button button--big" href={href({ name: 'care', snake: false })}>
            <Hospital size={22} aria-hidden="true" />
            {t.wash.findClinic}
          </a>
          <a className="button button--quiet" href={href({ name: 'check' })}>
            <ClipboardList size={20} aria-hidden="true" />
            {t.wash.checkNext}
          </a>
          <a className="button button--quiet" href={href({ name: 'planNew' })}>
            <Plus size={20} aria-hidden="true" />
            {t.wash.startPlan}
          </a>
        </div>
        <SourceLine cites={WASH_CITES} />
      </div>
    );
  }

  const left = WASH_SECONDS - elapsed;
  return (
    <div className="page wash">
      <h1 className="page__title">{t.wash.title}</h1>
      {!timer && <p className="page__lead">{t.wash.lead}</p>}

      <div className="dial-wrap">
        <Dial seconds={elapsed} />
        <p className="dial__time">
          <span className="dial__clock">{clock(left)}</span>
          <span className="dial__left">{t.wash.left}</span>
        </p>
      </div>

      {timer && (
        <p className="wash__step" aria-live="polite">
          {t.wash.steps[step]}
        </p>
      )}

      <div className="wash__controls">
        {!timer && (
          <button type="button" className="button button--big" onClick={start}>
            <Play size={22} aria-hidden="true" />
            {t.wash.start}
          </button>
        )}
        {running && (
          <button type="button" className="button button--quiet" onClick={pause}>
            <Pause size={20} aria-hidden="true" />
            {t.wash.pause}
          </button>
        )}
        {timer && !running && (
          <button type="button" className="button" onClick={resume}>
            <Play size={20} aria-hidden="true" />
            {t.wash.resume}
          </button>
        )}
        {timer && (
          <button type="button" className="button button--quiet" onClick={restart}>
            <RotateCcw size={20} aria-hidden="true" />
            {t.wash.restart}
          </button>
        )}
        <button type="button" className="button button--quiet" aria-pressed={voiceOn} onClick={toggleVoice}>
          {voiceOn ? <Volume2 size={20} aria-hidden="true" /> : <VolumeX size={20} aria-hidden="true" />}
          {voiceOn ? t.wash.voiceOn : t.wash.voiceOff}
        </button>
      </div>
      {voiceOn && voices.length > 0 && !voice && <p className="muted">{t.wash.noVoice}</p>}

      <ul className="tips">
        {t.wash.tips.map((s) => (
          <li key={s}>{s}</li>
        ))}
      </ul>
      <p className="muted">{t.wash.lateNote}</p>
      {!timer && (
        <button type="button" className="link-button" onClick={() => setFinished('skipped')}>
          {t.wash.skip}
        </button>
      )}
      <SourceLine cites={WASH_CITES} />
    </div>
  );
}
