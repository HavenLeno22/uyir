# Sources: where every rule and statement comes from

Uyir gives medical guidance, so each piece of it is traced here to an Indian government
document (or, for the numbers, a peer-reviewed study or ministry figures). Page numbers are the
documents' own printed numbers. The app shows the same citation under each statement.

Checked on 25 October 2026. The PDFs are not in the repository (they are the government's); the
download links are below, and `scripts/` can rebuild everything from them.

## Documents

| Short name in the app | Document | Link |
|---|---|---|
| National Guidelines, 2019 | National Guidelines for Rabies Prophylaxis, National Rabies Control Programme (NRCP), NCDC, MoHFW. A scanned PDF: `scripts/extract-pdf-scans.mjs` pulls out the page images so it could be read | [PDF](https://rabiesfreeindia.mohfw.gov.in/resources/uploads/PageContentPdf/171214085536.pdf) |
| NRCP wound management guidelines | Rabies Post Exposure Prophylaxis: Wound Management Guidelines, NRCP (2023) | [PDF](https://rabiesfreeindia.mohfw.gov.in/resources/uploads/PageContentPdf/169391055721.pdf) |
| NRCP FAQ | Frequently Asked Questions on rabiesfreeindia.mohfw.gov.in (page updated 23 October 2026), including the Rabies Helpline notice | [Page](https://rabiesfreeindia.mohfw.gov.in/faq) |
| NRCP clinic list | List of Anti Rabies Clinic under NRCP, last updated 26 March 2026 (284 Model Anti-Rabies Clinics) | [PDF](https://rabiesfreeindia.mohfw.gov.in/resources/uploads/PageContentPdf/177452428483.pdf) |
| NCDC advisory note | Advisory/guidance note for preventing shortage of rabies vaccine and anti-rabies serum, re-issued June 2026 | [PDF](https://rabiesfreeindia.mohfw.gov.in/resources/uploads/PageContentPdf/178480497866.pdf) |
| Tamil Nadu State Action Plan | State Action Plan for Dog Mediated Rabies Elimination from Tamil Nadu by 2030, DPH&PM, Government of Tamil Nadu (2025) | [PDF](https://rabiesfreeindia.mohfw.gov.in/resources/uploads/PageContentPdf/174419151310.pdf) |
| MoHFW snakebite guidelines, 2017 | Standard Treatment Guidelines: Management of Snake Bite, MoHFW (August 2017) | [PDF](https://ncdc.mohfw.gov.in/uploads/pdf/Standard-Treatment-Guidelines-for-Management-of-Snake-Bite.pdf) |
| ICMR–NIE, 2025 | Estimates of the burden of human rabies deaths and animal bites in India, 2022–23. *Lancet Infectious Diseases* (2025) | [DOI 10.1016/S1473-3099(24)00490-0](https://doi.org/10.1016/S1473-3099(24)00490-0) |
| Debnath et al., 2025 | Compliance of PEP following animal bite in Indian population: systematic review and meta-analysis. *J Family Med Prim Care* (2025) | [PMC12488117](https://pmc.ncbi.nlm.nih.gov/articles/PMC12488117/) |
| Suraweera et al., 2020 | Trends in snakebite deaths in India from 2000 to 2019. *eLife* 9:e54076 | [eLife](https://elifesciences.org/articles/54076) |
| The Tribune | 2024 dog bite and rabies death figures (Ministry of Fisheries, Animal Husbandry and Dairying data) | [Article](https://www.tribuneindia.com/news/delhi/sc-takes-suo-motu-note-of-fatal-stray-dog-attacks) |

## The dose plan (`src/engine/regimens.ts`, `src/engine/plan.ts`)

| Rule in the app | Source |
|---|---|
| 4-visit intradermal schedule: days 0, 3, 7, 28; two 0.1 ml injections per visit, one on each upper arm (Updated Thai Red Cross) | National Guidelines 2019, section 4.1.3, page 15; summary table, section 10, page 24 |
| 5-visit intramuscular schedule: days 0, 3, 7, 14, 28; upper arm, thigh for infants and small children, not the buttock (Essen) | Section 4.2.1–4.2.2, page 17; section 10, page 24 |
| Day 0 is the date of the first dose | Sections 4.1.3 and 4.2.1 |
| Re-exposure with documented complete PEP/PrEP: days 0 and 3, no immunoglobulin; within three months, wound washing only; no proof or partial course means a full new course | Section 5, page 19 |
| Pre-exposure: days 0 and 7, booster on day 21 or 28 | Section 7.2, page 21 |
| First three doses within 10 days of the first; "one or two days deviation do not necessitate re-starting"; a missed early dose may need extra doses (the app says: see the doctor) | Section 8, page 22 |
| Immunoglobulin "not indicated beyond the seventh day" after the first vaccine dose (the app's countdown) | Section 2.9, page 9; NRCP FAQ Q 8 |
| A switch of vaccine brand or route does not restart the course | Section 4.2.2, pages 17–18 |
| After each injection: do not rub the spot or apply anything | Section 4.1.3.4, page 16 |
| No food restrictions; avoid excess alcohol | FAQ 3, page 33 |
| Mild local reactions are common | FAQ 18, page 36 |
| Symptoms usually 2–3 months after exposure, sometimes days, sometimes over six months | NRCP FAQ Q 12 |

The app never moves, skips or restarts a dose by itself. Late doses produce a message; a dose is
marked "left out" only by the person, after a confirmation that says only a doctor can decide it.

## The exposure check (`src/engine/exposure.ts`)

| Rule | Source |
|---|---|
| Categories I, II, III by type of contact | Table 1, page 5 |
| Bites by wild animals and all bites in forest areas are Category III | Table 1 note, page 5; section 2.1, page 3 |
| A bleeding wound means severe exposure and immunoglobulin | Section 2.6.1.1, page 7 |
| Category I: no PEP if the history is reliable; "When in doubt PEP should be initiated" | Table 1, page 5; section 2.5, page 4 |
| House rodents, hares and rabbits do not ordinarily need PEP; forest rodents do; unsure species (mole, mongoose) gets PEP | Section 2.1, page 3; FAQ 13, page 35 |
| Bats: the 2019 guideline does not call for PEP in India (bat rabies not conclusively proven) | Section 2.1, page 3 |
| Close contact with a rabies patient's secretions may be offered PEP | Section 2.1, page 3 |
| Weak immunity: immunoglobulin in Category II and III, full intramuscular course | Section 6, page 20; section 2.7.1, page 8 |
| Chloroquine or hydroxychloroquine: intramuscular route | Section 2.5, page 4; section 4.1, page 14 |
| A vaccinated or provoked animal does not change the need for PEP | Sections 2.3–2.4, pages 3–4; FAQ 4, page 33 |
| Do not wait 10 days watching the animal before starting | FAQ 9, page 34 |
| People who come months later are treated as if the bite were recent | Section 2.5, page 4 |
| Tetanus and antibiotics are the doctor's decision | Section 2.6.1.3, page 8 |

## The 10-day animal watch (`src/engine/watch.ts`)

The 10-day observation applies to dogs and cats only. If the animal stays healthy, the
intramuscular course may be changed by the doctor (skip day 14, keep day 28); with the
intradermal course the full course is still given (section 2.2, page 3; FAQ 9, page 34). The app
shows this as information for the doctor and never changes the plan.

## Wound washing (`src/ui/Wash.tsx`)

| Step | Source |
|---|---|
| Wash with soap (or detergent) and running water for up to 15 minutes; water alone if no soap | NRCP FAQ Q 7; wound management guidelines, SOP, page 3; National Guidelines section 2.6.1.1, page 6 |
| "Wound washing is the most effective first-aid treatment against rabies" | NRCP FAQ Q 7 |
| Rinse eyes and mouth with water if saliva got in | Section 2.6.1.1, page 7 |
| No chilli, turmeric, lime, oil, salt, herbs; if applied, wash them off gently | Section 2.6.1.1, page 7; FAQ 2, page 33; wound management guidelines, page 3 |
| No burning or acid (cauterisation) | Wound management guidelines, page 3 |
| Then an antiseptic such as povidone-iodine | Section 2.6.1.1, page 7; NRCP FAQ Q 7 |
| Wash even if the person comes late, while the wound is unhealed | Section 2.6.1.1, page 7 |

## Snakebite first aid (`src/ui/Snake.tsx`)

All from the MoHFW Standard Treatment Guidelines, 2017, "First aid measures" and "Important
don'ts", pages 7–9: reassure (about 70% of snakebites are from non-venomous species); immobilise
the limb like a fracture with a splint, without blocking blood supply; recovery position on the
left side; nothing by mouth; transport quickly and passively (ambulance 102/108; on a motorbike a
third person sits behind); the victim must not run or drive; remove rings, watches, jewellery,
shoes and tight clothing; leave blisters; report new symptoms such as spreading swelling or
drooping eyelids. Don'ts: do not kill or catch the snake; no traditional remedies or black stone;
do not wash or interfere with the wound (cutting, suction, rubbing, herbs, chemicals, ice,
cautery); no tourniquet. Kraits bite at night, often people sleeping on the floor (page 1), and
may leave no local mark (page 7).

## Where to go (`src/ui/Care.tsx`)

| Statement | Source |
|---|---|
| Rabies vaccine and serum are on the NHM essential drug list, budgeted under the national free drug initiative | NCDC advisory note (June 2026), point 8 |
| Tamil Nadu: vaccine mandated in all government health facilities including PHCs | Tamil Nadu State Action Plan, page 64 |
| Tamil Nadu: immunoglobulin available only in district hospitals | Tamil Nadu State Action Plan, page 39 |
| Helpline 15400: toll-free, 16 hours a day, every day; also takes snakebite queries; serves Andhra Pradesh, Madhya Pradesh, Assam, Puducherry and Delhi | NRCP website, Rabies Helpline notice |
| 284 Model Anti-Rabies Clinics in 23 states/UTs; none listed for Tamil Nadu, Bihar or Madhya Pradesh | NRCP clinic list (26 March 2026), parsed by `scripts/build-clinics.mjs` |

## Myths and facts (`src/data/cites.ts`, `MYTH_CITES`)

Each myth's fact cites its page in the app: irritants (FAQ 2), diet (FAQ 3), vaccinated dog
(section 2.3), the 10-day wait (FAQ 9), injection count and site (section 10), pregnancy (FAQ 10),
children's dose is the same (section 3.1), the vaccine cannot cause rabies (FAQ 15), missed
doses (section 8), symptom timing (NRCP FAQ Q 12), fatal once symptomatic but preventable (wound
management guidelines, page 1), rat bites (FAQ 13), milk (NRCP FAQ Q 9: no PEP needed for milk or
milk products), and the two snakebite myths (MoHFW 2017, page 8).

## Numbers on the Learn screen

| Number | Source |
|---|---|
| 37,15,713 dog bites in India in 2024; Tamil Nadu 4,80,427, second after Maharashtra | The Tribune, ministry data |
| About 5,726 rabies deaths a year (modelled estimate) vs 54 officially reported in 2024 (IDSP-IHIP) | ICMR–NIE, *Lancet Infect Dis* 2025; The Tribune |
| 57% pooled PEP compliance (95% CI 48–66%), 30 Indian studies, about 35,600 people | Debnath et al., 2025 |
| About 58,000 snakebite deaths a year on average, 2000–2019 | Suraweera et al., *eLife* 2020 |

## Not from a guideline (and labelled as such in the code)

- Reminder times (6 p.m. the evening before, and at the visit) are a design choice.
- Clinic coordinates come from OpenStreetMap Nominatim: the hospital itself (60 clinics), its town
  or village (35), its PIN code centre (56), or the district centre (133). The app marks the
  district-centre distances with "~".
- The Tamil and Hindi wording is my translation of the English and should be reviewed by native
  speakers, especially the medical lines.
