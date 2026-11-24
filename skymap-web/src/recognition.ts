import type { ConstellationMeta, Star } from './data/types.ts';
import { angularSeparationDeg } from './astronomy/precision.ts';
import { equatorialToHorizontal, horizontalToEquatorial } from './astronomy/fast.ts';
import { boresightENU, orientationMatrix } from './projection.ts';
import { constellationFromRaDec } from './constellationLookup.ts';
import { querySimbad, type SimbadHit } from './api/simbad.ts';

export function boresightHorizontal(
  heading: number,
  beta: number,
  gamma: number,
  screenAngle = 0
): { alt: number; az: number } {
  const R = orientationMatrix(heading, beta, gamma, screenAngle);
  const b = boresightENU(R);
  const horiz = Math.sqrt(b.x * b.x + b.y * b.y);
  const alt = (Math.atan2(b.z, horiz) * 180) / Math.PI;
  let az = (Math.atan2(b.x, b.y) * 180) / Math.PI;
  if (az < 0) az += 360;
  return { alt, az };
}

export function boresightEquatorial(
  heading: number,
  beta: number,
  gamma: number,
  lat: number,
  lon: number,
  date: Date,
  screenAngle = 0
): { ra: number; dec: number; alt: number; az: number } {
  const bore = boresightHorizontal(heading, beta, gamma, screenAngle);
  const eq = horizontalToEquatorial(bore.alt, bore.az, lat, lon, date);
  return { ...eq, ...bore };
}

export interface RecognitionResult {
  star: Star | null;
  constellationId: string | null;
  separationDeg: number;
  confidence: number; // 0..1
  status: 'predicted-region' | 'aligned-stars' | 'none';
  ra: number;
  dec: number;
  alt: number;
  az: number;
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
  magThreshold: number,
  screenAngle = 0
): RecognitionResult {
  const aim = boresightEquatorial(heading, beta, gamma, lat, lon, date, screenAngle);
  const iau = constellationFromRaDec(aim.ra, aim.dec);

  let best: Star | null = null;
  let bestSep = Infinity;
  let matchingConStars = 0;

  for (const star of stars) {
    if (star.magnitude > magThreshold) continue;
    const sep = angularSeparationDeg(aim.ra, aim.dec, star.ra, star.dec);
    if (sep < bestSep) {
      bestSep = sep;
      best = star;
    }
    if (iau && star.constellationId?.toLowerCase() === iau.toLowerCase() && sep <= halfFovDeg) {
      matchingConStars++;
    }
  }

  const constellationId =
    iau ?? (best && bestSep < 8 ? best.constellationId ?? null : null);

  let confidence = 0;
  if (constellationId) {
    confidence = Math.min(1, 0.45 + matchingConStars * 0.12 + (best && bestSep < 10 ? 0.25 : 0));
  }

  const status: RecognitionResult['status'] =
    matchingConStars >= 2
      ? 'aligned-stars'
      : constellationId
      ? 'predicted-region'
      : 'none';

  return {
    star: best && bestSep <= halfFovDeg ? best : null,
    constellationId,
    separationDeg: bestSep,
    confidence,
    status,
    ra: aim.ra,
    dec: aim.dec,
    alt: aim.alt,
    az: aim.az,
    simbad: null,
  };
}

/**
 * Hysteresis + debounced constellation tracker to prevent flickering across boundaries.
 */
export class ConstellationTracker {
  private stableId: string | null = null;
  private candidateId: string | null = null;
  private candidateSince = 0;
  private lastConfidence = 0;
  private lastStatus: RecognitionResult['status'] = 'none';

  update(result: RecognitionResult, nowMs = performance.now()): {
    constellationId: string | null;
    confidence: number;
    status: RecognitionResult['status'];
  } {
    const nextId = result.constellationId;
    if (!nextId || result.confidence < 0.35) {
      this.candidateId = null;
      return {
        constellationId: this.stableId,
        confidence: this.lastConfidence,
        status: this.lastStatus,
      };
    }

    if (nextId === this.stableId) {
      this.candidateId = null;
      this.lastConfidence = result.confidence;
      this.lastStatus = result.status;
      return { constellationId: this.stableId, confidence: this.lastConfidence, status: this.lastStatus };
    }

    if (nextId !== this.candidateId) {
      this.candidateId = nextId;
      this.candidateSince = nowMs;
    }

    // Require 450ms dwell OR high confidence (>0.75) for smooth non-jittery transition
    const dwellMs = nowMs - this.candidateSince;
    if (this.stableId === null || dwellMs >= 450 || result.confidence >= 0.78) {
      this.stableId = nextId;
      this.lastConfidence = result.confidence;
      this.lastStatus = result.status;
    }

    return {
      constellationId: this.stableId,
      confidence: this.lastConfidence,
      status: this.lastStatus,
    };
  }

