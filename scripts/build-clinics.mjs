// Builds src/data/clinics.json from the official NRCP "List of Anti Rabies Clinic"
// (rabiesfreeindia.mohfw.gov.in, last updated 26 March 2026).
//
//   node scripts/build-clinics.mjs data-sources/nrcp-anti-rabies-clinics-2026-03.pdf
//
// The PDF is a table: one numbered line per clinic, with long cells wrapped above and below
// that line. Each piece of text is put in a column by its horizontal centre and in a row by
// the nearest numbered line. Doctors' names and email addresses are left out on purpose:
// the app only needs the facility and a number to call. Coordinates come from
// scripts/clinic-geocodes.json (see geocode-clinics.mjs) when present.
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { getDocument } from 'pdfjs-dist/legacy/build/pdf.mjs';

const file = process.argv[2] ?? 'data-sources/nrcp-anti-rabies-clinics-2026-03.pdf';
const OUT = 'src/data/clinics.json';
const GEOCODES = 'scripts/clinic-geocodes.json';

// Column edges in PDF points, between the centres of neighbouring columns (checked against
// every page: the header sits at the same place throughout).
const EDGES = [88, 166, 286, 455, 558];
const COLS = ['sno', 'state', 'district', 'facility', 'contact', 'email'];
const column = (cx) => COLS[EDGES.findIndex((e) => cx < e) === -1 ? COLS.length - 1 : EDGES.findIndex((e) => cx < e)];

// Keyed by the state cell with everything but letters removed, lower case.
const DNHDD = 'Dadra and Nagar Haveli and Daman and Diu';
const STATE_NAMES = {
  andhrapradesh: 'Andhra Pradesh',
  chandigarh: 'Chandigarh',
  chhattisgarh: 'Chhattisgarh',
  dadarnagarhavelidamandiu: DNHDD,
  dadranagarhaveli: DNHDD,
  daman: DNHDD,
  diu: DNHDD,
  delhi: 'Delhi',
  goa: 'Goa',
  gujarat: 'Gujarat',
  jammu: 'Jammu and Kashmir',
  kashmir: 'Jammu and Kashmir',
  jharkhand: 'Jharkhand',
  karnataka: 'Karnataka',
  kerala: 'Kerala',
  ladakh: 'Ladakh',
  maharashtra: 'Maharashtra',
  manipur: 'Manipur',
  meghalaya: 'Meghalaya',
  puducherry: 'Puducherry',
  punjab: 'Punjab',
  rajasthan: 'Rajasthan',
  sikkim: 'Sikkim',
  tripura: 'Tripura',
  uttarpradesh: 'Uttar Pradesh',
  uttarakhand: 'Uttarakhand',
  westbengal: 'West Bengal',
};
// First digit of a PIN code by state (India Post zones), to reject numbers that are not PINs.
const PIN_ZONE = {
  'Andhra Pradesh': '5', Chandigarh: '1', Chhattisgarh: '4', [DNHDD]: '3',
  Delhi: '1', Goa: '4', Gujarat: '3', 'Jammu and Kashmir': '1', Jharkhand: '8', Karnataka: '5', Kerala: '6',
  Ladakh: '1', Maharashtra: '4', Manipur: '7', Meghalaya: '7', Puducherry: '6', Punjab: '1', Rajasthan: '3',
  Sikkim: '7', Tripura: '7', 'Uttar Pradesh': '2', Uttarakhand: '2', 'West Bengal': '7',
};

