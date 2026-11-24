import { toRad } from '../astronomy.ts';
import type { Vector3 } from '../projection.ts';

/**
 * Build orthonormal camera basis in ENU from compass heading + elevation pitch + roll.
 * +Z_cam = optical forward (rear camera), +X = right, +Y = up (on screen).
 */
export function enuCameraBasis(headingDeg: number, pitchDeg: number, rollDeg: number): {
  forward: Vector3;
  right: Vector3;
  up: Vector3;
} {
  const cH = toRad(headingDeg);
  const cP = toRad(pitchDeg);
  const cR = toRad(rollDeg);

  const forward: Vector3 = {
    x: Math.cos(cP) * Math.sin(cH),
    y: Math.cos(cP) * Math.cos(cH),
    z: Math.sin(cP),
  };

  const r0: Vector3 = { x: Math.cos(cH), y: -Math.sin(cH), z: 0 };
  const u0: Vector3 = {
    x: -Math.sin(cP) * Math.sin(cH),
    y: -Math.sin(cP) * Math.cos(cH),
    z: Math.cos(cP),
  };

  const cosR = Math.cos(cR);
  const sinR = Math.sin(cR);

  const right: Vector3 = {
    x: r0.x * cosR + u0.x * sinR,
    y: r0.y * cosR + u0.y * sinR,
    z: r0.z * cosR + u0.z * sinR,
  };
  const up: Vector3 = {
    x: -r0.x * sinR + u0.x * cosR,
    y: -r0.y * sinR + u0.y * cosR,
    z: -r0.z * sinR + u0.z * cosR,
  };

  return { forward, right, up };
}

/** Express world ENU vector in camera coordinates (+Z forward). */
export function enuToCameraSpace(v: Vector3, headingDeg: number, pitchDeg: number, rollDeg: number): Vector3 {
  const { forward, right, up } = enuCameraBasis(headingDeg, pitchDeg, rollDeg);
  return {
    x: v.x * right.x + v.y * right.y + v.z * right.z,
    y: v.x * up.x + v.y * up.y + v.z * up.z,
    z: v.x * forward.x + v.y * forward.y + v.z * forward.z,
  };
}

export function boresightFromAttitude(headingDeg: number, pitchDeg: number, rollDeg: number): Vector3 {
  return enuCameraBasis(headingDeg, pitchDeg, rollDeg).forward;
}