// One-off: approximate coordinates for each clinic, so the app can sort clinics by distance
// without a network connection. Uses OpenStreetMap Nominatim within its usage policy (one
// request at a time, at most one per second, identified, results cached and never re-asked).
//
//   node scripts/geocode-clinics.mjs            first pass: PIN code centre, else district centre
//   node scripts/geocode-clinics.mjs --refine   second pass for district-level clinics: the
//                                               facility itself, else its town
//   node scripts/build-clinics.mjs              then rebuild src/data/clinics.json
//
// A result is kept only if Nominatim places it in the clinic's state; refined results must also
// lie within 60 km of the district centre, so a same-named place elsewhere cannot slip in.
// Data © OpenStreetMap contributors (ODbL).
import { existsSync, readFileSync, writeFileSync } from 'node:fs';

const CACHE = 'scripts/clinic-geocodes.json';
const QUERIES = 'scripts/.geocode-queries.json';
const REFINE = process.argv.includes('--refine');
const { clinics } = JSON.parse(readFileSync('src/data/clinics.json', 'utf8'));
const cache = existsSync(CACHE) ? JSON.parse(readFileSync(CACHE, 'utf8')) : {};
const queries = existsSync(QUERIES) ? JSON.parse(readFileSync(QUERIES, 'utf8')) : {};

// District cells that are abbreviations or hospital names in the official list.
const ALIAS = {
  'Karnataka|DK': 'Dakshina Kannada',
  'Karnataka|UK': 'Uttara Kannada',
  'Karnataka|Gulbarga': 'Kalaburagi',
  'Andhra Pradesh|SVRRGGH': 'Tirupati',
  'Uttarakhand|U S Nagar': 'Udham Singh Nagar',
  // Spellings in the official list that OpenStreetMap does not know.
  'Karnataka|Ramangara': 'Ramanagara',
  'Kerala|Thrishur': 'Thrissur',
  'Punjab|Malarkotla': 'Malerkotla',
  'Rajasthan|Dungerpur': 'Dungarpur',
  'Rajasthan|Rajsamnd': 'Rajsamand',
  'Rajasthan|S.ganaganagar': 'Sri Ganganagar',
};
// Nominatim's name for the state, where it differs from the list's.
const OSM_STATE = { Delhi: 'Delhi', 'Jammu and Kashmir': 'Jammu and Kashmir' };

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let last = 0;
async function nominatim(params) {
  const key = new URLSearchParams(params).toString();
  if (key in queries) return queries[key];
  const wait = last + 1200 - Date.now();
  if (wait > 0) await sleep(wait);
  last = Date.now();
  const url = `https://nominatim.openstreetmap.org/search?${key}&format=jsonv2&addressdetails=1&limit=1&countrycodes=in`;
  const res = await fetch(url, { headers: { 'User-Agent': 'Uyir/1.0 (one-off geocoding of the NRCP anti-rabies clinic list for an offline first-aid app)' } });
  if (!res.ok) throw new Error(`${res.status} for ${url}`);
  const [hit] = await res.json();
  queries[key] = hit ? { lat: Number(hit.lat), lon: Number(hit.lon), state: hit.address?.state ?? '', type: hit.type ?? '' } : null;
  writeFileSync(QUERIES, JSON.stringify(queries, null, 1));
  return queries[key];
}

const sameState = (hit, state) => {
  const a = hit.state.toLowerCase();
  const b = (OSM_STATE[state] ?? state).toLowerCase();
  return a === b || a.includes(b) || b.includes(a) || (b.startsWith('dadra') && a.includes('daman'));
};

