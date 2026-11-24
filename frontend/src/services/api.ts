/**
 * API client communicating with the Python FastAPI backend.
 */

import { SolarCoordinates, DiurnalWaypoint, SolarEvents, VisionProcessResult } from '../types/astronomy';

const rawBase = import.meta.env.VITE_API_BASE_URL || '';
const PRIMARY = rawBase ? `${rawBase.replace(/\/$/, '')}/api` : '/api';
const FALLBACKS = ['http://127.0.0.1:8000/api', 'http://localhost:8000/api'];

function candidateBases(): string[] {
  const out = [PRIMARY];
  for (const f of FALLBACKS) {
    if (!out.includes(f)) out.push(f);
  }
  return out;
}

function fetchWithTimeout(url: string, init: RequestInit | undefined, ms: number): Promise<Response> {
  const ctrl = new AbortController();
  const timer = window.setTimeout(() => ctrl.abort(), ms);
  return fetch(url, { ...init, signal: ctrl.signal }).finally(() => window.clearTimeout(timer));
}

async function apiFetch(path: string, init?: RequestInit): Promise<Response> {
  const bases = candidateBases();
  let lastError: Error = new Error(
    'Backend offline. From the backend folder run: py -3 -m uvicorn app.main:app --port 8000'
  );

  for (const base of bases) {
    try {
      const res = await fetchWithTimeout(`${base}${path}`, init, 4000);
      if (res.ok) return res;
      const payload = await res.json().catch(() => ({}));
      const detail = (payload as { detail?: string }).detail;
      lastError = new Error(
        typeof detail === 'string' && detail ? detail : `Backend request failed (${res.status})`
      );
      if (res.status >= 400 && res.status < 500 && res.status !== 404) {
        throw lastError;
      }
    } catch (err) {
      const name = err instanceof Error ? err.name : '';
      const msg = err instanceof Error ? err.message : '';
      if (name === 'AbortError') {
        lastError = new Error(
          'Backend offline. From the backend folder run: py -3 -m uvicorn app.main:app --port 8000'
        );
        continue;
      }
      if (err instanceof Error && !/Failed to fetch|NetworkError|Load failed/i.test(msg)) {
        lastError = err;
        if (!/offline/i.test(msg)) throw err;
      }
    }
  }
  throw lastError;
}

export async function fetchServerHealth(): Promise<{
  status: string;
  version: string;
  ephemeris_engine: string;
  timestamp_utc: string;
}> {
  const res = await apiFetch('/health');
  return res.json();
}

export async function fetchServerSolarPosition(
  lat: number,
  lon: number,
  elevationM: number = 0,
  timestamp?: string,
  body: string = 'sun'
): Promise<SolarCoordinates> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    elevation_m: elevationM.toString(),
    body: body.toLowerCase(),
  });
  if (timestamp) params.append('timestamp', timestamp);

  const res = await apiFetch(`/solar/position?${params.toString()}`);
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
  stepMinutes: number = 15,
  elevationM: number = 0
): Promise<{ waypoints: DiurnalWaypoint[]; events: SolarEvents }> {
  const params = new URLSearchParams({
    latitude: lat.toString(),
    longitude: lon.toString(),
    elevation_m: elevationM.toString(),
    date: dateStr,
    step_minutes: stepMinutes.toString(),
  });

  const res = await apiFetch(`/solar/path?${params.toString()}`);
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

  const res = await apiFetch(`/vision/process?threshold=${threshold}`, {
    method: 'POST',
    body: formData,
  });

  return res.json();
}
