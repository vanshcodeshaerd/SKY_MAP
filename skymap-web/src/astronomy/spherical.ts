import { toRad, toDeg } from '../astronomy.ts';

export interface RaDec {
  ra: number;
  dec: number;
}

/** Unit vector in ICRS from equatorial degrees. */
export function unitFromRaDec(raDeg: number, decDeg: number): { x: number; y: number; z: number } {
  const ra = toRad(raDeg);
  const dec = toRad(decDeg);
  const cd = Math.cos(dec);
  return { x: cd * Math.cos(ra), y: cd * Math.sin(ra), z: Math.sin(dec) };
}

export function raDecFromUnit(v: { x: number; y: number; z: number }): RaDec {
  const len = Math.hypot(v.x, v.y, v.z) || 1;
  const x = v.x / len;
  const y = v.y / len;
  const z = v.z / len;
  const dec = toDeg(Math.asin(Math.max(-1, Math.min(1, z))));
  let ra = toDeg(Math.atan2(y, x));
  if (ra < 0) ra += 360;
  return { ra, dec };
}

/** Great-circle interpolation between two unit vectors (spherical linear interpolation). */
export function slerpUnit(
  a: { x: number; y: number; z: number },
  b: { x: number; y: number; z: number },
  t: number
): { x: number; y: number; z: number } {
  const dot = Math.max(-1, Math.min(1, a.x * b.x + a.y * b.y + a.z * b.z));
  const omega = Math.acos(dot);
  if (omega < 1e-8) {
    return { x: a.x, y: a.y, z: a.z };
  }
  const so = Math.sin(omega);
  const w1 = Math.sin((1 - t) * omega) / so;
  const w2 = Math.sin(t * omega) / so;
  return { x: w1 * a.x + w2 * b.x, y: w1 * a.y + w2 * b.y, z: w1 * a.z + w2 * b.z };
}

/** Sample RA/Dec points along the great circle between two equatorial positions. */
export function sampleGreatCircle(ra1: number, dec1: number, ra2: number, dec2: number, steps = 12): RaDec[] {
  const u0 = unitFromRaDec(ra1, dec1);
  const u1 = unitFromRaDec(ra2, dec2);
  const out: RaDec[] = [];
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    out.push(raDecFromUnit(slerpUnit(u0, u1, t)));
  }
  return out;
}