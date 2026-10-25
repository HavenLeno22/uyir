# Uyir: design

Uyir (உயிர், "life") is a free, offline web app for the hours and weeks after an animal bite
in India: what to do in the first minutes, where to go, and how to finish every rabies
vaccine dose on time. It also covers snakebite first aid, because the first question after a
bite ("what bit you?") decides whether the wound should be washed at all.

Written 25 October 2026. Every medical statement in the app comes from an Indian government
source and shows that source; see [sources.md](sources.md).

## The problem

- **Bites are common.** India recorded 37,15,713 dog bites in 2024; Tamil Nadu had 4,80,427, the
  second highest after Maharashtra (ministry data, reported by The Tribune).
  A national survey estimated about 91 lakh animal bites a year, three in four from dogs
  (ICMR–NIE, *Lancet Infectious Diseases*, 2025).
- **Rabies still kills, and is undercounted.** The same study estimates about 5,726 human rabies
  deaths a year; official surveillance (IDSP-IHIP) recorded 54 in 2024. Rabies is "practically 100% fatal,
  yet practically 100% preventable" with timely, correct care (NRCP wound management
  guidelines).
- **People do not finish the vaccine.** A 2025 meta-analysis of 30 Indian studies (about 35,600
  people) found pooled compliance with post-exposure prophylaxis of 57% (95% CI 48–66%).
  Reported barriers: cost and lost wages, logistics and distance, lack of awareness, cultural
  beliefs, fear of side effects (Debnath et al., *J Family Med Prim Care*, 2025). In a Khandwa
  study only 44.8% completed the four-dose intradermal course, with most drop-outs after dose 3.
- **The guideline names the failure modes.** Most rabies cases after PEP followed delayed
  vaccination, no immunoglobulin in a Category III bite, or an incomplete course (NRCP 2019,
  FAQ 7).
- **Harmful first aid is common.** Chilli, turmeric, lime, oil and herbs are still put on bite
  wounds; the guideline says they help nothing and may help the virus reach nerves (NRCP 2019,
  FAQ 2). For snakebites, 60.76% received first aid at the site in one study, much of it
  traditional, and most victims first go to traditional healers (MoHFW snakebite guideline 2017).
- **Snakebite** kills about 58,000 Indians a year (Suraweera et al., *eLife*, 2020). Its first aid
  is the opposite of a dog bite's: do **not** wash or touch the wound; immobilise and get to a
  hospital with antivenom (MoHFW 2017).

## What exists (checked October 2026)

| Product | What it does | Gap Uyir fills |
|---|---|---|
| NRCP website (rabiesfreeindia.mohfw.gov.in) | Vaccination schedule page, RIG dose page, "Locate services", FAQ, PDF clinic list | No reminders or dose tracking, no offline use, English-first, clinic list is a 29-page PDF |
| ZeroRabiesApp (Auburn University) | WHO/CDC guidance and medicine availability for India and Nigeria | Not built around Indian guidelines, languages or dose adherence |
| Generic reminder apps | Reminders | No idea of PEP rules (10-day rule, RIG window, late-dose guidance) |
| National Rabies Helpline 15400 | Phone advice, 16×7, in five states/UTs (AP, MP, Assam, Puducherry, Delhi) | Phone only; Uyir lists it |

Nothing found combines: first-minute guidance by voice in Tamil and Hindi, the Indian PEP
rules turned into a personal schedule, calendar and WhatsApp reminders, and an offline
directory of the official anti-rabies clinics.

## Who it is for

A parent whose child was just bitten, a worker bitten on the way home, a grandmother whose
grandson is reading the phone for her. Budget Android phones, patchy data, any literacy level,
Tamil, Hindi or English. In the first minutes they need one clear instruction at a time; over the
next four weeks they need to not forget.

## Goals

1. **First minutes, right action.** Ask "what bit you?" first. Animal bite: start a 15-minute
   wash timer with spoken steps (soap, running water, no chilli or turmeric), then where to go.
   Snakebite: no washing; immobilise, remove rings, no tourniquet, get to a hospital, call 108.
2. **Know what to expect at the clinic.** A short check maps what happened to the national
   exposure categories (I, II, III) and says what the clinic will usually give (wound care,
   vaccine, immunoglobulin), with special cases from the guideline: wild animals and forest
   bites, bleeding, weak immunity, earlier vaccination, rats and rabbits, bats.
