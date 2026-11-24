/**
 * Automated Mathematical, Astronomical, Projection & Catalog Verification Suite
 * Run: node --experimental-strip-types scripts/test-astronomy.mjs
 */
import assert from 'node:assert/strict';
import fs from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

import { sunAltAz, moonAltAz } from '../src/astronomy.ts';
import { equatorialToHorizontal, horizontalToEquatorial, lstDegrees } from '../src/astronomy/fast.ts';
import { angularSeparationDeg, applyProperMotion } from '../src/astronomy/precision.ts';
import { boresightENU, clipSegmentToNearPlane, orientationMatrix, project, toENU, worldToCamera } from '../src/projection.ts';
import { planetAltAz, planetEquatorial, NAKED_EYE_PLANETS } from '../src/planets.ts';
import { visibilityFromMode } from '../src/render/types.ts';
import { headingToCardinal } from '../src/ui/compassHud.ts';
import { icrsUnitVector } from '../src/astronomy/icrs.ts';
import { equatorialVectorToEnu, icrsToEnu } from '../src/astronomy/skyTransform.ts';
import * as Astronomy from 'astronomy-engine';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const stars = JSON.parse(fs.readFileSync(path.join(__dirname, '../src/data/stars.advanced.json'), 'utf-8'));

// 1. Test Mode Visibility Filtering
const both = visibilityFromMode('BOTH');
assert.equal(both.planets && both.stars && both.constellations, true);
const planetsOnly = visibilityFromMode('PLANETS');
assert.equal(planetsOnly.planets, true);
assert.equal(planetsOnly.stars, false);
assert.equal(planetsOnly.constellations, false);
assert.equal(planetsOnly.constellationLines, false);
assert.equal(planetsOnly.deepSkyObjects, false);
const conOnly = visibilityFromMode('CONSTELLATIONS');
assert.equal(conOnly.planets, false);
assert.equal(conOnly.stars, true);
assert.equal(conOnly.constellations, true);
assert.equal(conOnly.deepSkyObjects, false);
console.log('✓ Mode filtering (BOTH / PLANETS / CONSTELLATIONS) passed');

// 2. Test Rear-Camera Projection & Heading Alignment
// Upright portrait facing North (heading=0, beta=90, gamma=0)
const R_north = orientationMatrix(0, 90, 0);
const bNorth = boresightENU(R_north);
assert.ok(Math.abs(bNorth.x) < 1e-6 && bNorth.y > 0.999 && Math.abs(bNorth.z) < 1e-6, 'North boresight failed');
const camNorth = worldToCamera({ x: 0, y: 1, z: 0 }, R_north);
assert.ok(camNorth.z > 0.999, 'Star due North must be in front of rear camera (+z_cam)');
const ptNorth = project(camNorth, 1000, 800, 65);
assert.ok(ptNorth && Math.abs(ptNorth.x - 500) < 0.1 && Math.abs(ptNorth.y - 400) < 0.1, 'Center projection failed');

// Turning East (heading=90, beta=90, gamma=0)
const R_east = orientationMatrix(90, 90, 0);
const bEast = boresightENU(R_east);
assert.ok(bEast.x > 0.999 && Math.abs(bEast.y) < 1e-6, 'East boresight failed');
const camEast = worldToCamera({ x: 1, y: 0, z: 0 }, R_east);
assert.ok(camEast.z > 0.999, 'Star due East must be in front of rear camera when heading=90');
console.log('✓ AR Rear-Camera Alignment & W3C Heading Orientation passed');

// 3. Near-plane Clipping
const clipped = clipSegmentToNearPlane({ x: 0, y: 0, z: 1 }, { x: 2, y: 0, z: -1 }, 0.02);
assert.ok(clipped !== null && Math.abs(clipped[1].z - 0.02) < 1e-6, 'Near-plane clipping failed');
assert.equal(clipSegmentToNearPlane({ x: 0, y: 0, z: -1 }, { x: 1, y: 0, z: -2 }), null);
console.log('✓ Camera frustum near-plane line clipping passed');

// 4. Spherical Geometry & Round-Trip RA/Dec <-> Alt/Az across 5 geographic locations
const locations = [
  { name: 'Ahmedabad', lat: 23.0225, lon: 72.5714 },
  { name: 'London', lat: 51.5074, lon: -0.1278 },
  { name: 'Tokyo', lat: 35.6762, lon: 139.6503 },
  { name: 'New York', lat: 40.7128, lon: -74.0060 },
  { name: 'Sydney', lat: -33.8688, lon: 151.2093 },
];
const testDate = new Date('2026-01-15T20:00:00Z');
const benchmarkNames = ['Sirius', 'Polaris', 'Betelgeuse', 'Rigel', 'Vega'];

