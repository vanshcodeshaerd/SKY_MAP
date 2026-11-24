import { equatorialToHorizontal } from './astronomy/fast.ts';
import { julianDate, norm360, toDeg, toRad } from './astronomy.ts';
import type { CelestialPosition } from './astronomy.ts';

export type PlanetName = 'Mercury' | 'Venus' | 'Mars' | 'Jupiter' | 'Saturn';
export const NAKED_EYE_PLANETS: readonly PlanetName[] = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'];

interface KeplerElements {
  a: number;
  aDot: number;
  e: number;
  eDot: number;
  I: number;
  IDot: number;
  L: number;
  LDot: number;
  wBar: number;
  wBarDot: number;
  omega: number;
  omegaDot: number;
  radiusKm: number;
  type: string;
  color: string;
  facts: string;
}

const ELEMENTS: Record<PlanetName | 'Earth', KeplerElements> = {
  Mercury: {
    a: 0.38709927, aDot: 0.00000037,
    e: 0.20563593, eDot: 0.00001906,
    I: 7.00497902, IDot: -0.00594749,
    L: 252.25032350, LDot: 149472.67411175,
    wBar: 77.45779628, wBarDot: 0.16047689,
    omega: 48.33076593, omegaDot: -0.12534081,
    radiusKm: 2439.7, type: 'Terrestrial Planet', color: '#cbd5e1',
    facts: 'Smallest planet and closest to the Sun; completes an orbit in 88 Earth days.',
  },
  Venus: {
    a: 0.72333566, aDot: 0.00000390,
    e: 0.00677672, eDot: -0.00004107,
    I: 3.39467605, IDot: -0.00078890,
    L: 181.97909950, LDot: 58517.81538729,
    wBar: 131.60246718, wBarDot: 0.00268329,
    omega: 76.67984255, omegaDot: -0.27769418,
    radiusKm: 6051.8, type: 'Terrestrial Planet', color: '#fde68a',
    facts: 'Brightest planet in Earth’s sky due to highly reflective sulfuric acid clouds.',
  },
  Earth: {
    a: 1.00000261, aDot: 0.00000562,
    e: 0.01671123, eDot: -0.00004392,
    I: -0.00001531, IDot: -0.01294668,
    L: 100.46457166, LDot: 35999.37244981,
    wBar: 102.93768193, wBarDot: 0.32327364,
    omega: 0.0, omegaDot: 0.0,
    radiusKm: 6371.0, type: 'Terrestrial Planet', color: '#38bdf8',
    facts: 'Home world.',
  },
  Mars: {
    a: 1.52371034, aDot: 0.00001847,
    e: 0.09339410, eDot: 0.00007882,
    I: 1.84969142, IDot: -0.00813131,
    L: -4.55343205, LDot: 19140.30268499,
    wBar: -23.94362959, wBarDot: 0.44441088,
    omega: 49.55953891, omegaDot: -0.29257343,
    radiusKm: 3389.5, type: 'Terrestrial Planet', color: '#f87171',
    facts: 'The Red Planet, colored by iron oxide dust; exhibits dramatic retrograde loops.',
  },
  Jupiter: {
    a: 5.20288700, aDot: -0.00011607,
    e: 0.04838624, eDot: -0.00013253,
    I: 1.30439695, IDot: -0.00183714,
    L: 34.39644051, LDot: 3034.74612775,
    wBar: 14.72847983, wBarDot: 0.21252668,
    omega: 100.47390909, omegaDot: 0.20469106,
    radiusKm: 69911, type: 'Gas Giant', color: '#fdba74',
    facts: 'Largest planet in the Solar System; its four Galilean moons are visible in binoculars.',
  },
  Saturn: {
    a: 9.53667594, aDot: -0.00125060,
    e: 0.05386179, eDot: -0.00050991,
    I: 2.48599187, IDot: 0.00193609,
    L: 49.95424423, LDot: 1222.49362201,
    wBar: 92.59887831, wBarDot: -0.41897216,
    omega: 113.66242448, omegaDot: -0.28867794,
    radiusKm: 58232, type: 'Gas Giant', color: '#fcd34d',
    facts: 'Iconic ringed gas giant whose icy rings span 282,000 km.',
  },
};

