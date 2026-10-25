# How Uyir works

Uyir is a static web app (React, TypeScript, Vite) with no server. Everything a person enters
stays in the phone's `localStorage`. This page walks through the parts in the order a bite
happens.

```
what bit you? ─┬─ animal ─► wash timer ─► what will the clinic do? ─► dose plan ─► reminders, 10-day watch, clinic record
               └─ snake ──► snakebite first aid (no washing) ─► call 108, nearest hospital
```

## 1. The rules engine (`src/engine/`)

Pure TypeScript with no DOM, so it is tested directly (`tests/`).

### Dates (`dates.ts`)

Dose schedules count whole days ("day 0, 3, 7, 28"), so dates are `YYYY-MM-DD` strings and all
arithmetic is on day numbers (`Date.UTC(y, m, d) / 86 400 000`). A dose can never move a day
because of a time zone. "Today" is the phone's local date, not UTC (1 a.m. in India is still the
previous day in UTC; a test checks this).

### Regimens (`regimens.ts`)

The four schedules from the National Guidelines' summary table: intradermal PEP (0, 3, 7, 28),
intramuscular PEP (0, 3, 7, 14, 28), re-exposure (0, 3) and pre-exposure (0, 7, then 21 or 28,
modelled as a window). Day 0 is the date of the first dose.

### The plan (`plan.ts`)

A course stores only what the person recorded: the first-dose date and, per dose, the date it was
given, a date the clinic set, or "left out on the doctor's advice". `viewCourse(course, today)`
derives everything else:

- each dose's due date (clinic date, else day 0 + schedule day) and state: given, due today,
  upcoming, late (with days late), or left out;
- the next dose;
- alerts, from the guideline's section 8 and 2.9:
  - `firstThreeBy`: the first three doses should all be given within 10 days of the first;
  - `lateMinor`: one of the first three is one or two days late: go today, no restart;
  - `lateMajor`: three or more days late, or past day 10: go today and tell the doctor, extra
    doses may be needed;
  - `lateLater`: a later dose is late: go as soon as possible, don't restart on your own;
  - `rigWindow`: immunoglobulin was needed and not yet given: days left until day 7;
  - `complete`.

When the first dose is recorded on a different day than planned, day 0 moves with it, so the
standard dates follow. All changes return a new course (nothing is mutated), which keeps React
state simple.

### The exposure check (`exposure.ts`)

`assess(answers)` returns the category, whether the vaccine and immunoglobulin are expected
(`yes`, `no`, or `ask` the doctor), the course (full, re-exposure, wash only, none), whether the
intramuscular route applies, how urgent it is, and a list of reasons, each with a citation. The
order of the rules matters and mirrors the guideline: bats, contact with a patient and house
rodents are answered first (section 2.1); then the category from the contact (Table 1), raised to
III for bleeding, wild animals or forests; weak immunity changes immunoglobulin and route and
overrides an earlier course (section 6); a documented complete earlier course means two doses or
wash only (section 5).

### The animal watch (`watch.ts`)

Daily checks by date. Any "sick", "dead" or "missing" is an alert from that day on. "Well after 10
days" needs a check on day 10 or later. The engine reports; the screen tells the person to show
the doctor and never changes the plan.

### Calendar (`calendar.ts`)

RFC 5545 output: CRLF line endings, escaped text, floating local times (a clinic visit is in the
phone's time zone), two alarms (6 p.m. the evening before, and at the visit). Lines longer than
75 octets are folded on UTF-8 character boundaries, which matters for Tamil, where one letter
can be three bytes. Google Calendar links use the same times.

### The clinic record (`record.ts`)

Plain English text with the fields of the government's Animal Bite Exposure Register (Annexure IV
of the 2019 guideline): name and age, date of bite, animal, site, category, wound washed,
immunoglobulin, previous vaccination, route and dose dates, and the animal's status after 10
days. Kept short so the QR code stays easy for a phone camera to read.

## 2. Data from official PDFs (`scripts/`)

- `extract-pdf-text.mjs`: pdf.js text extraction; `--layout` keeps horizontal positions.
- `extract-pdf-scans.mjs`: the 2019 guideline has no text layer. This walks the PDF's page tree,
  finds the image each page's content stream actually draws (`/Name Do`; all pages share one
  resource dictionary listing every scan), and writes the JPEG bytes out unchanged.
