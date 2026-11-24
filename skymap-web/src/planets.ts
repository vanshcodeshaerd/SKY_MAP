import * as Astronomy from 'astronomy-engine';
import { equatorialToHorizontal } from './astronomy/fast.ts';
import { norm360 } from './astronomy.ts';
import type { CelestialPosition } from './astronomy.ts';

export type PlanetName = 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn';
export const NAKED_EYE_PLANETS: readonly PlanetName[] = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

const BODY: Record<PlanetName, Astronomy.Body> = {
  Mercury: Astronomy.Body.Mercury,
  Venus: Astronomy.Body.Venus,
  Mars: Astronomy.Body.Mars,
  Jupiter: Astronomy.Body.Jupiter,
  Saturn: Astronomy.Body.Saturn,
};

const META: Record<
  PlanetName,
  { radiusKm: number; type: string; color: string; facts: string }
> = {
  Mercury: {
    radiusKm: 2439.7,
    type: 'Terrestrial Planet',
    color: '#cbd5e1',
    facts: 'Smallest planet and closest to the Sun; completes an orbit in 88 Earth days.',
  },
  Venus: {
    radiusKm: 6051.8,
    type: 'Terrestrial Planet',
    color: '#fde68a',
    facts: 'Brightest planet in Earth’s sky due to highly reflective sulfuric acid clouds.',
  },
  Mars: {
    radiusKm: 3389.5,
    type: 'Terrestrial Planet',
    color: '#f87171',
    facts: 'The Red Planet, colored by iron oxide dust; exhibits dramatic retrograde loops.',
  },
  Jupiter: {
    radiusKm: 69911,
    type: 'Gas Giant',
    color: '#fdba74',
    facts: 'Largest planet in the Solar System; its four Galilean moons are visible in binoculars.',
  },
  Saturn: {
    radiusKm: 58232,
    type: 'Gas Giant',
    color: '#fcd34d',
    facts: 'Iconic ringed gas giant whose icy rings span 282,000 km.',
  },
};

function observer(lat: number, lon: number, elevationM = 0): Astronomy.Observer {
  return new Astronomy.Observer(lat, lon, elevationM);
}

export interface PlanetDetails {
  name: PlanetName;
  type: string;
  color: string;
  ra: number;
  dec: number;
  altitude: number;
  azimuth: number;
  distanceAU: number;
  magnitude: number;
  angularDiameterArcsec: number;
  visible: boolean;
  riseTime: string;
  transitTime: string;
  setTime: string;
  facts: string;
}

export function planetEquatorial(
  name: PlanetName,
  date: Date,
  lat = 0,
  lon = 0
): {
  ra: number;
  dec: number;
  distanceAU: number;
  magnitude: number;
  angularDiameterArcsec: number;
} {
  const obs = observer(lat, lon);
  const equator = Astronomy.Equator(BODY[name], date, obs, true, true);
  const ra = norm360(equator.ra * 15);
  const dec = equator.dec;
  const distanceAU = equator.dist;
  let magnitude = 0;
  try {
    magnitude = Astronomy.Illumination(BODY[name], date).mag;
  } catch {
    magnitude = 0;
  }
  const angularDiameterArcsec =
    (2 * META[name].radiusKm / (distanceAU * 149597870.7)) * 206264.8;
  return { ra, dec, distanceAU, magnitude, angularDiameterArcsec };
}

function formatHm(d: Date): string {
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

function computeRiseTransitSet(name: PlanetName, date: Date, lat: number, lon: number) {
  const startOfDay = new Date(date);
  startOfDay.setHours(0, 0, 0, 0);

  let prevAlt = -90;
  let maxAlt = -90;
  let transitStr = '—';
  let riseStr = '—';
  let setStr = '—';

  for (let m = 0; m <= 1440; m += 15) {
    const t = new Date(startOfDay.getTime() + m * 60000);
    const eq = planetEquatorial(name, t, lat, lon);
    const hor = equatorialToHorizontal(eq.ra, eq.dec, lat, lon, t);
    if (hor.altitude > maxAlt) {
      maxAlt = hor.altitude;
      transitStr = formatHm(t);
    }
    if (m > 0) {
      if (prevAlt <= 0 && hor.altitude > 0 && riseStr === '—') riseStr = formatHm(t);
      if (prevAlt >= 0 && hor.altitude < 0 && setStr === '—') setStr = formatHm(t);
    }
    prevAlt = hor.altitude;
  }
  return { riseTime: riseStr, transitTime: transitStr, setTime: setStr };
}

export function planetAltAz(
  name: PlanetName,
  date: Date,
  lat: number,
  lon: number
): CelestialPosition & { distanceAU: number; magnitude: number; angularDiameterArcsec: number } {
  const eq = planetEquatorial(name, date, lat, lon);
  const obs = observer(lat, lon);
  const hor = Astronomy.Horizon(date, obs, eq.ra / 15, eq.dec, 'normal');
  return {
    altitude: hor.altitude,
    azimuth: norm360(hor.azimuth),
    distanceAU: eq.distanceAU,
    magnitude: eq.magnitude,
    angularDiameterArcsec: eq.angularDiameterArcsec,
  };
}

export function getPlanetDetails(
  name: PlanetName,
  date: Date,
  lat: number,
  lon: number
): PlanetDetails {
  const eq = planetEquatorial(name, date, lat, lon);
  const horEngine = Astronomy.Horizon(date, observer(lat, lon), eq.ra / 15, eq.dec, 'normal');
  const hor = { altitude: horEngine.altitude, azimuth: norm360(horEngine.azimuth) };
  const rts = computeRiseTransitSet(name, date, lat, lon);
  const meta = META[name];

  return {
    name,
    type: meta.type,
    color: meta.color,
    ra: eq.ra,
    dec: eq.dec,
    altitude: hor.altitude,
    azimuth: hor.azimuth,
    distanceAU: eq.distanceAU,
    magnitude: eq.magnitude,
    angularDiameterArcsec: eq.angularDiameterArcsec,
    visible: hor.altitude > 0,
    ...rts,
    facts: meta.facts,
  };
}