const clean = (s) =>
  s
    .replace(/\s+/g, ' ')
    .replace(/\s+([,.)])/g, '$1')
    .replace(/\(\s+/g, '(')
    .replace(/,(?=\S)/g, ', ')
    .replace(/\b(Dr|Govt|Pt)\s*\.\s*/g, '$1. ')
    .replace(/\s+-\s+(?=\d)/g, ' - ')
    .trim();

/** A number a person can dial: a 10-digit mobile, or a landline written with its STD code. */
const dialable = (d) => /^[6-9]\d{9}$/.test(d) || /^0\d{10}$/.test(d);

/**
 * Dialable numbers in a contact cell. Numbers are sometimes split into groups
 * ("94196 - 80490"), so neighbouring digit groups are joined until they make a number.
 */
function phones(text) {
  const out = [];
  let acc = '';
  for (const g of text.match(/\d+/g) ?? []) {
    if (acc && !dialable(acc) && (acc + g).length <= 11) acc += g;
    else {
      if (dialable(acc)) out.push(acc);
      acc = g;
    }
  }
  if (dialable(acc)) out.push(acc);
  return [...new Set(out)];
}

const data = new Uint8Array(readFileSync(file));
const pdf = await getDocument({ data, useSystemFonts: true, disableFontFace: true, verbosity: 0 }).promise;

const rows = [];
for (let n = 1; n <= pdf.numPages; n++) {
  const page = await pdf.getPage(n);
  const { items } = await page.getTextContent();
  const parts = items
    .filter((it) => 'str' in it && it.str.trim() !== '')
    .map((it) => ({ x: it.transform[4], y: it.transform[5], w: it.width, str: it.str }));
  // Everything at or above the last header line ("( Address)") is header or title.
  const headerEnd = parts.find((p) => p.str.includes('Address)'));
  const body = parts.filter((p) => !headerEnd || p.y < headerEnd.y - 2);
  const anchors = body.filter((p) => column(p.x + p.w / 2) === 'sno' && /^\d{1,4}$/.test(p.str.trim()));
  const pageRows = anchors.map((a) => ({ sno: Number(a.str.trim()), y: a.y, cells: Object.fromEntries(COLS.map((c) => [c, []])) }));
  for (const p of body) {
    const col = column(p.x + p.w / 2);
    if (col === 'sno') continue;
    let best = null;
    for (const r of pageRows) if (!best || Math.abs(r.y - p.y) < Math.abs(best.y - p.y)) best = r;
    if (best) best.cells[col].push(p);
  }
  for (const r of pageRows) {
    const text = {};
    for (const c of COLS) {
      const ps = r.cells[c].sort((a, b) => b.y - a.y || a.x - b.x);
      // Lines of a cell are joined with a newline so separate phone numbers stay apart.
      const lines = [];
      for (const p of ps) {
        const last = lines[lines.length - 1];
        if (last && Math.abs(last.y - p.y) < 3) last.str += ' ' + p.str;
        else lines.push({ y: p.y, str: p.str });
      }
      text[c] = lines.map((l) => l.str).join('\n');
    }
    rows.push({ ...text, sno: r.sno, page: n });
  }
}

const geocodes = existsSync(GEOCODES) ? JSON.parse(readFileSync(GEOCODES, 'utf8')) : {};
const problems = [];
const clinics = rows
  .sort((a, b) => a.sno - b.sno)
  .map((r) => {
    const state = STATE_NAMES[r.state.toLowerCase().replace(/[^a-z]/g, '')];
    if (!state) problems.push(`#${r.sno}: unknown state "${r.state}"`);
    const district = clean(r.district.replace(/\n/g, ' ')).replace(/^(GGH|DH|KGH|TH|AH)\s*,\s*/i, '');
    const facility = clean(r.facility.replace(/\n/g, ' '));
    const pinMatch = [...facility.matchAll(/\b(\d{3})\s?(\d{3})\b/g)]
      .map((m) => m[1] + m[2])
      .find((pin) => pin[0] === PIN_ZONE[state]);
    const nums = phones(r.contact);
    const contactGiven = /\d/.test(r.contact);
    if (contactGiven && nums.length === 0) problems.push(`#${r.sno}: no dialable number in "${clean(r.contact)}"`);
    const id = `nrcp-${r.sno}`;
    const geo = geocodes[id];
    return {
      id,
      state: state ?? clean(r.state),
      district,
      facility,
      ...(pinMatch ? { pin: pinMatch } : {}),
      phones: nums,
      ...(contactGiven && nums.length === 0 ? { phoneUnreadable: true } : {}),
      ...(geo ? { lat: geo.lat, lon: geo.lon, geo: geo.precision } : {}),
    };
  });

for (let i = 1; i <= clinics.length; i++) if (!clinics.some((c) => c.id === `nrcp-${i}`)) problems.push(`missing #${i}`);

const out = {
  source: {
    title: 'List of Anti Rabies Clinic under NRCP',
    publisher: 'National Rabies Control Programme, NCDC, Ministry of Health and Family Welfare',
    updated: '2026-03-26',
    url: 'https://rabiesfreeindia.mohfw.gov.in/resources/uploads/PageContentPdf/177452428483.pdf',
  },
  clinics,
};
writeFileSync(OUT, JSON.stringify(out, null, 1) + '\n', 'utf8');

const byState = {};
for (const c of clinics) byState[c.state] = (byState[c.state] ?? 0) + 1;
console.log(`${clinics.length} clinics -> ${OUT}`);
console.log(byState);
console.log(`with PIN: ${clinics.filter((c) => c.pin).length}, with phone: ${clinics.filter((c) => c.phones.length).length}, with coordinates: ${clinics.filter((c) => c.lat).length}`);
if (problems.length) console.log('Check by hand:\n  ' + problems.join('\n  '));
