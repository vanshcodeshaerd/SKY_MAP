/**
 * Real-time device attitude in geographic ENU frame (matches SkyGazer AR math).
 * cameraPitch: +90° zenith, 0° horizon, -90° nadir — NOT raw DeviceOrientation beta.
 */

export interface DeviceAttitude {
  heading: number;
  pitch: number;
  roll: number;
  timestamp: number;
}

let latest: DeviceAttitude = { heading: 0, pitch: 25, roll: 0, timestamp: 0 };
let smooth: DeviceAttitude = { heading: 0, pitch: 25, roll: 0, timestamp: 0 };
let initialized = false;

function wrap360(d: number) {
  return ((d % 360) + 360) % 360;
}

function angleDiff(a: number, b: number) {
  let d = a - b;
  while (d < -180) d += 360;
  while (d > 180) d -= 360;
  return d;
}

/** Parse a DeviceOrientationEvent into geographic heading + elevation pitch. */
export function attitudeFromEvent(e: DeviceOrientationEvent): DeviceAttitude {
  const alpha = e.alpha ?? 0;
  const beta = e.beta ?? 90;
  const gamma = e.gamma ?? 0;

  const webkitHeading = (e as DeviceOrientationEvent & { webkitCompassHeading?: number }).webkitCompassHeading;

  const deg2rad = Math.PI / 180;
  const a = alpha * deg2rad;
  const b = beta * deg2rad;
  const g = gamma * deg2rad;
  const cA = Math.cos(a),
    sA = Math.sin(a);
  const cB = Math.cos(b),
    sB = Math.sin(b);
  const cG = Math.cos(g),
    sG = Math.sin(g);

  // Rear-camera optical axis in ENU (same as useDeviceOrientation)
  const Fx = -(cA * sG + sA * sB * cG);
  const Fy = -(sA * sG - cA * sB * cG);
  const Fz = -(cB * cG);
  const pitch = (Math.asin(Math.max(-1, Math.min(1, Fz))) * 180) / Math.PI;

  let heading: number;
  if (typeof webkitHeading === 'number' && !Number.isNaN(webkitHeading) && webkitHeading >= 0) {
    heading = wrap360(webkitHeading);
  } else {
    heading = wrap360((Math.atan2(Fx, Fy) * 180) / Math.PI);
    let screenAngle = 0;
    if (typeof window !== 'undefined') {
      if (window.screen?.orientation?.angle != null) screenAngle = window.screen.orientation.angle;
      else if (typeof (window as Window & { orientation?: number }).orientation === 'number') {
        screenAngle = (window as Window & { orientation?: number }).orientation!;
      }
    }
    heading = wrap360(heading + screenAngle);
  }

  return {
    heading,
    pitch,
    roll: gamma,
    timestamp: performance.now(),
  };
}

/** Adaptive smoothing: low lag when panning, light damping when still. */
export function pushAttitudeSample(sample: DeviceAttitude): DeviceAttitude {
  latest = sample;
  if (!initialized) {
    smooth = { ...sample };
    initialized = true;
    return smooth;
  }

  const dH = angleDiff(sample.heading, smooth.heading);
  const dP = sample.pitch - smooth.pitch;
  const dR = sample.roll - smooth.roll;
  const motion = Math.abs(dH) + Math.abs(dP);
  const factor = motion > 5 ? 0.72 : motion > 1.5 ? 0.48 : 0.28;

  smooth = {
    heading: wrap360(smooth.heading + dH * factor),
    pitch: smooth.pitch + dP * factor,
    roll: smooth.roll + dR * factor,
    timestamp: sample.timestamp,
  };
  return smooth;
}

export function getLatestAttitude(): DeviceAttitude {
  return latest;
}

export function getSmoothedAttitude(): DeviceAttitude {
  return smooth;
}

export function resetAttitudeFilter() {
  initialized = false;
  smooth = { heading: 0, pitch: 25, roll: 0, timestamp: 0 };
}

/** For planetarium / manual override */
export function setManualAttitude(heading: number, pitch: number, roll = 0) {
  const s = { heading: wrap360(heading), pitch, roll, timestamp: performance.now() };
  latest = s;
  smooth = s;
  initialized = true;
}