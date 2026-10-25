# Uyir: interview guide

This is for you, Haven: how to talk about Uyir so an interviewer remembers it, and what to study
so you can answer any follow-up honestly.

## First, be honest about how it was built

Uyir was built with Claude (Anthropic) as an AI pair programmer, and the README says so. What an
interviewer tests is whether **you** understand it: why the rules are where they are, what can
go wrong, and what you would do next. Read `src/engine/` (it is small: dates, regimens, plan,
exposure, watch, calendar, clinics, record) and `docs/sources.md` until you can explain each rule
and point to its page in the guideline. If someone asks "did you use AI?", say yes, then show you
understand it. That beats pretending.

## The 30-second pitch

"India records about 37 lakh dog bites a year, and rabies is almost 100% fatal once symptoms
start, but almost 100% preventable. The vaccine is on the government's free essential-drug list,
yet only about 57% of people finish the course. Uyir is an offline app for the first minutes after a bite and
the four weeks after it. It asks what bit you, because a dog bite must be washed for 15 minutes
and a snakebite must not be washed at all. It runs a voice-guided wash timer in Tamil, Hindi or
English, explains what the clinic will do, finds the nearest of the 284 official anti-rabies
clinics without internet, and turns the national vaccine schedule into a plan with the
guideline's rules and reminders. Every medical statement shows the government guideline page it
comes from."

## The story (why this project)

- You wanted a project that solves a real problem, not another demo. Rabies has a clear,
  measurable failure: people drop out of a course that works (57% completion; in one study most
  drop-outs happened after dose 3).
- You checked what exists: the NRCP website has the schedule and a PDF clinic list, the 15400
  helpline covers five states, ZeroRabiesApp (Auburn University) gives general guidance. None turns
  the Indian rules into a personal plan that works offline in Indian languages.
- You read the actual 2019 national guideline. It is a scanned PDF, so you wrote a script to pull
  out the page images and read it page by page. That's where the 10-day rule, the "1–2 days late
  doesn't mean restarting" rule and the immunoglobulin day-7 limit came from.
- You found the snakebite trap: the government's snakebite guideline says do *not* wash the
  wound. So the very first screen has to ask "what bit you?" before any advice.
- You found a gap in the official data: the national clinic list has no Tamil Nadu clinics, and
  you handled it honestly with the Tamil Nadu state plan (vaccine at all government facilities
  including PHCs, immunoglobulin at district hospitals).

## Architecture in plain words

1. **Rules engine** (`src/engine/`): pure functions, tested. `viewCourse(course, today)` takes
   what the person recorded and derives every due date, state and alert.
2. **Data pipeline** (`scripts/`): official PDF → text by position → clinic table → coordinates
   from OpenStreetMap → `src/data/clinics.json`.
3. **App** (`src/ui/`): React screens. Emergency screens load first; the rest load on demand.
4. **Offline** (`sw/sw.js` + a Vite plugin): the whole build is cached on the first visit.

## Decisions you should be able to defend

| Decision | Why | Trade-off |
|---|---|---|
| "What bit you?" before anything else | Dog-bite and snakebite first aid conflict (wash vs do not wash). | One extra tap in an emergency. |
| Dates as `YYYY-MM-DD`, arithmetic on day numbers | Schedules are in whole days; using `Date` objects with times can move a dose by a day across time zones. | Need helpers for everything (`addDays`, `daysBetween`). |
| The app never moves, skips or restarts a dose | Only a doctor may decide that; the guideline's late-dose rules are shown as advice to go and tell the doctor. | The person must type the clinic's new dates themselves. |
| Clinic dates override the standard ones | After a late dose, clinics often reschedule; the card in their hand must win. | Two sources of dates to show clearly (a "clinic's date" tag). |
| Exposure check says "ask the doctor" in grey areas | The guideline itself says "when in doubt, start PEP". A tool must not talk someone out of a vaccine. | Less decisive in edge cases (bats, contact with a patient). |
| No server | Health data stays on the phone; works offline; free to host. | No push reminders: reminders go into the calendar or WhatsApp instead. |
| Calendar file + WhatsApp/SMS for reminders | A web app cannot schedule notifications for weeks later without a server. Calendars already alarm reliably; a family member is the best reminder in India. | The person has to tap once to add them. |
| Phone numbers: keep only dialable ones, flag the rest | A wrong number in an emergency is worse than none. | Three official clinics show "number incomplete". |
| Drop doctors' names and emails from the clinic list | Not needed to get care; less personal data republished. | None for the user. |
| Geocode by PIN centre, else district centre, check the state | Free, one-off, honest. A wrong state would put a clinic hundreds of km away. | Most distances are approximate (marked "~"). |
| Lazy screens, lazy languages | Budget phones on slow data: the first load is about 69 KB gzipped. | Must precache everything for offline, hence the build-time file list. |
| Service worker without `skipWaiting` (except the first install) | An open page must never lose the files of its own build when a new build arrives. | Updates apply on the next launch. |

## Things that went wrong and how they were found

- **The scanned guideline.** Text extraction gave empty pages. The PDF stores one JPEG per page,
  but every page shares one resource list of all 48 images, so the first attempt wrote 2,496
  files. Fix: read each page's content stream to find the one image it draws (`/Name Do`).
- **The clinic table.** Long addresses wrap above and below the numbered row. Assigning each
  text item to the nearest numbered row's line works; a column edge set a little too far left
  moved fragments like "Sector - 6," into the phone column, caught by the checks in the script.
- **Phone numbers** like "94196 - 80490" split into groups; "8.90E+11" from a spreadsheet. The
  parser joins digit groups until they make a valid number and flags the rest.
- **Service worker placeholders.** The build replaced the first occurrence of `__VERSION__`,
  which was in a comment, so the real constant stayed a placeholder. Now the replacement targets
  the code line and the build fails if any placeholder is left.
- **Caching across builds.** Testing an update showed the old approach could leave an open page
  asking for files a newer build had deleted. Switched to one cache per build, take over on next
  launch, and an error screen with "Try again".
- **Offline testing.** DevTools "offline" did not stop the service worker's own requests, so the
  first offline test proved less than it seemed. The real test was stopping the server and
  reloading.

## Questions you may get

- *How do you know the medical rules are right?* Each one is cited to a page (docs/sources.md),
  and the tests encode the rules (e.g. a dose 3 days late is "see the doctor", 2 days is "go
  today, no restart"). The app never decides treatment.
- *What if the person was vaccinated before?* With proof of a complete course: 2 doses, no
  immunoglobulin; within 3 months: wound washing only; partial or no proof: a full new course.
  Weak immunity overrides all of this (section 6).
- *Why not push notifications?* They need a server to send at the right time; the person's data
  would have to leave the phone. Calendar alarms already work offline.
- *How would you scale this?* A clinic-side mode (with a server and consent) for the register and
  stock of vaccine and immunoglobulin; SMS reminders through the state's existing systems; a
  native Android build for exact alarms; partnering with the 15400 helpline.
- *What would you measure?* Course completion among users vs the 57% baseline, and how many
  people complete the first three doses within 10 days.

## What to study

- The National Guidelines for Rabies Prophylaxis (2019), sections 2–8 and the FAQs. Know
  Table 1 (categories) by heart.
- Service worker lifecycle (install, waiting, activate, `skipWaiting`, `clients.claim`), and why
  updates are tricky with lazy-loaded chunks.
- RFC 5545 basics (calendar files) and why line folding must respect UTF-8.
- Accessibility: ARIA radio-group keyboard pattern, focus management on route change, live
  regions.
