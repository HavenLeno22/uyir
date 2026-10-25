# Source documents

The government PDFs the app's content and clinic list come from are not kept in this repository.
To re-run the scripts, download them here under these names:

| File | Download |
|---|---|
| `nrcp-guidelines-2019.pdf` | [National Guidelines for Rabies Prophylaxis, 2019](https://rabiesfreeindia.mohfw.gov.in/resources/uploads/PageContentPdf/171214085536.pdf) |
| `nrcp-wound-washing.pdf` | [Rabies PEP: Wound Management Guidelines](https://rabiesfreeindia.mohfw.gov.in/resources/uploads/PageContentPdf/169391055721.pdf) |
| `nrcp-anti-rabies-clinics-2026-03.pdf` | [List of Anti Rabies Clinic under NRCP, 26 March 2026](https://rabiesfreeindia.mohfw.gov.in/resources/uploads/PageContentPdf/177452428483.pdf) |
| `tn-sapre.pdf` | [Tamil Nadu State Action Plan for Rabies Elimination](https://rabiesfreeindia.mohfw.gov.in/resources/uploads/PageContentPdf/174419151310.pdf) |
| `nrcp-vaccine-shortage-note.pdf` | [NCDC advisory note, June 2026](https://rabiesfreeindia.mohfw.gov.in/resources/uploads/PageContentPdf/178480497866.pdf) |
| `snakebite-stg-2017.pdf` | [MoHFW Standard Treatment Guidelines: Snake Bite, 2017](https://ncdc.mohfw.gov.in/uploads/pdf/Standard-Treatment-Guidelines-for-Management-of-Snake-Bite.pdf) |

```bash
node scripts/extract-pdf-text.mjs data-sources/nrcp-wound-washing.pdf
node scripts/extract-pdf-scans.mjs data-sources/nrcp-guidelines-2019.pdf <folder-for-page-images>
node scripts/build-clinics.mjs data-sources/nrcp-anti-rabies-clinics-2026-03.pdf
```

See [docs/sources.md](../docs/sources.md) for where each rule in the app comes from.
