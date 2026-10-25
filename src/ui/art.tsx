// Drawn marks: the logo, a snake icon (lucide has none), and the rubber stamp for doses given.
import { useId } from 'react';

export function Logo({ size = 28 }: { size?: number }) {
  return (
    <svg className="logo" width={size} height={size} viewBox="0 0 24 24" aria-hidden="true">
      <path d="M12 2.2c3.9 4.6 6.9 8.3 6.9 11.8a6.9 6.9 0 0 1-13.8 0C5.1 10.5 8.1 6.8 12 2.2Z" fill="var(--water)" />
      <path
        d="M6.9 14.4h2.4l1.3-2.8 1.9 4.9 1.4-2.1h3.2"
        fill="none"
        stroke="var(--water-ink)"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export function SnakeIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M4.5 20.5H14a3.25 3.25 0 0 0 0-6.5H9.5a3.25 3.25 0 0 1 0-6.5H15" />
      <ellipse cx="17.3" cy="7.5" rx="2.6" ry="2.1" fill="currentColor" />
      <path d="M19.9 7.5h1.3l.8-.9M21.2 7.5l.8.9" strokeWidth="1.4" />
    </svg>
  );
}

export function BatIcon({ size = 24 }: { size?: number }) {
  return (
    <svg width={size} height={size} viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
      <path d="M12 18.5 10.3 16c-1.3-.3-2.5.2-3.4 1.3-1.3-.6-2.7-.4-4 .5.2-2.9.1-5.6-.9-8.3 2.6.1 4.3 1.6 5 3.6 1-1.2 2.5-1.4 3.6-.5.3-1 .8-1.6 1.4-1.6s1.1.6 1.4 1.6c1.1-.9 2.6-.7 3.6.5.7-2 2.4-3.5 5-3.6-1 2.7-1.1 5.4-.9 8.3-1.3-.9-2.7-1.1-4-.5-.9-1.1-2.1-1.6-3.4-1.3Z" />
      <path d="m11.2 11-.6-1.8 1.4.8 1.4-.8-.6 1.8" strokeWidth="1.4" />
    </svg>
  );
}

/** A violet rubber-stamp mark with a word and a date, as clinics stamp paper cards. */
export function Stamp({ word, date, size = 76 }: { word: string; date: string; size?: number }) {
  const id = useId().replace(/:/g, '');
  return (
    <svg className="stamp" width={size} height={size} viewBox="0 0 80 80" role="img" aria-label={`${word} ${date}`}>
      <defs>
        <filter id={`ink-${id}`} x="-5%" y="-5%" width="110%" height="110%">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="1" seed="7" result="noise" />
          <feDisplacementMap in="SourceGraphic" in2="noise" scale="1.6" />
        </filter>
      </defs>
      <g filter={`url(#ink-${id})`} fill="none" stroke="currentColor">
        <circle cx="40" cy="40" r="36" strokeWidth="3" />
        <circle cx="40" cy="40" r="30.5" strokeWidth="1.2" />
        <text x="40" y="37" textAnchor="middle" fill="currentColor" stroke="none" fontSize="12.5" fontWeight="800" textLength={word.length > 8 ? 48 : undefined} lengthAdjust="spacingAndGlyphs">
          {word}
        </text>
        <line x1="17" y1="43" x2="63" y2="43" strokeWidth="1.2" />
        <text x="40" y="56" textAnchor="middle" fill="currentColor" stroke="none" fontSize="11" fontWeight="600">
          {date}
        </text>
      </g>
    </svg>
  );
}