3. **Finish every dose.** A personal plan from the national schedules (4-visit intradermal,
   5-visit intramuscular, 2-visit re-exposure, pre-exposure), with the guideline's rules: first
   three doses within 10 days, one or two days late does not mean starting again, the
   immunoglobulin window (no later than 7 days after the first dose). Reminders that work
   without a server: calendar file, Google Calendar links, WhatsApp/SMS to self or family.
4. **The 10-day animal watch.** For dog and cat bites, a daily check on the animal. If it falls
   sick, dies or disappears: tell the doctor today. If it stays well for 10 days: show the doctor
   (the guideline allows a change only with the 5-visit schedule, and only the doctor decides).
5. **Find care offline.** The 284 official Model Anti-Rabies Clinics (NRCP list, 26 March 2026),
   searchable without data, sorted by distance when location is allowed. Helplines. Nearby
   hospitals from OpenStreetMap when online. Honest about gaps: the official list has no clinics
   in Tamil Nadu, so for Tamil Nadu the app points to government hospitals and PHCs (the state
   plan says the vaccine is on the essential drug list for all government facilities including
   PHCs, and immunoglobulin is available only in district hospitals).
6. **A record the clinic can use.** A bite card with the same fields as the government's Animal
   Bite Exposure Register (NRCP 2019, Annexure IV), printable and as a QR code any phone camera
   can read.
7. **Myths, answered with sources.** Diet restrictions, vaccinated dogs, pregnancy, children's
   dose, "watch the dog for 10 days first", rats, the vaccine causing rabies, milk.

## Non-goals

- **Not a doctor.** Uyir never tells anyone to skip or stop a dose, never gives a dose amount, and
  never says a bite is safe. The doctor decides; the app prepares the person and helps them follow
  through. When in doubt, the guideline says to start PEP, and so does the app.
- No accounts, no server, no analytics. Everything stays on the phone.
- Not a clinic register or a stock tracker (no server to make that trustworthy).
- No dosage calculator for immunoglobulin, even though the weights are in the guideline: that is
  for the clinic.

## Safety rules for the content

1. One source for every medical statement, shown in the app, with page or section.
2. Use the guideline's words where possible; plain-language rewrites must not change meaning.
3. Directive language only for what the guideline says to do (wash, go today, don't apply
   irritants). Everything else is "ask the doctor".
4. Snake vs animal is the first fork, because the first-aid rules conflict.
5. Late is never too late: the guideline says people who come months later should be treated as
   if the bite were recent. The app says so whenever the bite date is old.

## How it works (technical)

- React + TypeScript + Vite, installable PWA, works offline after the first visit.
- `src/engine/` is pure TypeScript with unit tests: calendar-day arithmetic, the regimens, the
  dose plan and its rules, the exposure assessment, the animal watch, the calendar file, the
  bite record, clinic search and distance.
- `scripts/` turns the official PDFs into data: text extraction (pdf.js), page scans out of the
  scanned 2019 guideline, the clinic table parsed by column position, coordinates from
  OpenStreetMap Nominatim (one-off, cached, checked against the clinic's state).
- Voice: the browser's speech synthesis in en-IN, ta-IN or hi-IN when the phone has the voice;
  the screen stays on during the wash timer (Wake Lock API).
- Online extras, only when the person asks: nearby hospitals (OpenStreetMap Overpass API).

## Design direction

- **Signature:** the wash timer, a circle that fills with water over 15 minutes while a voice
  walks through the steps. Second: the vaccination plan drawn as the clinic's paper card, each
  dose taken marked with a rubber-stamp circle in stamp-pad violet ink, the way Indian clinics
  mark cards.
- **Colour:** paper `#F7F8F6`, ink `#14212B`, water `#0B6FA4`, stamp violet `#4B3F9E`, urgent red
  `#C3362B`, due amber `#A85F00`. Status always has an icon and words, never colour alone.
- **Type:** Mukta (Latin and Devanagari) and Mukta Malar (Tamil), one family across all three
  languages, chosen for legibility on low-resolution screens. Body 17 px; the timer in tabular
  figures.
- **Layout:** phone first, one column, bottom navigation within thumb reach; in an emergency one
  instruction per screen and buttons at least 56 px tall.
