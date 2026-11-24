import * as Astronomy from 'astronomy-engine';
import { toRad } from '../astronomy.ts';
import { lstDegrees } from './fast.ts';
import type { Vector3 } from '../projection.ts';

function matMulVec(m: number[][], v: Vector3): Vector3 {
  return {
    x: m[0][0] * v.x + m[0][1] * v.y + m[0][2] * v.z,
    y: m[1][0] * v.x + m[1][1] * v.y + m[1][2] * v.z,
    z: m[2][0] * v.x + m[2][1] * v.y + m[2][2] * v.z,
  };
}

let eqdCacheMin = Number.NaN;
let eqdCache: number[][] | null = null;

/** J2000 equator → equator-of-date, cached per UTC minute. */
function eqjToEqdMatrix(date: Date): number[][] {
  const minute = Math.floor(date.getTime() / 60000);
  if (eqdCache && minute === eqdCacheMin) return eqdCache;
  eqdCache = Astronomy.Rotation_EQJ_EQD(date).rot;
  eqdCacheMin = minute;
  return eqdCache;
}

/**
 * Equatorial cartesian (x=vernal equinox, z=north pole) → East-North-Up.
 * Matches equatorialToHorizontal + toENU (az clockwise from north).
 */
export function equatorialVectorToEnu(vEq: Vector3, latDeg: number, lonDeg: number, date: Date): Vector3 {
  const lst = toRad(lstDegrees(date, lonDeg));
  const cL = Math.cos(lst);
  const sL = Math.sin(lst);
  const cPhi = Math.cos(toRad(latDeg));
  const sPhi = Math.sin(toRad(latDeg));

  const xh = vEq.x * cL + vEq.y * sL;
  const yh = -vEq.x * sL + vEq.y * cL;
  const zh = vEq.z;

  return {
    x: yh,
    y: cPhi * zh - sPhi * xh,
    z: sPhi * zh + cPhi * xh,
  };
}

/** M_sky→ENU kept for tests / older callers: of-date HA frame, not J2000. */
export function skyToEnuMatrix(latDeg: number, date: Date, lon: number): number[][] {
  const lst = toRad(lstDegrees(date, lon));
  const lat = toRad(latDeg);
  const cL = Math.cos(lst);
  const sL = Math.sin(lst);
  const cPhi = Math.cos(lat);
  const sPhi = Math.sin(lat);
  return [
    [-sL, cL, 0],
    [-sPhi * cL, -sPhi * sL, cPhi],
    [cPhi * cL, cPhi * sL, sPhi],
  ];
}

/** J2000 ICRS unit vector → geographic ENU (precessed to of-date). */
export function icrsToEnu(vIcrf: Vector3, lat: number, lon: number, date: Date): Vector3 {
  const ofDate = matMulVec(eqjToEqdMatrix(date), vIcrf);
  return equatorialVectorToEnu(ofDate, lat, lon, date);
}
