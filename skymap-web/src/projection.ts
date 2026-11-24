import { toRad } from './astronomy.ts';

export interface Vector3 {
  x: number;
  y: number;
  z: number;
}

export interface Point2D {
  x: number;
  y: number;
}

export function toENU(altDeg: number, azDeg: number): Vector3 {
  const alt = toRad(altDeg);
  const az = toRad(azDeg);
  return {
    x: Math.cos(alt) * Math.sin(az), // East
    y: Math.cos(alt) * Math.cos(az), // North
    z: Math.sin(alt),                // Up
  };
}

/**
 * Convert clockwise compass heading (0=N, 90=E, 180=S, 270=W)
 * to W3C DeviceOrientation alpha (counter-clockwise around Z).
 */
export function compassHeadingToW3cAlpha(headingDeg: number): number {
  return ((360 - headingDeg) % 360 + 360) % 360;
}

/**
 * Device-frame -> Earth-ENU rotation matrix per W3C Z-X'-Y'' convention.
 * Note: input `compassHeadingDeg` is clockwise from North (0=N, 90=E),
 * which is converted internally to W3C counter-clockwise alpha.
 */
export function orientationMatrix(
  compassHeadingDeg: number,
  betaDeg: number,
  gammaDeg: number,
  screenAngleDeg = 0
): number[][] {
  const alphaDeg = compassHeadingToW3cAlpha(compassHeadingDeg);
  const a = toRad(alphaDeg);
  const b = toRad(betaDeg);
  const g = toRad(gammaDeg);

  const [ca, sa] = [Math.cos(a), Math.sin(a)];
  const [cb, sb] = [Math.cos(b), Math.sin(b)];
  const [cg, sg] = [Math.cos(g), Math.sin(g)];

  // Base W3C Device -> ENU matrix
  const R: number[][] = [
    [ca * cg - sa * sb * sg, -cb * sa, ca * sg + cg * sa * sb],
    [cg * sa + ca * sb * sg,  ca * cb, sa * sg - ca * cg * sb],
    [-cb * sg,                sb,      cb * cg],
  ];

  if (!screenAngleDeg) return R;

  // Compensate for screen rotation (90 / -90 / 180) around device Z axis
  const s = toRad(-screenAngleDeg);
  const cs = Math.cos(s);
  const ss = Math.sin(s);
  return [
    [R[0][0] * cs + R[0][1] * ss, -R[0][0] * ss + R[0][1] * cs, R[0][2]],
    [R[1][0] * cs + R[1][1] * ss, -R[1][0] * ss + R[1][1] * cs, R[1][2]],
    [R[2][0] * cs + R[2][1] * ss, -R[2][0] * ss + R[2][1] * cs, R[2][2]],
  ];
}

/**
 * Transform world ENU vector into rear-camera coordinates.
 * In W3C device coordinates, +Z points out of the front screen, so the rear
 * camera optical axis is -Z_device. Here +X_cam = right, +Y_cam = up, +Z_cam = forward (-Z_device).
 */
export function worldToCamera(v: Vector3, R: number[][]): Vector3 {
  return {
    x:  (R[0][0] * v.x + R[1][0] * v.y + R[2][0] * v.z),
    y:  (R[0][1] * v.x + R[1][1] * v.y + R[2][1] * v.z),
    z: -(R[0][2] * v.x + R[1][2] * v.y + R[2][2] * v.z),
  };
}

/** Rear-camera boresight unit vector in world ENU coordinates (-Z_device). */
export function boresightENU(R: number[][]): Vector3 {
  return {
    x: -R[0][2],
    y: -R[1][2],
    z: -R[2][2],
  };
}

/** Clip a 3D camera-space segment against the near plane z = nearZ. */
export function clipSegmentToNearPlane(
  a: Vector3,
  b: Vector3,
  nearZ = 0.02
): [Vector3, Vector3] | null {
  const aIn = a.z > nearZ;
  const bIn = b.z > nearZ;
  if (!aIn && !bIn) return null;
  if (aIn && bIn) return [a, b];

  const t = (nearZ - a.z) / (b.z - a.z);
  const clipped: Vector3 = {
    x: a.x + t * (b.x - a.x),
    y: a.y + t * (b.y - a.y),
    z: nearZ,
  };
  return aIn ? [a, clipped] : [clipped, b];
}

export function project(vCam: Vector3, w: number, h: number, hFovDeg: number): Point2D | null {
  if (vCam.z <= 0.001) return null;

  const fx = w / (2 * Math.tan(toRad(hFovDeg) / 2));
  const fy = fx;

  return {
    x: w / 2 + fx * (vCam.x / vCam.z),
    y: h / 2 - fy * (vCam.y / vCam.z),
  };
}