- `build-clinics.mjs`: the clinic list is a table whose long cells wrap above and below the
  numbered line. Each text item goes into a column by its horizontal centre and into the row of
  the nearest numbered line. Phone cells are messy ("94196 - 80490", two numbers in a cell, a
  spreadsheet "8.90E+11", 11-digit typos), so neighbouring digit groups are joined until they make
  a dialable number; anything else is flagged, not guessed. State names are normalised, PIN codes
  are accepted only if their first digit matches the state's postal zone, and doctors' names and
  emails are dropped on purpose.
- `geocode-clinics.mjs`: one-off coordinates from OpenStreetMap Nominatim (one request at a time,
  at most one a second, identified, cached in `scripts/clinic-geocodes.json` so it never asks
  twice). First pass: PIN-code centre when the address has a PIN, district centre otherwise; a
  result is kept only if Nominatim places it in the clinic's state. Six misspelt district names in
  the official list are mapped to their real names. Second pass (`--refine`) for district-level
  clinics: the hospital itself (an OpenStreetMap hospital or clinic within 30 km of the district
  centre), else the town or village named in the facility line (a place within 60 km). Result:
  60 at the facility, 35 at the town, 56 at the PIN centre, 133 at the district centre, and only
  the last are shown as approximate ("~").

## 3. The screens (`src/ui/`)

- **Wash timer** (`Wash.tsx`): the start time lives in the store, so elapsed time is computed
  from the clock and survives a reload or the phone locking. Spoken steps are scheduled by elapsed
  seconds and each is spoken once; the first is spoken inside the tap, which phones require before
  a page may talk. The Wake Lock API keeps the screen on. The dial is SVG: a clip path for the
  bowl, a water group translated to the current level, a wave path animated sideways (switched off
  for reduced motion), and 15 minute ticks.
- **Check** (`Check.tsx`): four steps, then the result. Each step scrolls to the top and focuses
  its question. Bats and contact with a patient go straight to the result.
- **Plan** (`Plan.tsx`): alerts sorted by severity (an animal alert first), the next dose, the
  vaccination card with stamps, immunoglobulin, the animal watch, reminders, tips with sources.
- **Care** (`Care.tsx`): helplines, where to go, the clinic list (search, state filter, nearest
  first by the haversine distance), nearby hospitals from the Overpass API (only when asked, and
  the screen says the location is sent to OpenStreetMap).
- **Card** (`Card.tsx`): the record and its QR code (qrcode-generator in UTF-8 mode, drawn as one
  SVG path with runs merged per row), copy and print.

## 4. Loading, offline and updates

- `App.tsx` keeps home, the wash timer, snakebite and the dose list in the main bundle. Other
  screens are `React.lazy` chunks; Tamil and Hindi load on demand (`i18n/index.tsx`), and
  `main.tsx` loads the saved language before the first paint so there is no flash of English.
- `vite.config.ts` has a small plugin that writes `dist/sw.js` from `sw/sw.js`, filling in the
  list of every built file and a version hashed from their names.
- The service worker caches that whole list on install, so a first visit makes every screen
  available offline. Each build's files stay in their own cache and are never refreshed one by
  one. A new build waits and takes over the next time the app is opened, so a page that is open
  never asks for a file that a newer build deleted. On the very first install it takes control at
  once, since nothing older is running. Fonts are cached on first use.
- An error boundary shows "this screen could not load" with Try again, instead of a blank page.

## 5. Text and accessibility

- `i18n/en.ts` defines the messages, including functions for plurals and dates; `ta.ts` and
  `hi.ts` are typed against it, and `tests/i18n.test.ts` checks every key, list length and
  function arity, plus a scan for leftover English sentences.
- Dates are formatted with `Intl.DateTimeFormat` in `en-IN`, `ta-IN` or `hi-IN`, always in UTC so
  the calendar day never shifts.
- Radio groups are one Tab stop with arrow keys; chips are toggle buttons; each new screen moves
  focus to its heading; urgent notices are `role="alert"`; colour is never the only signal.
- Lighthouse (mobile, production build): accessibility, best practices and SEO all 100 on the
  home, wash, check, plan, care and learn screens.

## 6. Tests

```
tests/plan.test.ts      dates, schedules, day 0, clinic dates, late-dose rules, immunoglobulin window
tests/exposure.test.ts  categories, special cases, earlier vaccination, notes, the animal watch
tests/tools.test.ts     calendar file, clinic data (284 clinics, dialable numbers, coordinates), search, distance, record
tests/i18n.test.ts      Tamil and Hindi complete and consistent with English
tests/content.test.ts   every myth, number and tip has a source; wash schedule; QR decodes to the exact record
```
