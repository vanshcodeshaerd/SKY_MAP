import { toRad } from './astronomy';

export interface Vector3 {
    x: number;
    y: number;
    z: number;
}

export function toENU(altDeg: number, azDeg: number): Vector3 {
  const alt = toRad(altDeg), az = toRad(azDeg);
  return {
    x: Math.cos(alt) * Math.sin(az), // east
    y: Math.cos(alt) * Math.cos(az), // north
    z: Math.sin(alt),                // up
  };
}

export function orientationMatrix(alphaDeg: number, betaDeg: number, gammaDeg: number): number[][] {
  const a = toRad(alphaDeg), b = toRad(betaDeg), g = toRad(gammaDeg);
  const [ca, sa] = [Math.cos(a), Math.sin(a)];
  const [cb, sb] = [Math.cos(b), Math.sin(b)];
  const [cg, sg] = [Math.cos(g), Math.sin(g)];
  
  // Device-frame -> Earth-frame rotation matrix, per the W3C spec's Z-X'-Y'' composition
  return [
    [ca * cg - sa * sb * sg, -cb * sa, ca * sg + cg * sa * sb],
    [cg * sa + ca * sb * sg,  ca * cb, sa * sg - ca * cg * sb],
    [-cb * sg,                sb,      cb * cg],
  ];
}

export function worldToCamera(v: Vector3, R: number[][]): Vector3 {
  // Camera-frame vector = R^T * v_world (R maps device->world, so its transpose maps world->device)
  return {
    x: R[0][0]*v.x + R[1][0]*v.y + R[2][0]*v.z,
    y: R[0][1]*v.x + R[1][1]*v.y + R[2][1]*v.z,
    z: R[0][2]*v.x + R[1][2]*v.y + R[2][2]*v.z,
  };
}

export interface Point2D {
    x: number;
    y: number;
}

export function project(vCam: Vector3, w: number, h: number, hFovDeg: number): Point2D | null {
  if (vCam.z <= 0) return null; // behind the camera
  
  const fx = w / (2 * Math.tan(toRad(hFovDeg) / 2));
  const fy = fx * (h / w); // assume square pixels
  
  return {
    x: w / 2 + fx * (vCam.x / vCam.z),
    y: h / 2 - fy * (vCam.y / vCam.z),
  };
}
