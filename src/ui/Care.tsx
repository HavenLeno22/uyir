// Where to go: helplines, what kind of facility, the official anti-rabies clinic list (offline,
// searchable, sorted by distance when location is allowed), and nearby hospitals from
// OpenStreetMap when online.
import { LocateFixed, Navigation, Phone, Search } from 'lucide-react';
import { useId, useMemo, useRef, useState } from 'react';
import clinicData from '../data/clinics.json';
import { CARE_CITES } from '../data/cites';
import { formatPhone, nearestClinics, searchClinics, statesOf, telHref, type Clinic, type NearClinic } from '../engine/clinics';
import { useLang, useT } from '../i18n';
import { fullDate } from '../lib/format';
import { nearbyHospitals, type Place } from '../lib/overpass';
import { mapsDirectionsUrl, mapsSearchUrl } from '../lib/share';
import { Helplines } from './bits';
import { Notice, SourceLine } from './controls';

const CLINICS = clinicData.clinics as Clinic[];
const STATES = statesOf(CLINICS);
const PAGE = 15;

type Position = { lat: number; lon: number };

function locate(): Promise<Position> {
  return new Promise((resolve, reject) => {
    if (!('geolocation' in navigator)) return reject(new Error('no geolocation'));
    navigator.geolocation.getCurrentPosition(
      (p) => resolve({ lat: p.coords.latitude, lon: p.coords.longitude }),
      reject,
      { enableHighAccuracy: false, timeout: 15_000, maximumAge: 300_000 },
    );
  });
}

export function Care({ snake }: { snake: boolean }) {
  const t = useT();
  return (
    <div className="page care">
      <h1 className="page__title">{t.care.title}</h1>
      <Helplines />

      <section className="section" aria-labelledby="where-title">
        <h2 id="where-title" className="section__title">
          {t.care.whereTitle}
        </h2>
        {snake && (
          <Notice tone="urgent">
            <p>{t.care.snakeWhere}</p>
          </Notice>
        )}
        <p>{t.care.where}</p>
        <SourceLine cites={CARE_CITES.free} />
        <p>{t.care.tn}</p>
        <SourceLine cites={CARE_CITES.tn} />
      </section>

      <ClinicList />
      <Nearby />
    </div>
  );
}

function ClinicList() {
  const t = useT();
  const lang = useLang();
  const searchId = useId();
  const stateId = useId();
  const [query, setQuery] = useState('');
  const [state, setState] = useState('');
  const [near, setNear] = useState<NearClinic[] | null>(null);
  const [locating, setLocating] = useState(false);
  const [denied, setDenied] = useState(false);
  const [shown, setShown] = useState(PAGE);

  const results = useMemo(() => {
    if (near && !query && !state) return near;
    return searchClinics(CLINICS, query, state || undefined).map((clinic) => ({ clinic, km: NaN, approximate: false }));
  }, [near, query, state]);

  const findNear = async () => {
    setLocating(true);
    setDenied(false);
    try {
      const p = await locate();
      setNear(nearestClinics(CLINICS, p.lat, p.lon, 30));
      setQuery('');
      setState('');
      setShown(PAGE);
    } catch {
      setDenied(true);
    } finally {
      setLocating(false);
    }
  };

  return (
    <section className="section clinics" aria-labelledby="clinics-title">
      <h2 id="clinics-title" className="section__title">
        {t.care.listTitle}
      </h2>
      <p className="section__lead">{t.care.listLead(CLINICS.length, fullDate(clinicData.source.updated, lang))}</p>
      <Notice tone="info">
        <p>{t.care.gap}</p>
      </Notice>
      <div className="clinics__tools">
        <div className="search">
          <Search className="search__icon" size={20} aria-hidden="true" />
          <label htmlFor={searchId} className="visually-hidden">
            {t.care.search}
          </label>
          <input
            id={searchId}
            className="input search__input"
            type="search"
            placeholder={t.care.search}
            value={query}
            onChange={(e) => {
              setQuery(e.target.value);
              setShown(PAGE);
            }}
          />
        </div>
        <label htmlFor={stateId} className="visually-hidden">
          {t.care.allStates}
        </label>
        <select
          id={stateId}
          className="input select"
          value={state}
          onChange={(e) => {
            setState(e.target.value);
            setShown(PAGE);
          }}
        >
          <option value="">{t.care.allStates}</option>
          {STATES.map((s) => (
            <option key={s} value={s}>
              {s}
            </option>
          ))}
        </select>
        <button type="button" className="button button--quiet" onClick={findNear} disabled={locating}>
          <LocateFixed size={20} aria-hidden="true" />
          {locating ? t.care.locating : t.care.nearMe}
        </button>
      </div>
      {denied && <p className="muted">{t.care.locationDenied}</p>}
      {results.length === 0 && <p>{t.care.noResults}</p>}
      <ul className="clinic-list" aria-live="polite">
        {results.slice(0, shown).map((r) => (
          <ClinicItem key={r.clinic.id} r={r} />
        ))}
      </ul>
      {results.length > shown && (
        <button type="button" className="button button--quiet" onClick={() => setShown(shown + PAGE)}>
          {t.care.showMore(Math.min(PAGE, results.length - shown))}
        </button>
      )}
      {near && !query && !state && <p className="muted">{t.care.approxNote}</p>}
      <SourceLine cites={CARE_CITES.list} />
    </section>
  );
}

