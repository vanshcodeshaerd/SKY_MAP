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

function rotX(a: number): number[][] {
  const c = Math.cos(a), s = Math.sin(a);
  return [
    [1, 0, 0],
    [0, c, -s],
    [0, s, c],
  ];
}

function rotZ(a: number): number[][] {
  const c = Math.cos(a), s = Math.sin(a);
  return [
    [c, -s, 0],
    [s, c, 0],
    [0, 0, 1],
  ];
}

function matMul(a: number[][], b: number[][]): number[][] {
  const r: number[][] = [
    [0, 0, 0],
    [0, 0, 0],
    [0, 0, 0],
  ];
  for (let i = 0; i < 3; i++) {
    for (let j = 0; j < 3; j++) {
      for (let k = 0; k < 3; k++) r[i][j] += a[i][k] * b[k][j];
    }
  }
  return r;
}

/** M_sky→ENU = Rx(90°−φ) · Rz(LST) */
export function skyToEnuMatrix(latDeg: number, date: Date, lon: number): number[][] {
  const lst = toRad(lstDegrees(date, lon));
  const lat = toRad(latDeg);
  const rx = rotX(Math.PI / 2 - lat);
  const rz = rotZ(lst);
  return matMul(rx, rz);
}

export function icrsToEnu(vIcrf: Vector3, lat: number, lon: number, date: Date): Vector3 {
  const M = skyToEnuMatrix(lat, date, lon);
  return matMulVec(M, vIcrf);
}