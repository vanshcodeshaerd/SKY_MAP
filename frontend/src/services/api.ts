/**
 * API client communicating with the Python FastAPI backend.
 */

import { SolarCoordinates, DiurnalWaypoint, SolarEvents, VisionProcessResult } from '../types/astronomy';

const API_BASE = '/api';

export async function fetchServerHealth(): Promise<{
  status: string;
  version: string;
  ephemeris_engine: string;
  timestamp_utc: string;
}> {
  const res = await fetch(`${API_BASE}/health`);
  if (!res.ok) throw new Error(`Health check failed: ${res.statusText}`);
  return res.json();
}

export async function fetchServerSolarPosition(
  lat: number,
  lon: number,
  elevationM: number = 0,
  timestamp?: string
): Promise<SolarCoordinates> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    elevation_m: elevationM.toString(),
  });
  if (timestamp) params.append('timestamp', timestamp);

  const res = await fetch(`${API_BASE}/solar/position?${params.toString()}`);
  if (!res.ok) throw new Error(`Solar position query failed: ${res.statusText}`);

  const data = await res.json();
  return {
    azimuthDeg: data.azimuth_degrees,
    altitudeDeg: data.altitude_degrees,
    geometricAltitudeDeg: data.altitude_degrees - data.atmospheric_refraction_deg,
    refractionDeg: data.atmospheric_refraction_deg,
    distanceAu: data.distance_au,
    isAboveHorizon: data.is_above_horizon,
    timestampUtc: data.timestamp_utc,
  };
}

export async function fetchServerSolarPath(
  lat: number,
  lon: number,
  dateStr: string,
  stepMinutes: number = 15
): Promise<{ waypoints: DiurnalWaypoint[]; events: SolarEvents }> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    date: dateStr,
    step_minutes: stepMinutes.toString(),
  });

  const res = await fetch(`${API_BASE}/solar/path?${params.toString()}`);
  if (!res.ok) throw new Error(`Solar path query failed: ${res.statusText}`);

  const data = await res.json();
  const waypoints: DiurnalWaypoint[] = data.waypoints.map((w: any) => ({
    timeUtc: w.time_utc,
    azimuthDeg: w.azimuth_degrees,
    altitudeDeg: w.altitude_degrees,
    vectorEnu: w.vector_enu as [number, number, number],
    isVisible: w.is_visible,
  }));

  const events: SolarEvents = {
    sunriseUtc: data.solar_events.sunrise_utc,
    solarNoonUtc: data.solar_events.solar_noon_utc,
    sunsetUtc: data.solar_events.sunset_utc,
  };

  return { waypoints, events };
}

export async function uploadVisionImage(
  file: File,
  threshold: number = 240
): Promise<VisionProcessResult> {
  const formData = new FormData();
  formData.append('file', file);

  const res = await fetch(`${API_BASE}/vision/process?threshold=${threshold}`, {
    method: 'POST',
    body: formData,
  });

  if (!res.ok) {
    const errorData = await res.json().catch(() => ({}));
    throw new Error(errorData.detail || `Vision processing failed: ${res.statusText}`);
  }

  return res.json();
}
