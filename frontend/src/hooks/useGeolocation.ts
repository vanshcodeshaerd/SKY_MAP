import { useState, useEffect, useCallback } from 'react';
import { GeodeticLocation } from '../types/astronomy';

// Default fallback coordinates (New Delhi, India)
const DEFAULT_LOCATION: GeodeticLocation = {
  latitude: 28.6139,
  longitude: 77.2090,
  elevationM: 216.0,
};

export function useGeolocation() {
  const [location, setLocation] = useState<GeodeticLocation>(() => {
    const saved = localStorage.getItem('skygazer_location');
    return saved ? JSON.parse(saved) : DEFAULT_LOCATION;
  });
  const [loading, setLoading] = useState<boolean>(false);
  const [error, setError] = useState<string | null>(null);
  const [isLiveGps, setIsLiveGps] = useState<boolean>(false);

  const requestGpsLocation = useCallback(() => {
    if (!navigator.geolocation) {
      setError('Geolocation API is not supported by your browser');
      return;
    }

    setLoading(true);
    setError(null);

    navigator.geolocation.getCurrentPosition(
      (position) => {
        const newLoc: GeodeticLocation = {
          latitude: Number(position.coords.latitude.toFixed(5)),
          longitude: Number(position.coords.longitude.toFixed(5)),
          elevationM: Number((position.coords.altitude || 0).toFixed(1)),
        };
        setLocation(newLoc);
        setIsLiveGps(true);
        localStorage.setItem('skygazer_location', JSON.stringify(newLoc));
        setLoading(false);
      },
      (err) => {
        setError(`GPS Error: ${err.message}`);
        setLoading(false);
      },
      {
        enableHighAccuracy: true,
        timeout: 10000,
        maximumAge: 30000,
      }
    );
  }, []);

  useEffect(() => {
    // Automatically query GPS with high accuracy whenever geolocation is available
    if (navigator.geolocation) {
      requestGpsLocation();
    }
  }, [requestGpsLocation]);

  const setManualLocation = useCallback((newLoc: GeodeticLocation) => {
    setLocation(newLoc);
    setIsLiveGps(false);
    localStorage.setItem('skygazer_location', JSON.stringify(newLoc));
  }, []);

  return {
    location,
    loading,
    error,
    isLiveGps,
    requestGpsLocation,
    setManualLocation,
  };
}
