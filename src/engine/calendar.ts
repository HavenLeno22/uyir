// Dose reminders that work without a server: a standard calendar file (RFC 5545) for phone and
// desktop calendars, and Google Calendar "add event" links (one per dose).
import { type ISODate } from './dates';

export interface CalendarEvent {
  uid: string;
  date: ISODate;
  /** Local start time, 0–23. */
  hour: number;
  durationMin: number;
  title: string;
  description: string;
}

const pad = (n: number) => String(n).padStart(2, '0');
const compactDate = (d: ISODate) => d.replace(/-/g, '');

/** Local ("floating") date-time: the phone's own time zone, which is what a clinic visit is in. */
function localStamp(date: ISODate, hour: number, minute: number): string {
  const extraDays = Math.floor((hour * 60 + minute) / 1440);
  const mins = (hour * 60 + minute) % 1440;
  const d = extraDays ? new Date(Date.parse(date + 'T00:00:00Z') + extraDays * 86_400_000).toISOString().slice(0, 10) : date;
  return `${compactDate(d)}T${pad(Math.floor(mins / 60))}${pad(mins % 60)}00`;
}

function utcStamp(t: Date): string {
  return t.toISOString().replace(/[-:]/g, '').replace(/\.\d{3}/, '');
}

/** TEXT value escaping (RFC 5545, 3.3.11). */
export function escapeText(s: string): string {
  return s.replace(/\\/g, '\\\\').replace(/;/g, '\\;').replace(/,/g, '\\,').replace(/\r?\n/g, '\\n');
}

/** Lines longer than 75 octets are folded (RFC 5545, 3.1), never inside a UTF-8 character. */
export function foldLine(line: string): string {
  const enc = new TextEncoder();
  const out: string[] = [];
  let cur = '';
  let bytes = 0;
  for (const ch of line) {
    const n = enc.encode(ch).length;
    const limit = out.length === 0 ? 75 : 74; // continuation lines start with a space
    if (bytes + n > limit) {
      out.push(cur);
      cur = '';
      bytes = 0;
    }
    cur += ch;
    bytes += n;
  }
  out.push(cur);
  return out.join('\r\n ');
}

export function toICS(events: CalendarEvent[], now: Date): string {
  const lines = ['BEGIN:VCALENDAR', 'VERSION:2.0', 'PRODID:-//Uyir//Rabies vaccine reminders//EN', 'CALSCALE:GREGORIAN', 'METHOD:PUBLISH'];
  for (const e of events) {
    lines.push(
      'BEGIN:VEVENT',
      `UID:${e.uid}`,
      `DTSTAMP:${utcStamp(now)}`,
      `DTSTART:${localStamp(e.date, e.hour, 0)}`,
      `DTEND:${localStamp(e.date, e.hour, e.durationMin)}`,
      `SUMMARY:${escapeText(e.title)}`,
      `DESCRIPTION:${escapeText(e.description)}`,
      // The evening before at 6 p.m., and again at the time of the visit.
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeText(e.title)}`,
      `TRIGGER:-PT${e.hour + 6}H`,
      'END:VALARM',
      'BEGIN:VALARM',
      'ACTION:DISPLAY',
      `DESCRIPTION:${escapeText(e.title)}`,
      'TRIGGER:PT0M',
      'END:VALARM',
      'END:VEVENT',
    );
  }
  lines.push('END:VCALENDAR');
  return lines.map(foldLine).join('\r\n') + '\r\n';
}

export function googleCalendarUrl(e: CalendarEvent): string {
  const params = new URLSearchParams({
    action: 'TEMPLATE',
    text: e.title,
    dates: `${localStamp(e.date, e.hour, 0)}/${localStamp(e.date, e.hour, e.durationMin)}`,
    details: e.description,
  });
  return `https://calendar.google.com/calendar/render?${params.toString()}`;
}
