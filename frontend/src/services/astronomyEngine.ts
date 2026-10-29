/**
 * In-browser ephemeris calculator powered by Astronomy Engine (VSOP87 planetary theory).
 * Provides instantaneous, zero-latency 60 FPS celestial coordinates (Sun, Moon & Planets),
 * diurnal trajectories, and rise/set times.
 */

import * as Astronomy from 'astronomy-engine';
import {
  GeodeticLocation,
  SolarCoordinates,
  SolarEvents,
  DiurnalWaypoint,
  CelestialBodyId,
  CelestialCoordinates,
  CelestialEvents,
  CELESTIAL_BODIES,
  CELESTIAL_BODY_LIST,
} from '../types/astronomy';
import { azAltToEnuVector } from './coordinateTransforms';

// AU to Kilometers constant
const KM_PER_AU = 149597870.7;

/**
 * Returns human-readable Moon phase name based on 0-360 deg phase angle.
 */
export function getMoonPhaseName(phaseDeg: number): string {
  const norm = ((phaseDeg % 360) + 360) % 360;
  if (norm < 22.5 || norm >= 337.5) return 'New Moon';
  if (norm < 67.5) return 'Waxing Crescent';
  if (norm < 112.5) return 'First Quarter';
  if (norm < 157.5) return 'Waxing Gibbous';
  if (norm < 202.5) return 'Full Moon';
  if (norm < 247.5) return 'Waning Gibbous';
  if (norm < 292.5) return 'Third Quarter';
  return 'Waning Crescent';
}

/**
 * Calculates instantaneous topocentric coordinates for ANY celestial body.
 */
export function getClientCelestialPosition(
  bodyId: CelestialBodyId,
  location: GeodeticLocation,
  date: Date = new Date()
): CelestialCoordinates {
  const observer = new Astronomy.Observer(location.latitude, location.longitude, location.elevationM);
  const body = Astronomy.Body[bodyId];

  // Apparent topocentric equatorial coordinates
  const equator = Astronomy.Equator(body, date, observer, true, true);

  // Topocentric horizontal coordinates (with Bennett refraction)
  const horizonRefracted = Astronomy.Horizon(date, observer, equator.ra, equator.dec, 'normal');

  // Topocentric horizontal coordinates (without refraction)
  const horizonAirless = Astronomy.Horizon(date, observer, equator.ra, equator.dec);

  const refractionDeg = horizonRefracted.altitude - horizonAirless.altitude;
  const distanceAu = equator.dist;
  const distanceKm = distanceAu * KM_PER_AU;

  let magnitude: number | undefined;
  let phaseFraction: number | undefined;
  let phaseAngleDeg: number | undefined;
  let phaseName: string | undefined;

  try {
    const illum = Astronomy.Illumination(body, date);
    if (illum) {
      magnitude = illum.mag;
      phaseFraction = illum.phase_fraction;
      phaseAngleDeg = illum.phase_angle;
    }
  } catch {
    // Some minor bodies or stars might not support illumination
  }

  if (bodyId === 'Moon') {
    try {
      const moonPhaseDeg = Astronomy.MoonPhase(date);
      phaseName = getMoonPhaseName(moonPhaseDeg);
    } catch {
      phaseName = 'Waxing';
    }
  }

  const meta = CELESTIAL_BODIES[bodyId];

  return {
    bodyId,
    name: meta?.name || bodyId,
    symbol: meta?.symbol || '✨',
    color: meta?.color || '#FFFFFF',
    azimuthDeg: horizonRefracted.azimuth,
    altitudeDeg: horizonRefracted.altitude,
    geometricAltitudeDeg: horizonAirless.altitude,
    refractionDeg: Math.max(0, refractionDeg),
    distanceAu,
    distanceKm,
    isAboveHorizon: horizonRefracted.altitude >= 0.0,
    timestampUtc: date.toISOString(),
    magnitude,
    phaseFraction,
    phaseAngleDeg,
    phaseName,
  };
}

/**
 * Calculates instantaneous topocentric coordinates for ALL 9 Solar System bodies simultaneously.
 */
export function getAllCelestialPositions(
  location: GeodeticLocation,
  date: Date = new Date()
): Record<CelestialBodyId, CelestialCoordinates> {
  const results = {} as Record<CelestialBodyId, CelestialCoordinates>;
  for (const info of CELESTIAL_BODY_LIST) {
    results[info.id] = getClientCelestialPosition(info.id, location, date);
  }
  return results;
}

/**
 * Calculates 24-hour diurnal trajectory waypoints for any celestial body.
 */
export function getClientCelestialDiurnalPath(
  bodyId: CelestialBodyId,
  location: GeodeticLocation,
  date: Date = new Date(),
  stepMinutes: number = 15
): DiurnalWaypoint[] {
  const waypoints: DiurnalWaypoint[] = [];
  const startOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));
  const totalSteps = Math.floor((24 * 60) / stepMinutes);

  for (let i = 0; i <= totalSteps; i++) {
    const sampleDate = new Date(startOfDay.getTime() + i * stepMinutes * 60 * 1000);
    const pos = getClientCelestialPosition(bodyId, location, sampleDate);
    const enu = azAltToEnuVector(pos.azimuthDeg, pos.altitudeDeg);

    waypoints.push({
      timeUtc: sampleDate.toISOString(),
      azimuthDeg: pos.azimuthDeg,
      altitudeDeg: pos.altitudeDeg,
      vectorEnu: [enu.x, enu.y, enu.z],
      isVisible: pos.isAboveHorizon,
    });
  }

  return waypoints;
}

/**
 * Calculates Rise, Culmination (Transit), and Set for any celestial body.
 */
export function getClientCelestialEvents(
  bodyId: CelestialBodyId,
  location: GeodeticLocation,
  date: Date = new Date()
): CelestialEvents {
  const observer = new Astronomy.Observer(location.latitude, location.longitude, location.elevationM);
  const body = Astronomy.Body[bodyId];
  const startOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));

  let riseUtc: string | null = null;
  let setUtc: string | null = null;
  let culminationUtc: string | null = null;

  try {
    const rise = Astronomy.SearchRiseSet(body, observer, +1, startOfDay, 1);
    if (rise) riseUtc = rise.date.toISOString();
  } catch {
    // Polar or circular conditions
  }

  try {
    const set = Astronomy.SearchRiseSet(body, observer, -1, startOfDay, 1);
    if (set) setUtc = set.date.toISOString();
  } catch {
    // Polar or circumpolar
  }

  try {
    const culm = Astronomy.SearchHourAngle(body, observer, 0, startOfDay);
    if (culm) culminationUtc = culm.time.date.toISOString();
  } catch {
    // Culmination calculation fallback
  }

  return { riseUtc, culminationUtc, setUtc };
}

// ==========================================
// Backward-Compatibility Helpers for Solar Logic
// ==========================================

export function getClientSolarPosition(
  location: GeodeticLocation,
  date: Date = new Date()
): SolarCoordinates {
  return getClientCelestialPosition('Sun', location, date);
}

export function getClientSolarEvents(
  location: GeodeticLocation,
  date: Date = new Date()
): SolarEvents {
  const ev = getClientCelestialEvents('Sun', location, date);
  return {
    sunriseUtc: ev.riseUtc,
    solarNoonUtc: ev.culminationUtc,
    sunsetUtc: ev.setUtc,
  };
}

export function getClientDiurnalPath(
  location: GeodeticLocation,
  date: Date = new Date(),
  stepMinutes: number = 15
): DiurnalWaypoint[] {
  return getClientCelestialDiurnalPath('Sun', location, date, stepMinutes);
}
