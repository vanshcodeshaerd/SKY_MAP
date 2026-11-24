import { equatorialToHorizontal } from './astronomy/fast.ts';
import { norm360, toRad, julianDate } from './astronomy.ts';
import type { CelestialPosition } from './astronomy.ts';

const PLANET_ELEMENTS: Record<string, { L: number; a: number; e: number; i: number; w: number; omega: number }> = {
  Mercury: { L: 252.25, a: 0.387, e: 0.205, i: 7.0, w: 77.45, omega: 48.33 },
  Venus: { L: 181.98, a: 0.723, e: 0.007, i: 3.4, w: 131.53, omega: 76.68 },
  Mars: { L: 355.43, a: 1.524, e: 0.093, i: 1.85, w: 336.04, omega: 49.56 },
  Jupiter: { L: 34.35, a: 5.203, e: 0.048, i: 1.30, w: 14.75, omega: 100.46 },
  Saturn: { L: 50.08, a: 9.537, e: 0.054, i: 2.49, w: 92.43, omega: 113.67 },
};

export function planetEquatorial(name: keyof typeof PLANET_ELEMENTS, date: Date): { ra: number; dec: number } {
  const el = PLANET_ELEMENTS[name];
  const JD = julianDate(date);
  const T = (JD - 2451545.0) / 36525;
  const L = norm360(el.L + 360 * T / (el.a * el.a * el.a));
  const M = toRad(L - el.w);
  const E = M + el.e * Math.sin(M);
  void (el.a * (1 - el.e * Math.cos(E)));
  const v = Math.atan2(Math.sqrt(1 - el.e * el.e) * Math.sin(E), Math.cos(E) - el.e);
  const lon = norm360((L + toRad(el.w) * (180 / Math.PI) - el.w + (v * 180) / Math.PI) % 360);
  const lat = Math.asin(Math.sin(toRad(el.i)) * Math.sin(v)) * (180 / Math.PI);
  const ra = lon;
  const dec = lat;
  return { ra, dec: Math.max(-30, Math.min(30, dec + Math.sin(T) * 5)) };
}

export function planetAltAz(
  name: keyof typeof PLANET_ELEMENTS,
  date: Date,
  lat: number,
  lon: number
): CelestialPosition {
  const eq = planetEquatorial(name, date);
  const hor = equatorialToHorizontal(eq.ra, eq.dec, lat, lon, date);
  return { altitude: hor.altitude, azimuth: hor.azimuth };
}

export const NAKED_EYE_PLANETS = ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn'] as const;