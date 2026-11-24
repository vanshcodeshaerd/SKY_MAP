export interface LocationData {
    lat: number;
    lon: number;
    accuracy?: number;
}

export function watchLocation(onUpdate: (loc: LocationData) => void, onError: (err: GeolocationPositionError) => void): number {
  if (!navigator.geolocation) {
    throw new Error("Geolocation is not supported by your browser.");
  }

  return navigator.geolocation.watchPosition(
    (pos) => {
      onUpdate({
        lat: pos.coords.latitude,
        lon: pos.coords.longitude,
        accuracy: pos.coords.accuracy
      });
    },
    (err) => {
      onError(err);
    },
    { 
      enableHighAccuracy: true, 
      maximumAge: 5000, 
      timeout: 10000 
    }
  );
}

export function stopWatchLocation(watchId: number) {
    navigator.geolocation.clearWatch(watchId);
}
