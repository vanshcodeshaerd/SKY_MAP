export interface LocationData {
  lat: number;
  lon: number;
  accuracy?: number;
  source?: 'gps' | 'ip' | 'default';
}

/** Los Angeles area default when GPS/IP unavailable (common California test location). */
export const DEFAULT_CA_LOCATION: LocationData = {
  lat: 34.0522,
  lon: -118.2437,
  source: 'default',
};

/** Resolve approximate location from IP (no API key; ipapi.co free tier). */
export async function fetchIpLocation(): Promise<LocationData | null> {
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 5000);
    const res = await fetch('https://ipapi.co/json/', { signal: ctrl.signal });
    clearTimeout(t);
    if (!res.ok) return null;
    const data = (await res.json()) as { latitude?: number; longitude?: number; city?: string };
    if (typeof data.latitude !== 'number' || typeof data.longitude !== 'number') return null;
    return {
      lat: data.latitude,
      lon: data.longitude,
      source: 'ip',
    };
  } catch {
    return null;
  }
}

export function watchLocation(
  onUpdate: (loc: LocationData) => void,
  onError: (err: GeolocationPositionError) => void
): number {
  if (!navigator.geolocation) {
    throw new Error('Geolocation is not supported by your browser.');
  }

  return navigator.geolocation.watchPosition(
    (pos) => {
      onUpdate({
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        accuracy: pos.coords.accuracy,
        source: 'gps',
      });
    },
    (err) => {
      onError(err);
    },
    {
      enableHighAccuracy: true,
      maximumAge: 2000,
      timeout: 15000,
    }
  );
}

export function stopWatchLocation(watchId: number) {
  navigator.geolocation.clearWatch(watchId);
}