function heliocentricEcliptic(name: PlanetName | 'Earth', T: number) {
  const el = ELEMENTS[name];
  const a = el.a + el.aDot * T;
  const e = el.e + el.eDot * T;
  const I = toRad(el.I + el.IDot * T);
  const L = el.L + el.LDot * T;
  const wBar = el.wBar + el.wBarDot * T;
  const omega = toRad(el.omega + el.omegaDot * T);
  const w = toRad(wBar - (el.omega + el.omegaDot * T));

  let M = norm360(L - wBar);
  if (M > 180) M -= 360;
  const Mrad = toRad(M);

  let E = Mrad + e * Math.sin(Mrad);
  for (let i = 0; i < 6; i++) {
    const dE = (E - e * Math.sin(E) - Mrad) / (1 - e * Math.cos(E));
    E -= dE;
    if (Math.abs(dE) < 1e-8) break;
  }

  const xOrb = a * (Math.cos(E) - e);
  const yOrb = a * Math.sqrt(1 - e * e) * Math.sin(E);

  const cw = Math.cos(w), sw = Math.sin(w);
  const co = Math.cos(omega), so = Math.sin(omega);
  const cI = Math.cos(I), sI = Math.sin(I);

  const x = (cw * co - sw * so * cI) * xOrb + (-sw * co - cw * so * cI) * yOrb;
  const y = (cw * so + sw * co * cI) * xOrb + (-sw * so + cw * co * cI) * yOrb;
  const z = (sw * sI) * xOrb + (cw * sI) * yOrb;

  return { x, y, z, r: Math.hypot(x, y, z) };
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

function estimateMagnitude(name: PlanetName, r: number, delta: number, phaseDeg: number): number {
  const ph = phaseDeg / 100;
  const distTerm = 5 * Math.log10(r * delta);
  switch (name) {
    case 'Mercury':
      return -0.613 + distTerm + 6.328 * ph - 1.6336 * ph * ph;
    case 'Venus':
      return -4.384 + distTerm - 1.044 * ph + 3.687 * ph * ph;
    case 'Mars':
      return -1.601 + distTerm + 2.267 * ph;
    case 'Jupiter':
      return -9.395 + distTerm + 0.5 * ph;
    case 'Saturn':
      return -8.914 + distTerm + 2.6 * ph;
  }
}

export function planetEquatorial(name: PlanetName, date: Date): {
  ra: number;
  dec: number;
  distanceAU: number;
  magnitude: number;
  angularDiameterArcsec: number;
} {
  const JD = julianDate(date);
  const T = (JD - 2451545.0) / 36525;

  const helio = heliocentricEcliptic(name, T);
  const earth = heliocentricEcliptic('Earth', T);

  const xg = helio.x - earth.x;
  const yg = helio.y - earth.y;
  const zg = helio.z - earth.z;
  const delta = Math.hypot(xg, yg, zg);

  const eps = toRad(23.4392911 - 0.0130042 * T);
  const ce = Math.cos(eps), se = Math.sin(eps);

  const xEq = xg;
  const yEq = yg * ce - zg * se;
  const zEq = yg * se + zg * ce;

  const ra = norm360(toDeg(Math.atan2(yEq, xEq)));
  const dec = toDeg(Math.atan2(zEq, Math.hypot(xEq, yEq)));

  const cosPhase = Math.max(-1, Math.min(1, (helio.r * helio.r + delta * delta - earth.r * earth.r) / (2 * helio.r * delta)));
  const phaseDeg = toDeg(Math.acos(cosPhase));
  const magnitude = estimateMagnitude(name, helio.r, delta, phaseDeg);
  const angularDiameterArcsec = (2 * ELEMENTS[name].radiusKm / (delta * 149597870.7)) * 206264.8;

  return { ra, dec, distanceAU: delta, magnitude, angularDiameterArcsec };
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
    const eq = planetEquatorial(name, t);
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
  const eq = planetEquatorial(name, date);
  const hor = equatorialToHorizontal(eq.ra, eq.dec, lat, lon, date);
  return {
    altitude: hor.altitude,
    azimuth: hor.azimuth,
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
  const eq = planetEquatorial(name, date);
  const hor = equatorialToHorizontal(eq.ra, eq.dec, lat, lon, date);
  const rts = computeRiseTransitSet(name, date, lat, lon);
  const meta = ELEMENTS[name];

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