function km(a, b) {
  const R = 6371;
  const r = (d) => (d * Math.PI) / 180;
  const h = Math.sin(r(b.lat - a.lat) / 2) ** 2 + Math.cos(r(a.lat)) * Math.cos(r(b.lat)) * Math.sin(r(b.lon - a.lon) / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const HEALTH_TYPES = /^(hospital|clinic|doctors|healthcare)$/;
const PLACE_TYPES = /^(city|town|village|suburb|neighbourhood|quarter|hamlet|locality|isolated_dwelling|administrative)$/;

// Words that name the kind of facility, not the place.
const FACILITY_WORDS =
  /\b(government|govt|general|district|sub|taluk|taluka|area|civil|community|primary|urban|rural|health|centre|center|hospital|hospitals|medical|college|institute|research|teaching|memorial|super|speciality|specialty|infectious|diseases|epidemic|model|anti|rabies|clinic|dh|sdh|chc|phc|uhc|rhtc|ggh|ah|th|esi|esic|ntphc|gmc|gmch|thqh|mims|kims|rims|hims|bims|krims|koims|igmc|aiims|and|of|the|p\.o|dist|disrtict|distict|districtb|road|rd|near|opp|ward|block|phase|sector|no|main|emergency|hoapital|hosptal|satelite|physician|old|base|jila|sanyukt|chikitsalaya)\b\.?/gi;

/** The place name in a facility line: "Taluk Hospital, Doddballapur" → "Doddballapur". */
function townOf(c) {
  const parts = c.facility
    .replace(/\(.*?\)/g, ' ')
    .replace(/\b\d{3}\s?\d{3}\b|\b\d+\b/g, ' ')
    .split(/[,\-–]/)
    .map((p) => p.replace(FACILITY_WORDS, ' ').replace(/[^A-Za-z .]/g, ' ').replace(/\s+/g, ' ').trim())
    .filter((p) => p.length >= 3);
  // The last named part is usually the town; skip it if it is just the district or the state.
  const district = (ALIAS[`${c.state}|${c.district}`] ?? c.district).toLowerCase();
  for (let i = parts.length - 1; i >= 0; i--) {
    const p = parts[i].toLowerCase();
    if (p !== district && p !== c.state.toLowerCase()) return parts[i];
  }
  return null;
}

if (process.argv.includes('--towns')) {
  // Review the town names the refine pass would look up, without asking Nominatim anything.
  for (const c of clinics) if (cache[c.id]?.precision === 'district') console.log(`${c.id}\t${townOf(c) ?? '-'}\t${c.facility}`);
  process.exit(0);
}

let done = 0;
for (const c of clinics) {
  const district = ALIAS[`${c.state}|${c.district}`] ?? c.district;
  if (!REFINE) {
    if (cache[c.id]) continue;
    let hit = null;
    let precision = null;
    if (c.pin) {
      hit = await nominatim({ postalcode: c.pin });
      if (hit && sameState(hit, c.state)) precision = 'pin';
      else hit = null;
    }
    if (!hit) {
      hit = await nominatim({ q: `${district}, ${c.state}` });
      if (hit && sameState(hit, c.state)) precision = 'district';
      else hit = null;
    }
    if (hit) cache[c.id] = { lat: Math.round(hit.lat * 1000) / 1000, lon: Math.round(hit.lon * 1000) / 1000, precision };
    else console.log(`no match: ${c.id} ${c.district}, ${c.state}`);
  } else {
    const base = cache[c.id];
    if (!base || base.precision !== 'district') continue;
    const within = (hit, limit) => hit && sameState(hit, c.state) && km(base, hit) <= limit;
    // The hospital itself, if OpenStreetMap knows it, close to the district centre.
    let hit = await nominatim({ q: `${c.facility}, ${district}, ${c.state}` });
    let precision = within(hit, 30) && HEALTH_TYPES.test(hit.type) ? 'facility' : null;
    if (!precision) {
      // Otherwise the town or village named in the facility line, which must be a place.
      const town = townOf(c);
      if (town) {
        hit = await nominatim({ q: `${town}, ${district}, ${c.state}` });
        if (within(hit, 60) && PLACE_TYPES.test(hit.type) && km(base, hit) > 0.5) precision = 'town';
      }
    }
    if (precision) cache[c.id] = { lat: Math.round(hit.lat * 1000) / 1000, lon: Math.round(hit.lon * 1000) / 1000, precision };
  }
  writeFileSync(CACHE, JSON.stringify(cache, null, 1) + '\n');
  if (++done % 20 === 0) console.log(`${done} clinics looked up`);
}
const counts = {};
for (const v of Object.values(cache)) counts[v.precision] = (counts[v.precision] ?? 0) + 1;
console.log(`${Object.keys(cache).length} of ${clinics.length} clinics have coordinates`, counts);