  forceSelect(id: string | null) {
    this.stableId = id;
    this.candidateId = null;
    this.lastConfidence = id ? 1 : 0;
    this.lastStatus = id ? 'predicted-region' : 'none';
  }
}

export interface NextConstellationSuggestion {
  kind: 'NEXT_IN_VIEW' | 'NEXT_VISIBLE' | 'NEAREST';
  id: string;
  name: string;
  englishName: string;
  angularDistanceDeg: number;
  altitude: number;
  azimuth: number;
  directionLabel: string;
  visible: boolean;
}

function compassDir(az: number): string {
  const dirs = ['N', 'NE', 'E', 'SE', 'S', 'SW', 'W', 'NW'];
  return dirs[Math.round(((az % 360) + 360) % 360 / 45) % 8];
}

export function computeConstellationCenters(
  stars: Star[],
  constellations: ConstellationMeta[]
): Map<string, { ra: number; dec: number }> {
  const centers = new Map<string, { ra: number; dec: number }>();
  for (const con of constellations) {
    const members = stars.filter(
      (s) => s.constellationId?.toLowerCase() === con.id.toLowerCase() && s.magnitude <= 4.5
    );
    if (members.length === 0) continue;
    let x = 0, y = 0, z = 0;
    for (const s of members) {
      const r = (s.ra * Math.PI) / 180;
      const d = (s.dec * Math.PI) / 180;
      x += Math.cos(d) * Math.cos(r);
      y += Math.cos(d) * Math.sin(r);
      z += Math.sin(d);
    }
    const len = Math.hypot(x, y, z) || 1;
    const ra = ((Math.atan2(y / len, x / len) * 180) / Math.PI + 360) % 360;
    const dec = (Math.asin(Math.max(-1, Math.min(1, z / len))) * 180) / Math.PI;
    centers.set(con.id, { ra, dec });
  }
  return centers;
}

export function computeNextConstellations(
  activeId: string | null,
  aimRa: number,
  aimDec: number,
  currentAz: number,
  lat: number,
  lon: number,
  date: Date,
  constellations: ConstellationMeta[],
  centers: Map<string, { ra: number; dec: number }>
): NextConstellationSuggestion[] {
  const candidates: {
    meta: ConstellationMeta;
    sep: number;
    alt: number;
    az: number;
    azDiff: number;
  }[] = [];

  for (const meta of constellations) {
    if (activeId && meta.id.toLowerCase() === activeId.toLowerCase()) continue;
    const c = centers.get(meta.id);
    if (!c) continue;
    const sep = angularSeparationDeg(aimRa, aimDec, c.ra, c.dec);
    const hor = equatorialToHorizontal(c.ra, c.dec, lat, lon, date);
    let azDiff = hor.azimuth - currentAz;
    while (azDiff < -180) azDiff += 360;
    while (azDiff > 180) azDiff -= 360;
    candidates.push({ meta, sep, alt: hor.altitude, az: hor.azimuth, azDiff });
  }

  if (candidates.length === 0) return [];

  const toSuggestion = (
    kind: NextConstellationSuggestion['kind'],
    c: (typeof candidates)[number]
  ): NextConstellationSuggestion => ({
    kind,
    id: c.meta.id,
    name: c.meta.nameLatin,
    englishName: c.meta.nameEnglish,
    angularDistanceDeg: c.sep,
    altitude: c.alt,
    azimuth: c.az,
    directionLabel: compassDir(c.az),
    visible: c.alt > 0,
  });

  const nearest = [...candidates].sort((a, b) => a.sep - b.sep)[0];
  const nextVisible =
    [...candidates]
      .filter((c) => c.alt > 15 && c.meta.id !== nearest.meta.id)
      .sort((a, b) => b.alt - a.alt)[0] ?? nearest;
  const nextInView =
    [...candidates]
      .filter((c) => c.alt > 0 && c.azDiff > 5 && c.azDiff < 85)
      .sort((a, b) => a.azDiff - b.azDiff)[0] ??
    [...candidates].filter((c) => c.alt > 0 && c.meta.id !== nearest.meta.id).sort((a, b) => a.sep - b.sep)[0] ??
    nearest;

  return [
    toSuggestion('NEXT_IN_VIEW', nextInView),
    toSuggestion('NEXT_VISIBLE', nextVisible),
    toSuggestion('NEAREST', nearest),
  ];
}

export function separationBetweenStars(a: Star, b: Star): number {
  return angularSeparationDeg(a.ra, a.dec, b.ra, b.dec);
}

export function findConstellationByStars(
  stars: Star[],
  lat: number,
  lon: number,
  date: Date,
  heading: number,
  beta: number,
  gamma: number,
  _radiusDeg: number,
  screenAngle = 0
): string | null {
  const aim = boresightEquatorial(heading, beta, gamma, lat, lon, date, screenAngle);
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