for (const loc of locations) {
  for (const name of benchmarkNames) {
    const s = stars.find((x) => x.name === name);
    assert.ok(s, `Missing benchmark star ${name}`);
    const hor = equatorialToHorizontal(s.ra, s.dec, loc.lat, loc.lon, testDate);
    assert.ok(hor.azimuth >= 0 && hor.azimuth < 360, 'Azimuth normalization failed');
    const back = horizontalToEquatorial(hor.altitude, hor.azimuth, loc.lat, loc.lon, testDate);
    const err = angularSeparationDeg(s.ra, s.dec, back.ra, back.dec);
    assert.ok(err < 1e-4, `Round-trip error too large for ${name} at ${loc.name}: ${err}`);
  }
  // Polaris altitude should be within ~1° of observer latitude in Northern Hemisphere
  if (loc.lat > 10) {
    const polaris = stars.find((x) => x.name === 'Polaris');
    const polHor = equatorialToHorizontal(polaris.ra, polaris.dec, loc.lat, loc.lon, testDate);
    assert.ok(Math.abs(polHor.altitude - loc.lat) < 1.0, `Polaris alt mismatch at ${loc.name}`);
  }
}
console.log('✓ 5-location RA/Dec <-> Alt/Az round-trip & Polaris latitude validation passed (<0.0001° error)');

// 5. Planetary Ephemeris Validation (Mercury, Venus, Mars, Jupiter, Saturn + Sun/Moon)
for (const p of NAKED_EYE_PLANETS) {
  const eq = planetEquatorial(p, testDate, 23.0225, 72.5714);
  assert.ok(eq.ra >= 0 && eq.ra < 360 && eq.dec >= -35 && eq.dec <= 35, `Invalid planet coords for ${p}`);
  assert.ok(eq.distanceAU > 0.2 && eq.distanceAU < 12, `Invalid AU distance for ${p}`);
  const hor = planetAltAz(p, testDate, 23.0225, 72.5714);
  assert.ok(hor.azimuth >= 0 && hor.azimuth < 360);
}
const sun = sunAltAz(testDate, 23.0225, 72.5714);
const moon = moonAltAz(testDate, 23.0225, 72.5714);
assert.ok(Number.isFinite(sun.altitude) && Number.isFinite(moon.altitude));
console.log('✓ Planetary ephemeris (5 planets + Sun/Moon) validation passed');

// 6. Compass Cardinal & Proper Motion
assert.equal(headingToCardinal(0), 'N');
assert.equal(headingToCardinal(90), 'E');
assert.equal(headingToCardinal(225), 'SW');
const sirius = stars.find((x) => x.name === 'Sirius');
const pm = applyProperMotion(sirius, new Date('2050-01-01T00:00:00Z'));
assert.ok(Number.isFinite(pm.ra) && Number.isFinite(pm.dec));
console.log('✓ Compass cardinal & proper motion checks passed');

// 7. Star ENU must match alt/az ENU so constellations sit on the same sky as planets
{
  const ra = 88.7929;
  const dec = 7.4071;
  const loc = { lat: 34.0522, lon: -118.2437 };
  const v = icrsUnitVector(ra, dec);
  const enuA = equatorialVectorToEnu(v, loc.lat, loc.lon, testDate);
  const hor = equatorialToHorizontal(ra, dec, loc.lat, loc.lon, testDate);
  const enuB = toENU(hor.altitude, hor.azimuth);
  const mismatch = Math.hypot(enuA.x - enuB.x, enuA.y - enuB.y, enuA.z - enuB.z);
  assert.ok(mismatch < 1e-8, `Star ENU vs alt/az ENU mismatch ${mismatch}`);

  const obs = new Astronomy.Observer(loc.lat, loc.lon, 0);
  const eqj = Astronomy.VectorFromSphere(new Astronomy.Spherical(dec, ra, 1), testDate);
  const eqd = Astronomy.RotateVector(Astronomy.Rotation_EQJ_EQD(testDate), eqj);
  const eq = Astronomy.EquatorFromVector(eqd);
  const horE = Astronomy.Horizon(testDate, obs, eq.ra, eq.dec);
  const enuStar = icrsToEnu(v, loc.lat, loc.lon, testDate);
  const enuEng = toENU(horE.altitude, horE.azimuth);
  const ang = Math.acos(Math.max(-1, Math.min(1, enuStar.x * enuEng.x + enuStar.y * enuEng.y + enuStar.z * enuEng.z))) * (180 / Math.PI);
  assert.ok(ang < 0.75, `Precessed star vs engine Horizon ${ang}°`);

  const jup = planetAltAz('Jupiter', testDate, loc.lat, loc.lon);
  const jeq = planetEquatorial('Jupiter', testDate, loc.lat, loc.lon);
  const jh = Astronomy.Horizon(testDate, obs, jeq.ra / 15, jeq.dec, 'normal');
  assert.ok(Math.abs(jup.altitude - jh.altitude) < 0.02 && Math.abs(((jup.azimuth - jh.azimuth + 540) % 360) - 180) < 0.02);
  console.log('✓ Star/constellation ENU matches planets; planets use engine Horizon');
}
