# Build progress (for whoever continues this work)

Project: **Uyir**, first aid after a bite and a plan for every rabies vaccine dose. Folder:
`C:\Uyir`. Started 25 October 2026 after Nizhal (`C:\best project`), as Haven asked for another
project on a different topic that solves a real problem.

## Done (25 October 2026)

- Research: national rabies guideline (2019, scanned, read page by page), wound management
  guideline, NRCP FAQ and helpline, clinic list (March 2026), Tamil Nadu state plan, NCDC advisory
  note, MoHFW snakebite guideline (2017), and the numbers (ICMR–NIE 2025, Debnath 2025,
  Suraweera 2020, 2024 ministry figures). Every rule is mapped in `docs/sources.md`.
- Engine (`src/engine/`) with 62 tests: dates, regimens, plan and late-dose rules, exposure
  check, animal watch, calendar file, clinic search and distance, register record, QR round trip.
- Data: `src/data/clinics.json` from the official PDF (284 clinics, 235 with dialable numbers,
  coordinates for all: 60 at the hospital, 35 at the town, 56 by PIN, 133 at the district centre).
- UI in English, Tamil and Hindi: home, wash timer, snakebite, check and result, plan setup,
  plan (vaccination card with stamps, alerts, immunoglobulin, animal watch, reminders), clinic
  record with QR, doses list, find care, learn (numbers, myths, settings, backup, sources).
- PWA: manifest with shortcuts (wash timer, snakebite, doses), icons, service worker built with
  the full file list, install prompt on home.
- Verified in the browser at phone and desktop sizes, light and dark, English, Tamil and Hindi
  (built-in browser pane and a separate Chrome via the DevTools tools).
- Offline verified with the server stopped: every screen reloads from the cache, in Tamil.
  Update path verified: a new build waits, then takes over on the next launch and removes the
  old cache.
- Lighthouse (mobile, production build): accessibility, best practices and SEO 100 on home,
  wash, check, plan, care and learn.
- First load: about 69 KB of JavaScript gzipped (from 120 KB before splitting).
- Docs: README (with screenshots), design, sources, how it works, interview guide.

## Next

1. **Native-speaker review** of the Tamil and Hindi text, especially the medical lines and the
   snakebite steps. Ideally a doctor who speaks the language.
2. **The last 133 district-centre clinics.** Mostly "District Hospital" lines with no town
   name, or places OpenStreetMap does not know. A person with the official list and a map could
   place them by hand; keep the 30/60 km checks for anything automatic.
3. **Real-phone check** on a budget Android phone: Tamil and Hindi voices in Google's speech
   engine, the wake lock during the 15 minutes, the calendar file opening in the phone's calendar,
   WhatsApp and SMS links, the install prompt and the long-press shortcuts.
4. **Calendar on Android.** The Google Calendar app does not import `.ics` files directly; the
   per-dose Google Calendar links are the reliable path there. Consider making them more
   prominent on Android.
5. Optional: a two-column plan layout on wide screens; Hindi/Tamil numerals preference; a
   state picker that tailors "where to go" for states other than Tamil Nadu (only with sources).

## How to run and check

```
npm install
npm run dev            # http://localhost:5173
npx vitest run         # 62 tests
npx tsc -b             # type check
npm run build          # dist/ with sw.js
npx vite preview       # serve dist/ to test the service worker
```

The preview tool's launch.json lookup points at an old folder, so start vite by hand in the
background (`npx vite --port 5180 --strictPort --host 127.0.0.1`) and open it with preview_start
url. The built-in browser pane does not run service workers; use the chrome-devtools tools (a
separate Chrome) for anything offline.

## Design notes

Palette: paper `#F7F8F6`, ink `#14212B`, water `#0B6FA4` (wash, primary actions), stamp violet
`#4B3F9E` (doses given), urgent `#C3362B`, due `#A85F00`; dark mode has its own steps in
`src/styles/tokens.css`. Type: Mukta and Mukta Malar. Signature elements: the water dial and the
stamped vaccination card.
