/**
 * In-browser ephemeris calculator powered by Astronomy Engine (VSOP87 planetary theory).
 * Provides instantaneous, zero-latency 60 FPS solar coordinates and sunrise/sunset times.
 */

import * as Astronomy from 'astronomy-engine';
import { GeodeticLocation, SolarCoordinates, SolarEvents, DiurnalWaypoint } from '../types/astronomy';
import { azAltToEnuVector } from './coordinateTransforms';

/**
 * Calculates instantaneous topocentric solar position for a given observer and time.
 */
export function getClientSolarPosition(
  location: GeodeticLocation,
  date: Date = new Date()
): SolarCoordinates {
  const observer = new Astronomy.Observer(location.latitude, location.longitude, location.elevationM);

  // Apparent topocentric equatorial coordinates
  const equator = Astronomy.Equator(Astronomy.Body.Sun, date, observer, true, true);

  // Topocentric horizontal coordinates (with Bennett refraction)
  const horizonRefracted = Astronomy.Horizon(date, observer, equator.ra, equator.dec, 'normal');

  // Topocentric horizontal coordinates (without refraction)
  const horizonAirless = Astronomy.Horizon(date, observer, equator.ra, equator.dec);

  const refractionDeg = horizonRefracted.altitude - horizonAirless.altitude;

  // Calculate distance in AU
  const distanceAu = equator.dist;

  return {
    azimuthDeg: horizonRefracted.azimuth,
    altitudeDeg: horizonRefracted.altitude,
    geometricAltitudeDeg: horizonAirless.altitude,
    refractionDeg: Math.max(0, refractionDeg),
    distanceAu: distanceAu,
    isAboveHorizon: horizonRefracted.altitude >= 0.0,
    timestampUtc: date.toISOString(),
  };
}

/**
 * Calculates sunrise, sunset, and solar noon for a target calendar day.
 */
export function getClientSolarEvents(
  location: GeodeticLocation,
  date: Date = new Date()
): SolarEvents {
  const observer = new Astronomy.Observer(location.latitude, location.longitude, location.elevationM);

  // Search window: start of the day
  const startOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));

  let sunriseUtc: string | null = null;
  let sunsetUtc: string | null = null;
  let solarNoonUtc: string | null = null;

  try {
    const rise = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, +1, startOfDay, 1);
    if (rise) sunriseUtc = rise.date.toISOString();
  } catch {
    // Midnight sun or polar night
  }

  try {
    const set = Astronomy.SearchRiseSet(Astronomy.Body.Sun, observer, -1, startOfDay, 1);
    if (set) sunsetUtc = set.date.toISOString();
  } catch {
    // Polar conditions
  }

  try {
    const culm = Astronomy.SearchHourAngle(Astronomy.Body.Sun, observer, 0, startOfDay);
    if (culm) solarNoonUtc = culm.time.date.toISOString();
  } catch {
    // Culmination edge cases
  }

  return { sunriseUtc, solarNoonUtc, sunsetUtc };
}

/**
 * Calculates 24-hour diurnal solar trajectory waypoints at specified step intervals.
 */
export function getClientDiurnalPath(
  location: GeodeticLocation,
  date: Date = new Date(),
  stepMinutes: number = 15
): DiurnalWaypoint[] {
  const waypoints: DiurnalWaypoint[] = [];
  const startOfDay = new Date(Date.UTC(date.getUTCFullYear(), date.getUTCMonth(), date.getUTCDate(), 0, 0, 0));
  const totalSteps = Math.floor((24 * 60) / stepMinutes);

  for (let i = 0; i < totalSteps; i++) {
    const sampleDate = new Date(startOfDay.getTime() + i * stepMinutes * 60 * 1000);
    const pos = getClientSolarPosition(location, sampleDate);
    const enu = azAltToEnuVector(pos.azimuthDeg, pos.altitudeDeg);

    waypoints.push({
      timeUtc: pos.timestampUtc,
      azimuthDeg: pos.azimuthDeg,
      altitudeDeg: pos.altitudeDeg,
      vectorEnu: [enu.x, enu.y, enu.z],
      isVisible: pos.isAboveHorizon,
    });
  }

  return waypoints;
}
