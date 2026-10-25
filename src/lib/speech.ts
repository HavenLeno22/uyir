// Spoken guidance with the browser's own speech synthesis. Works offline when the phone has
// the voice installed (most Android phones have English, Hindi and Tamil voices in Google's
// speech engine). If there is no voice for the language, nothing is spoken and the screen says so.
import { useEffect, useState } from 'react';
import { LOCALE, type Lang } from '../i18n';

const synth = (): SpeechSynthesis | null => (typeof window !== 'undefined' && 'speechSynthesis' in window ? window.speechSynthesis : null);

export function voiceFor(lang: Lang, voices: SpeechSynthesisVoice[]): SpeechSynthesisVoice | null {
  const want = LOCALE[lang].toLowerCase();
  const base = want.slice(0, 2);
  return (
    voices.find((v) => v.lang.toLowerCase().replace('_', '-') === want) ??
    voices.find((v) => v.lang.toLowerCase().startsWith(base)) ??
    null
  );
}

/** The phone's voices; they load asynchronously on most browsers. */
export function useVoices(): SpeechSynthesisVoice[] {
  const [voices, setVoices] = useState<SpeechSynthesisVoice[]>(() => synth()?.getVoices() ?? []);
  useEffect(() => {
    const s = synth();
    if (!s) return;
    const update = () => setVoices(s.getVoices());
    update();
    s.addEventListener('voiceschanged', update);
    return () => s.removeEventListener('voiceschanged', update);
  }, []);
  return voices;
}

export function speak(text: string, voice: SpeechSynthesisVoice | null): void {
  const s = synth();
  if (!s || !voice) return;
  s.cancel();
  const u = new SpeechSynthesisUtterance(text);
  u.voice = voice;
  u.lang = voice.lang;
  u.rate = 0.92;
  s.speak(u);
}

export function stopSpeaking(): void {
  synth()?.cancel();
}
