// Hospitals near a point, from OpenStreetMap through the Overpass API. Online only, and only
// when the person asks. Small clinics are left out unless their name says they are a
// government health centre, since a private clinic rarely stocks rabies vaccine.
import { distanceKm } from '../engine/clinics';

export interface Place {
  id: string;
  name: string;
  lat: number;
  lon: number;
  km: number;
  phone?: string;
}

const ENDPOINT = 'https://overpass-api.de/api/interpreter';
const PUBLIC_CLINIC = '(Primary Health|PHC|Community Health|CHC|Government|Govt|ESI|Taluk|District|Urban Health|Sub.?District)';

export function overpassQuery(lat: number, lon: number, radiusM: number): string {
  const around = `(around:${radiusM},${lat.toFixed(5)},${lon.toFixed(5)})`;
  return `[out:json][timeout:20];(nwr["amenity"="hospital"]${around};nwr["healthcare"="hospital"]${around};nwr["amenity"="clinic"]["name"~"${PUBLIC_CLINIC}",i]${around};nwr["healthcare"="centre"]["name"~"${PUBLIC_CLINIC}",i]${around};);out center tags 80;`;
}

interface Element {
  type: string;
  id: number;
  lat?: number;
  lon?: number;
  center?: { lat: number; lon: number };
  tags?: Record<string, string>;
}

export function parsePlaces(json: { elements?: Element[] }, lat: number, lon: number): Place[] {
  const seen = new Set<string>();
  const out: Place[] = [];
  for (const e of json.elements ?? []) {
    const p = e.center ?? (e.lat !== undefined && e.lon !== undefined ? { lat: e.lat, lon: e.lon } : null);
    const name = e.tags?.name ?? e.tags?.['name:en'];
    if (!p || !name) continue;
    const key = name.toLowerCase();
    if (seen.has(key)) continue;
    seen.add(key);
    out.push({
      id: `${e.type}/${e.id}`,
      name,
      lat: p.lat,
      lon: p.lon,
      km: distanceKm(lat, lon, p.lat, p.lon),
      phone: e.tags?.phone ?? e.tags?.['contact:phone'],
    });
  }
  return out.sort((a, b) => a.km - b.km).slice(0, 25);
}

export async function nearbyHospitals(lat: number, lon: number, signal?: AbortSignal): Promise<Place[]> {
  const res = await fetch(ENDPOINT, {
    method: 'POST',
    body: new URLSearchParams({ data: overpassQuery(lat, lon, 15_000) }),
    signal,
  });
  if (!res.ok) throw new Error(`Overpass ${res.status}`);
  return parsePlaces(await res.json(), lat, lon);
}
