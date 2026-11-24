import type { Star } from '../data/types.ts';

const M_ASC = 3.075 / 3600;
const N_ASC = 1.336 / 3600;
const N_DEC = 20.043 / 3600;

export function applyProperMotion(star: Star, date: Date): { ra: number; dec: number } {
  let { ra, dec } = star;
  const year = date.getUTCFullYear() + date.getUTCMonth() / 12;
  const dtYears = year - 2000.0;
  const T = dtYears / 100;

  if (star.properMotionRA != null && star.properMotionDec != null && Math.abs(dtYears) > 0.01) {
    const raRad = (ra * Math.PI) / 180;
    const decRad = (dec * Math.PI) / 180;
    const pmDecDeg = star.properMotionDec / 3600000;
    const pAlpha = M_ASC + N_ASC * Math.sin(raRad) * Math.tan(decRad);
    const pDelta = N_DEC * Math.cos(raRad);
    ra += star.properMotionRA * dtYears * 0.000277778 + pAlpha * T;
    dec += pmDecDeg * dtYears + pDelta * T;
  }

  ra = ((ra % 360) + 360) % 360;
  dec = Math.max(-90, Math.min(90, dec));
  return { ra, dec };
}

export function angularSeparationDeg(
  ra1: number,
  dec1: number,
  ra2: number,
  dec2: number
): number {
  const r1 = (ra1 * Math.PI) / 180;
  const d1 = (dec1 * Math.PI) / 180;
  const r2 = (ra2 * Math.PI) / 180;
  const d2 = (dec2 * Math.PI) / 180;
  const cos =
    Math.sin(d1) * Math.sin(d2) +
    Math.cos(d1) * Math.cos(d2) * Math.cos(r1 - r2);
  return (Math.acos(Math.max(-1, Math.min(1, cos))) * 180) / Math.PI;
}

export function formatArcDms(deg: number): string {
  const d = Math.floor(deg);
  const m = Math.floor((deg - d) * 60);
  const s = ((deg - d) * 60 - m) * 60;
  return `${d}° ${m}' ${s.toFixed(1)}"`;
}