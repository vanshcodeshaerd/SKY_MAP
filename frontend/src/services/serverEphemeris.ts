/**
 * Optional DE421 batch positions from FastAPI when the backend is online.
 */

import * as THREE from 'three';
import { GeodeticLocation, CelestialBodyId, CELESTIAL_BODY_LIST } from '../types/astronomy';
import { apiFetch } from './apiCore';
import { azAltToEnuVector } from './coordinateTransforms';
import { getAllCelestialPositions } from './astronomyEngine';

const BODY_API_TO_ID: Record<string, CelestialBodyId> = {
  sun: 'Sun',
  moon: 'Moon',
  mercury: 'Mercury',
  venus: 'Venus',
  mars: 'Mars',
  jupiter: 'Jupiter',
  saturn: 'Saturn',
  uranus: 'Uranus',
  neptune: 'Neptune',
};

type CacheKey = string;

let lastKey: CacheKey | null = null;
let lastVectors: Record<CelestialBodyId, THREE.Vector3> | null = null;
let lastSource: 'de421' | 'client' = 'client';
let lastFetchMs = 0;

function cacheKey(location: GeodeticLocation, date: Date): CacheKey {
  const minute = Math.floor(date.getTime() / 60000);
  return `${location.latitude.toFixed(4)},${location.longitude.toFixed(4)},${minute}`;
}

export function getLastEphemerisSource(): 'de421' | 'client' {
  return lastSource;
}

export async function getBodyEnuVectorsHybrid(
  location: GeodeticLocation,
  date: Date,
  serverReachable: boolean
): Promise<Record<CelestialBodyId, THREE.Vector3>> {
  const key = cacheKey(location, date);
  const now = Date.now();
  if (lastKey === key && lastVectors && now - lastFetchMs < 900) {
    return lastVectors;
  }

  if (serverReachable) {
    try {
      const params = new URLSearchParams({
        latitude: location.latitude.toString(),
        longitude: location.longitude.toString(),
        elevation_m: (location.elevationM ?? 0).toString(),
        timestamp: date.toISOString(),
      });
      const res = await apiFetch(`/solar/positions/batch?${params}`);
      const data = await res.json();
      const vectors = {} as Record<CelestialBodyId, THREE.Vector3>;
      for (const [apiBody, item] of Object.entries(data.positions as Record<string, { azimuth_degrees: number; altitude_degrees: number; vector_enu?: number[] }>)) {
        const id = BODY_API_TO_ID[apiBody];
        if (!id) continue;
        const enuArr = item.vector_enu;
        vectors[id] =
          enuArr && enuArr.length === 3
            ? new THREE.Vector3(enuArr[0], enuArr[1], enuArr[2]).normalize()
            : azAltToEnuVector(item.azimuth_degrees, item.altitude_degrees);
      }
      if (Object.keys(vectors).length >= 8) {
        lastKey = key;
        lastVectors = vectors;
        lastSource = 'de421';
        lastFetchMs = now;
        return vectors;
      }
    } catch {
      /* fall through */
    }
  }

  const positions = getAllCelestialPositions(location, date);
  const vectors = {} as Record<CelestialBodyId, THREE.Vector3>;
  for (const info of CELESTIAL_BODY_LIST) {
    const pos = positions[info.id];
    vectors[info.id] = azAltToEnuVector(pos.azimuthDeg, pos.altitudeDeg);
  }
  lastKey = key;
  lastVectors = vectors;
  lastSource = 'client';
  lastFetchMs = now;
  return vectors;
}