function ClinicItem({ r }: { r: NearClinic }) {
  const t = useT();
  const c = r.clinic;
  return (
    <li className="clinic">
      <div className="clinic__text">
        <p className="clinic__name">{c.facility}</p>
        <p className="clinic__place">
          {c.district}, {c.state}
          {!Number.isNaN(r.km) && <span className="clinic__km">{t.care.km(r.km, r.approximate)}</span>}
        </p>
        {c.phones.length === 0 && <p className="muted">{c.phoneUnreadable ? t.care.badPhone : t.care.noPhone}</p>}
      </div>
      <div className="clinic__actions">
        {c.phones.map((p) => (
          <a key={p} className="button button--small" href={telHref(p)}>
            <Phone size={18} aria-hidden="true" />
            {formatPhone(p)}
          </a>
        ))}
        <a className="button button--small button--quiet" href={mapsSearchUrl(`${c.facility}, ${c.district}, ${c.state}`)} target="_blank" rel="noopener noreferrer">
          <Navigation size={18} aria-hidden="true" />
          {t.care.directions}
        </a>
      </div>
    </li>
  );
}

function Nearby() {
  const t = useT();
  const [status, setStatus] = useState<'idle' | 'loading' | 'error' | 'denied' | 'done'>('idle');
  const [places, setPlaces] = useState<Place[]>([]);
  const abort = useRef<AbortController | null>(null);

  const find = async () => {
    abort.current?.abort();
    const ctrl = new AbortController();
    abort.current = ctrl;
    setStatus('loading');
    let p: Position;
    try {
      p = await locate();
    } catch {
      setStatus('denied');
      return;
    }
    try {
      setPlaces(await nearbyHospitals(p.lat, p.lon, ctrl.signal));
      setStatus('done');
    } catch {
      if (!ctrl.signal.aborted) setStatus('error');
    }
  };

  return (
    <section className="section nearby" aria-labelledby="nearby-title">
      <h2 id="nearby-title" className="section__title">
        {t.care.nearbyTitle}
      </h2>
      <p className="section__lead">{t.care.nearbyLead}</p>
      <button type="button" className="button button--quiet" onClick={find} disabled={status === 'loading'}>
        <LocateFixed size={20} aria-hidden="true" />
        {status === 'loading' ? t.care.locating : status === 'error' ? t.care.retry : t.care.nearbyFind}
      </button>
      {status === 'denied' && <p className="muted">{t.care.locationDenied}</p>}
      {status === 'error' && <p role="alert">{t.care.nearbyError}</p>}
      {status === 'done' && places.length === 0 && <p>{t.care.nearbyEmpty}</p>}
      {status === 'done' && places.length > 0 && (
        <>
          <p className="muted">{t.care.nearbyNote}</p>
          <ul className="clinic-list">
            {places.map((pl) => (
              <li key={pl.id} className="clinic">
                <div className="clinic__text">
                  <p className="clinic__name">{pl.name}</p>
                  <p className="clinic__place">{t.care.km(pl.km, false)}</p>
                </div>
                <div className="clinic__actions">
                  {pl.phone && (
                    <a className="button button--small" href={`tel:${pl.phone.split(/[;,]/)[0].replace(/[^\d+]/g, '')}`}>
                      <Phone size={18} aria-hidden="true" />
                      {pl.phone.split(/[;,]/)[0]}
                    </a>
                  )}
                  <a className="button button--small button--quiet" href={mapsDirectionsUrl(pl.lat, pl.lon)} target="_blank" rel="noopener noreferrer">
                    <Navigation size={18} aria-hidden="true" />
                    {t.care.directions}
                  </a>
                </div>
              </li>
            ))}
          </ul>
          <p className="muted">{t.care.osm}</p>
        </>
      )}
    </section>
  );
}
