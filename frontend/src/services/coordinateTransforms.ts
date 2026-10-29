/**
 * Mathematical transformations for coordinate systems, vectors, and camera projections.
 * Adheres strictly to the ENU (East-North-Up) world frame and Three.js camera conventions.
 */

import * as THREE from 'three';

/**
 * Converts topocentric Azimuth and Altitude (in degrees) to an East-North-Up (ENU) unit direction vector.
 * +X = East, +Y = North, +Z = Up (Zenith)
 */
export function azAltToEnuVector(azimuthDeg: number, altitudeDeg: number): THREE.Vector3 {
  const azRad = THREE.MathUtils.degToRad(azimuthDeg);
  const altRad = THREE.MathUtils.degToRad(altitudeDeg);
  const cosAlt = Math.cos(altRad);

  const x = cosAlt * Math.sin(azRad); // East
  const y = cosAlt * Math.cos(azRad); // North
  const z = Math.sin(altRad);         // Up

  return new THREE.Vector3(x, y, z).normalize();
}

/**
 * Converts an ENU vector to Three.js world space coordinates.
 * In Three.js: +X = Right (East), +Y = Up (Zenith), +Z = South (-North)
 */
export function enuToThreeJsVector(enu: THREE.Vector3, radius: number = 100): THREE.Vector3 {
  // Mapping: Three.X = ENU.X (East), Three.Y = ENU.Z (Up), Three.Z = -ENU.Y (-North)
  return new THREE.Vector3(enu.x * radius, enu.z * radius, -enu.y * radius);
}

/**
 * Computes a camera rotation quaternion from W3C DeviceOrientation Euler angles (alpha, beta, gamma).
 * Includes user declination and manual nudge offsets.
 */
export function orientationToQuaternion(
  alphaDeg: number,
  betaDeg: number,
  gammaDeg: number,
  azimuthNudgeDeg: number = 0,
  altitudeNudgeDeg: number = 0,
  declinationDeg: number = 0
): THREE.Quaternion {
  // Apply magnetic declination and user nudge to heading
  const adjustedAlpha = (alphaDeg + declinationDeg + azimuthNudgeDeg + 360) % 360;
  const adjustedBeta = betaDeg + altitudeNudgeDeg;

  const alpha = THREE.MathUtils.degToRad(adjustedAlpha);
  const beta = THREE.MathUtils.degToRad(adjustedBeta);
  const gamma = THREE.MathUtils.degToRad(gammaDeg);

  // W3C DeviceOrientation rotation order is Z-X'-Y'' ('YXZ' in Three.js terms)
  const euler = new THREE.Euler(beta, alpha, -gamma, 'YXZ');
  const quat = new THREE.Quaternion().setFromEuler(euler);

  // Rotate from device coordinate system to camera viewing forward frame
  // Device screen looks towards -Z, top is +Y
  const screenAdjustment = new THREE.Quaternion().setFromAxisAngle(
    new THREE.Vector3(1, 0, 0),
    -Math.PI / 2
  );
  quat.multiply(screenAdjustment);

  return quat;
}

/**
 * Projects a 3D unit direction vector in camera space onto 2D screen pixel coordinates
 * using the ideal pinhole camera model.
 *
 * @param sunCam 3D vector in camera space where -Z is forward, +X is right, +Y is up
 * @param viewWidth Viewport width in pixels
 * @param viewHeight Viewport height in pixels
 * @param fovYDeg Vertical field of view in degrees
 * @returns { u, v, isInFront, angularSeparationDeg }
 */
export function projectVectorToScreen(
  sunCam: THREE.Vector3,
  viewWidth: number,
  viewHeight: number,
  fovYDeg: number = 60
): { u: number; v: number; isInFront: boolean; angularSeparationDeg: number } {
  // In camera frame, optical axis points down -Z
  const isInFront = sunCam.z < 0;

  // Angular distance between optical center ray (0, 0, -1) and sun vector
  const forwardRay = new THREE.Vector3(0, 0, -1);
  const dotProd = Math.max(-1.0, Math.min(1.0, forwardRay.dot(sunCam)));
  const angularSeparationDeg = THREE.MathUtils.radToDeg(Math.acos(dotProd));

  // Avoid division by zero when point is behind lens
  const zDepth = Math.abs(sunCam.z) < 0.001 ? 0.001 : Math.abs(sunCam.z);

  // Pinhole focal lengths in pixels
  const fovYRad = THREE.MathUtils.degToRad(fovYDeg);
  const fy = viewHeight / (2.0 * Math.tan(fovYRad / 2.0));
  const fx = fy; // Square pixels assumption

  const cx = viewWidth / 2.0;
  const cy = viewHeight / 2.0;

  // Normalized camera coordinates: x_n = X / (-Z), y_n = Y / (-Z)
  const xn = sunCam.x / zDepth;
  const yn = sunCam.y / zDepth;

  // Screen pixels (u increases right, v increases down)
  const u = cx + fx * xn;
  const v = cy - fy * yn; // Invert Y for screen raster coordinates

  return { u, v, isInFront, angularSeparationDeg };
}

