import type { Star } from './data/types.ts';
import { angularSeparationDeg } from './astronomy/precision.ts';
import { horizontalToEquatorial } from './astronomy/fast.ts';
import { orientationMatrix } from './projection.ts';
import { constellationFromRaDec } from './constellationLookup.ts';
import { querySimbad, type SimbadHit } from './api/simbad.ts';

export function boresightHorizontal(
  heading: number,
  beta: number,
  gamma: number
): { alt: number; az: number } {
  const R = orientationMatrix(heading, beta, gamma);
  const east = R[0][2];
  const north = R[1][2];
  const up = R[2][2];
  const horiz = Math.sqrt(east * east + north * north);
  const alt = (Math.atan2(up, horiz) * 180) / Math.PI;
  let az = (Math.atan2(east, north) * 180) / Math.PI;
  if (az < 0) az += 360;
  return { alt, az };
}

export function boresightEquatorial(
  heading: number,
  beta: number,
  gamma: number,
  lat: number,
  lon: number,
  date: Date
): { ra: number; dec: number; alt: number; az: number } {
  const bore = boresightHorizontal(heading, beta, gamma);
  const eq = horizontalToEquatorial(bore.alt, bore.az, lat, lon, date);
  return { ...eq, ...bore };
}

export interface RecognitionResult {
  star: Star | null;
  constellationId: string | null;
  separationDeg: number;
  ra: number;
  dec: number;
  simbad: SimbadHit | null;
}

export function coneSearch(
  stars: Star[],
  lat: number,
  lon: number,
  date: Date,
  heading: number,
  beta: number,
  gamma: number,
  halfFovDeg: number,
  magThreshold: number
): RecognitionResult {
  const aim = boresightEquatorial(heading, beta, gamma, lat, lon, date);
  const iau = constellationFromRaDec(aim.ra, aim.dec);

  let best: Star | null = null;
  let bestSep = Infinity;

  for (const star of stars) {
    if (star.magnitude > magThreshold) continue;
    const sep = angularSeparationDeg(aim.ra, aim.dec, star.ra, star.dec);
    if (sep < bestSep) {
      bestSep = sep;
      best = star;
    }
  }

  if (!best || bestSep > halfFovDeg) {
    return {
      star: null,
      constellationId: iau,
      separationDeg: bestSep,
      ra: aim.ra,
      dec: aim.dec,
      simbad: null,
    };
  }

  const constellationId =
    (bestSep < 8 ? best.constellationId : null) ?? iau ?? best.constellationId ?? null;
  return {
    star: best,
    constellationId,
    separationDeg: bestSep,
    ra: aim.ra,
    dec: aim.dec,
    simbad: null,
  };
}

export function findConstellationByStars(
  stars: Star[],
  lat: number,
  lon: number,
  date: Date,
  heading: number,
  beta: number,
  gamma: number,
  _radiusDeg: number
): string | null {
  const aim = boresightEquatorial(heading, beta, gamma, lat, lon, date);
  const fromBounds = constellationFromRaDec(aim.ra, aim.dec);
  if (fromBounds) return fromBounds;

  const counts = new Map<string, number>();
  for (const star of stars) {
    if (star.magnitude > 3.5 || !star.constellationId) continue;
    const sep = angularSeparationDeg(aim.ra, aim.dec, star.ra, star.dec);
    if (sep <= 18) {
      counts.set(star.constellationId, (counts.get(star.constellationId) ?? 0) + 1);
    }
  }
  let best: string | null = null;
  let max = 0;
  for (const [id, c] of counts) {
    if (c > max) {
      max = c;
      best = id;
    }
  }
  return max >= 2 ? best : null;
}

let lastSimbadKey = '';
let lastSimbad: SimbadHit | null = null;
let simbadInFlight = false;

/** Debounced SIMBAD confirmation of the boresight field (network, cached). */
export function confirmWithSimbad(
  ra: number,
  dec: number,
  onHit: (hit: SimbadHit | null) => void
): void {
  const key = `${ra.toFixed(2)},${dec.toFixed(2)}`;
  if (key === lastSimbadKey) {
    onHit(lastSimbad);
    return;
  }
  if (simbadInFlight) return;
  simbadInFlight = true;
  void querySimbad(ra, dec, 0.12).then((hit) => {
    lastSimbadKey = key;
    lastSimbad = hit;
    simbadInFlight = false;
    onHit(hit);
  });
}

export function starEquatorialFromId(star: Star): { ra: number; dec: number } {
  return { ra: star.ra, dec: star.dec };
}

export function separationBetweenStars(a: Star, b: Star): number {
  return angularSeparationDeg(a.ra, a.dec, b.ra, b.dec);
}