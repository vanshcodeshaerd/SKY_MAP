/**
 * Adaptive device attitude smoothing (ported from skymap-web/src/ar/deviceAttitude.ts).
 */

export interface DeviceAttitude {
  heading: number;
  pitch: number;
  roll: number;
  timestamp: number;
}

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

export function pushAttitudeSample(sample: DeviceAttitude): DeviceAttitude {
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

export function getSmoothedAttitude(): DeviceAttitude {
  return smooth;
}

export function resetAttitudeFilter() {
  initialized = false;
  smooth = { heading: 0, pitch: 25, roll: 0, timestamp: 0 };
}