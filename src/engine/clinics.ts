// The official Model Anti-Rabies Clinics: search and distance, all offline.

export interface Clinic {
  id: string;
  state: string;
  district: string;
  facility: string;
  pin?: string;
  phones: string[];
  /** The official list gives a number for this clinic, but it cannot be dialled as printed. */
  phoneUnreadable?: boolean;
  lat?: number;
  lon?: number;
  /**
   * How the position was found: the hospital itself on OpenStreetMap, its town or village, the
   * centre of its PIN code area, or (roughest) the centre of its district.
   */
  geo?: 'facility' | 'town' | 'pin' | 'district';
}

/** Great-circle distance in km. */
export function distanceKm(lat1: number, lon1: number, lat2: number, lon2: number): number {
  const R = 6371;
  const toRad = (d: number) => (d * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}

const fold = (s: string) => s.toLowerCase().normalize('NFKD').replace(/[^a-z0-9 ]+/g, ' ').replace(/\s+/g, ' ').trim();

/** Clinics matching every word of the query, in state, district or facility. */
export function searchClinics(clinics: Clinic[], query: string, state?: string): Clinic[] {
  const words = fold(query).split(' ').filter(Boolean);
  return clinics.filter((c) => {
    if (state && c.state !== state) return false;
    const hay = fold(`${c.facility} ${c.district} ${c.state} ${c.pin ?? ''}`);
    return words.every((w) => hay.includes(w));
  });
}

export interface NearClinic {
  clinic: Clinic;
  km: number;
  approximate: boolean;
}

export function nearestClinics(clinics: Clinic[], lat: number, lon: number, limit = 10): NearClinic[] {
  return clinics
    .filter((c) => c.lat !== undefined && c.lon !== undefined)
    .map((c) => ({ clinic: c, km: distanceKm(lat, lon, c.lat as number, c.lon as number), approximate: c.geo === 'district' }))
    .sort((a, b) => a.km - b.km)
    .slice(0, limit);
}

export function statesOf(clinics: Clinic[]): string[] {
  return [...new Set(clinics.map((c) => c.state))].sort((a, b) => a.localeCompare(b));
}

/** tel: link: mobiles get +91, landlines keep their leading 0 and STD code. */
export function telHref(phone: string): string {
  return phone.startsWith('0') ? `tel:${phone}` : `tel:+91${phone}`;
}

/** 98765 43210 · 079 2268 3721 */
export function formatPhone(phone: string): string {
  if (phone.startsWith('0')) return `${phone.slice(0, 3)} ${phone.slice(3, 7)} ${phone.slice(7)}`;
  return `${phone.slice(0, 5)} ${phone.slice(5)}`;
}
