import { toRad } from '../astronomy.ts';
import type { Vector3 } from '../projection.ts';

export function icrsUnitVector(raDeg: number, decDeg: number): Vector3 {
  const ra = toRad(raDeg);
  const dec = toRad(decDeg);
  return {
    x: Math.cos(dec) * Math.cos(ra),
    y: Math.cos(dec) * Math.sin(ra),
    z: Math.sin(dec),
  };
}