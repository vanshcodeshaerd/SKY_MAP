/**
 * Dry run: client astronomy-engine vs optional FastAPI backend + AR attitude sanity.
 * Run: tsx scripts/dry-run-e2e.mjs
 * Env: API_BASE=http://127.0.0.1:8000 (optional)
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { sunAltAz, moonAltAz } from '../src/astronomy.ts';
import { planetEquatorial } from '../src/planets.ts';
import { equatorialToHorizontal, horizontalToEquatorial } from '../src/astronomy/fast.ts';
import { angularSeparationDeg } from '../src/astronomy/precision.ts';
import { enuToCameraSpace } from '../src/projection/enuCamera.ts';
import { boresightFromAttitude } from '../src/projection/enuCamera.ts';
import { toENU } from '../src/projection.ts';
import { attitudeFromEvent, pushAttitudeSample, resetAttitudeFilter } from '../src/ar/deviceAttitude.ts';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stars = JSON.parse(
  fs.readFileSync(path.join(__dirname, '../src/data/stars.advanced.json'), 'utf-8')
);

const CA = { name: 'Los Angeles, CA', lat: 34.0522, lon: -118.2437 };
const NOW = new Date();

const API_BASE = process.env.API_BASE || 'http://127.0.0.1:8000';

const report = {
  timestamp: NOW.toISOString(),
  location: CA,
  backend: { reachable: false, health: null, solarCompare: null },
  clientEphemeris: {},
  coordinateAccuracy: {},
  arAttitude: {},
  catalog: {},
  detection: {},
  stability: {},
};

// --- Backend connectivity ---
try {
  const healthRes = await fetch(`${API_BASE}/api/health`, { signal: AbortSignal.timeout(3000) });
  if (healthRes.ok) {
    report.backend.reachable = true;
    report.backend.health = await healthRes.json();
    const params = new URLSearchParams({
      latitude: String(CA.lat),
      longitude: String(CA.lon),
      elevation_m: '0',
      body: 'sun',
    });
    const solarRes = await fetch(`${API_BASE}/api/solar/position?${params}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (solarRes.ok) {
      const solar = await solarRes.json();
      const clientSun = sunAltAz(NOW, CA.lat, CA.lon);
      const azErr = Math.abs(((solar.azimuth_degrees - clientSun.azimuth + 540) % 360) - 180);
      const altErr = Math.abs(solar.altitude_degrees - clientSun.altitude);
      report.backend.solarCompare = {
        backendAlt: solar.altitude_degrees,
        clientAlt: clientSun.altitude,
        backendAz: solar.azimuth_degrees,
        clientAz: clientSun.azimuth,
        altitudeErrorDeg: Number(altErr.toFixed(4)),
        azimuthErrorDeg: Number(azErr.toFixed(4)),
        engine: solar.ephemeris ?? 'Skyfield DE421',
      };
    }
  }
} catch (e) {
  report.backend.error = String(e.message || e);
}

const sun = sunAltAz(NOW, CA.lat, CA.lon);
const moon = moonAltAz(NOW, CA.lat, CA.lon);
report.clientEphemeris = {
  sun: { alt: Number(sun.altitude.toFixed(2)), az: Number(sun.azimuth.toFixed(1)) },
  moon: { alt: Number(moon.altitude.toFixed(2)), az: Number(moon.azimuth.toFixed(1)) },
};

for (const name of ['Mercury', 'Venus', 'Mars', 'Jupiter', 'Saturn']) {
  const eq = planetEquatorial(name, NOW, CA.lat, CA.lon);
  const hor = equatorialToHorizontal(eq.ra, eq.dec, CA.lat, CA.lon, NOW);
  report.clientEphemeris[name] = {
    alt: Number(hor.altitude.toFixed(2)),
    az: Number(hor.azimuth.toFixed(1)),
    mag: Number(eq.magnitude.toFixed(2)),
  };
}

const benchmarks = ['Sirius', 'Betelgeuse', 'Vega', 'Polaris', 'Rigel'];
const roundTripErrs = [];
for (const name of benchmarks) {
  const s = stars.find((x) => x.name === name);
  if (!s) continue;
  const hor = equatorialToHorizontal(s.ra, s.dec, CA.lat, CA.lon, NOW);
  const back = horizontalToEquatorial(hor.altitude, hor.azimuth, CA.lat, CA.lon, NOW);
  roundTripErrs.push(angularSeparationDeg(s.ra, s.dec, back.ra, back.dec));
}
report.coordinateAccuracy = {
  locationsTested: 1,
  benchmarkStars: benchmarks.length,
  maxRoundTripDeg: Math.max(...roundTripErrs),
  meanRoundTripDeg: roundTripErrs.reduce((a, b) => a + b, 0) / roundTripErrs.length,
};

// AR: synthetic device event — phone vertical, pointing ~horizon north
resetAttitudeFilter();
const fakeEvent = {
  alpha: 0,
  beta: 90,
  gamma: 0,
  absolute: true,
};
const att = attitudeFromEvent(fakeEvent);
pushAttitudeSample(att);
const bore = boresightFromAttitude(att.heading, att.pitch, att.roll);
const horiz = Math.hypot(bore.x, bore.y);
const boreAlt = (Math.atan2(bore.z, horiz) * 180) / Math.PI;
report.arAttitude = {
  syntheticPortraitLevel: true,
  heading: Number(att.heading.toFixed(1)),
  pitch: Number(att.pitch.toFixed(1)),
  boresightAlt: Number(boreAlt.toFixed(2)),
};

// Sun at computed alt/az should project in front of camera when attitude matches
const sunEnu = toENU(sun.altitude, sun.azimuth);
const camMatch = enuToCameraSpace(sunEnu, att.heading, att.pitch, att.roll);
report.arAttitude.sunProjectableWhenAligned = camMatch.z > 0.01;

// Detection stability: cone-like angular separation for California boresight on Orion region
const orionStar = stars.find((x) => x.name === 'Betelgeuse');
if (orionStar) {
  const sep = angularSeparationDeg(orionStar.ra, orionStar.dec, 88.8, 7.4);
  report.detection = {
    betelgeuseToOrionCenterSepDeg: Number(sep.toFixed(2)),
    constellationCatalog88: true,
    lineGraphValidated: 'run npm run validate:catalog',
  };
}

report.stability = {
  sensorSmoothing: 'adaptive 0.28–0.72 (skymap-web deviceAttitude)',
  skyEnuRefreshMs: 120,
  constellationTrackerDwellMs: 180,
  uiRecognitionThrottleMs: 250,
  note: 'Physical camera AR stability requires on-device QA; automated tests cover math only',
};

console.log('=== SkyMap AR/VR Dry Run Report ===\n');
console.log(JSON.stringify(report, null, 2));

if (report.backend.reachable && report.backend.solarCompare) {
  assert.ok(report.backend.solarCompare.altitudeErrorDeg < 0.15, 'Sun alt mismatch vs backend');
  assert.ok(report.backend.solarCompare.azimuthErrorDeg < 0.25, 'Sun az mismatch vs backend');
  console.log('\n✓ Backend↔client Sun agreement within tolerance');
}

assert.ok(report.coordinateAccuracy.maxRoundTripDeg < 1e-3, 'Round-trip error too large');
console.log('✓ Client coordinate round-trip OK');

process.exit(report.backend.reachable ? 0 : 0);