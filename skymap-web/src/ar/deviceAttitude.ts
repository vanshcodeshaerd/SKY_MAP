/**
 * Real-time device attitude in geographic ENU.
 * Heading is the rear-camera optical azimuth (not raw compass when looking up).
 * cameraPitch: +90° zenith, 0° horizon, -90° nadir.
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
/** webkit/true-north minus optical heading — holds while looking at zenith. */
let compassBias = 0;

function wrap360(d: number) {
  return ((d % 360) + 360) % 360;
}

function angleDiff(a: number, b: number) {
  let d = a - b;
  while (d < -180) d += 360;
  while (d > 180) d -= 360;
  return d;
}

function screenRotationDeg(): number {
  if (typeof window === 'undefined') return 0;
  if (window.screen?.orientation?.angle != null) return window.screen.orientation.angle;
  const legacy = (window as Window & { orientation?: number }).orientation;
  return typeof legacy === 'number' ? legacy : 0;
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

  const Fx = -(cA * sG + sA * sB * cG);
  const Fy = -(sA * sG - cA * sB * cG);
  const Fz = -(cB * cG);
  const pitch = (Math.asin(Math.max(-1, Math.min(1, Fz))) * 180) / Math.PI;

  let opticalHeading = wrap360((Math.atan2(Fx, Fy) * 180) / Math.PI);
  const hasWebkit =
    typeof webkitHeading === 'number' && !Number.isNaN(webkitHeading) && webkitHeading >= 0;

  if (!hasWebkit) {
    opticalHeading = wrap360(opticalHeading + screenRotationDeg());
  }

  if (hasWebkit && Math.abs(pitch) < 52) {
    const target = angleDiff(webkitHeading, opticalHeading);
    compassBias += 0.14 * angleDiff(target, compassBias);
    compassBias = angleDiff(compassBias, 0);
  }

  const heading = wrap360(opticalHeading + compassBias);
  const roll = Math.abs(pitch) > 78 ? 0 : gamma;

  return {
    heading,
    pitch,
    roll,
    timestamp: performance.now(),
  };
}

/** Adaptive smoothing: overlay holds still when the phone is still. */
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
  const motion = Math.abs(dH) + Math.abs(dP) + Math.abs(dR) * 0.35;
  const factor = motion > 8 ? 0.78 : motion > 2.5 ? 0.5 : motion > 0.45 ? 0.22 : 0.07;

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
  compassBias = 0;
  smooth = { heading: 0, pitch: 25, roll: 0, timestamp: 0 };
}

export function setManualAttitude(heading: number, pitch: number, roll = 0) {
  const s = { heading: wrap360(heading), pitch, roll, timestamp: performance.now() };
  latest = s;
  smooth = s;
  initialized = true;
}