/**
 * Mathematically exact projection from ENU (East-North-Up) world frame directly
 * to 2D screen coordinates based on camera Compass Heading, Elevation Pitch, and Roll.
 * Completely eliminates Euler gimbal lock, axis swapping, and coordinate mismatches.
 */
export function projectEnuToScreen(
  targetEnu: THREE.Vector3,
  camHeadingDeg: number,
  camPitchDeg: number,
  camRollDeg: number,
  viewWidth: number,
  viewHeight: number,
  fovYDeg: number = 60
): {
  u: number;
  v: number;
  isInFront: boolean;
  angularSeparationDeg: number;
  xCam: number;
  yCam: number;
  zCam: number;
  azimuthOffsetDeg: number;
  elevationOffsetDeg: number;
} {
  const cH = THREE.MathUtils.degToRad(camHeadingDeg);
  const cP = THREE.MathUtils.degToRad(camPitchDeg);
  const cR = THREE.MathUtils.degToRad(camRollDeg);

  // F: Camera Forward Optical Axis in ENU (+Zcam)
  const Fx = Math.cos(cP) * Math.sin(cH);
  const Fy = Math.cos(cP) * Math.cos(cH);
  const Fz = Math.sin(cP);

  // R0: Unrolled Right vector in ENU (perpendicular to heading on horizontal plane)
  const R0x = Math.cos(cH);
  const R0y = -Math.sin(cH);
  const R0z = 0;

  // U0: Unrolled Up vector in ENU (R0 x F)
  const U0x = -Math.sin(cP) * Math.sin(cH);
  const U0y = -Math.sin(cP) * Math.cos(cH);
  const U0z = Math.cos(cP);

  // Apply camera roll around optical axis F
  const cosR = Math.cos(cR);
  const sinR = Math.sin(cR);

  const Rx = R0x * cosR + U0x * sinR;
  const Ry = R0y * cosR + U0y * sinR;
  const Rz = R0z * cosR + U0z * sinR;

  const Ux = -R0x * sinR + U0x * cosR;
  const Uy = -R0y * sinR + U0y * cosR;
  const Uz = -R0z * sinR + U0z * cosR;

  // Project target ENU vector onto camera orthonormal basis via dot products
  const xCam = targetEnu.x * Rx + targetEnu.y * Ry + targetEnu.z * Rz;
  const yCam = targetEnu.x * Ux + targetEnu.y * Uy + targetEnu.z * Uz;
  const zCam = targetEnu.x * Fx + targetEnu.y * Fy + targetEnu.z * Fz;

  const isInFront = zCam > 0;
  const dotForward = Math.max(-1.0, Math.min(1.0, zCam));
  const angularSeparationDeg = THREE.MathUtils.radToDeg(Math.acos(dotForward));

  // Ideal Pinhole perspective projection
  const fovYRad = THREE.MathUtils.degToRad(fovYDeg);
  const fy = viewHeight / (2.0 * Math.tan(fovYRad / 2.0));
  const fx = fy;
  const cx = viewWidth / 2.0;
  const cy = viewHeight / 2.0;

  const zDepth = Math.max(0.001, Math.abs(zCam));
  const u = cx + (xCam / zDepth) * fx;
  const v = cy - (yCam / zDepth) * fy;

  // Angular offsets relative to camera center boresight
  const azimuthOffsetDeg = THREE.MathUtils.radToDeg(Math.atan2(xCam, zCam));
  const elevationOffsetDeg = THREE.MathUtils.radToDeg(Math.atan2(yCam, Math.hypot(xCam, zCam)));

  return {
    u,
    v,
    isInFront,
    angularSeparationDeg,
    xCam,
    yCam,
    zCam,
    azimuthOffsetDeg,
    elevationOffsetDeg,
  };
}

/**
 * Computes the angular error (in degrees) between two 3D direction vectors.
 */
export function computeAngularErrorDeg(v1: THREE.Vector3, v2: THREE.Vector3): number {
  const u1 = v1.clone().normalize();
  const u2 = v2.clone().normalize();
  const dot = Math.max(-1.0, Math.min(1.0, u1.dot(u2)));
  return THREE.MathUtils.radToDeg(Math.acos(dot));
}
