import { useState, useEffect, useCallback } from 'react';
import { DeviceOrientationState } from '../types/astronomy';

export function useDeviceOrientation() {
  const [orientation, setOrientation] = useState<DeviceOrientationState>({
    alpha: null,
    beta: null,
    gamma: null,
    absolute: false,
    compassAccuracy: undefined,
    isSupported: typeof window !== 'undefined' && 'DeviceOrientationEvent' in window,
    permissionGranted: false,
  });

  const [needsPermission, setNeedsPermission] = useState<boolean>(false);

  useEffect(() => {
    // Check if iOS 13+ permission is required
    if (
      typeof window !== 'undefined' &&
      typeof (window as any).DeviceOrientationEvent !== 'undefined' &&
      typeof (window as any).DeviceOrientationEvent.requestPermission === 'function'
    ) {
      setNeedsPermission(true);
    } else {
      // Modern Android and Desktop grant access automatically in secure contexts
      setNeedsPermission(false);
      setOrientation((prev) => ({ ...prev, permissionGranted: true }));
    }
  }, []);

  const requestPermission = useCallback(async (): Promise<boolean> => {
    if (
      typeof window !== 'undefined' &&
      typeof (window as any).DeviceOrientationEvent !== 'undefined' &&
      typeof (window as any).DeviceOrientationEvent.requestPermission === 'function'
    ) {
      try {
        const state = await (window as any).DeviceOrientationEvent.requestPermission();
        if (state === 'granted') {
          setOrientation((prev) => ({ ...prev, permissionGranted: true }));
          setNeedsPermission(false);
          return true;
        }
      } catch (err) {
        console.warn('Orientation permission denied:', err);
      }
      return false;
    }
    return true;
  }, []);

  useEffect(() => {
    if (!orientation.permissionGranted && needsPermission) return;

    const handleOrientation = (event: DeviceOrientationEvent) => {
      // webkitCompassHeading for iOS provides absolute True North heading
      const webkitHeading = (event as any).webkitCompassHeading;
      const webkitAccuracy = (event as any).webkitCompassAccuracy;

      const alpha = typeof webkitHeading === 'number'
        ? webkitHeading
        : (event.alpha !== null ? event.alpha : null);

      setOrientation((prev) => ({
        ...prev,
        alpha: alpha !== null ? Number(alpha.toFixed(2)) : null,
        beta: event.beta !== null ? Number(event.beta.toFixed(2)) : null,
        gamma: event.gamma !== null ? Number(event.gamma.toFixed(2)) : null,
        absolute: event.absolute || typeof webkitHeading === 'number',
        compassAccuracy: webkitAccuracy,
      }));
    };

    window.addEventListener('deviceorientation', handleOrientation, true);
    return () => {
      window.removeEventListener('deviceorientation', handleOrientation, true);
    };
  }, [orientation.permissionGranted, needsPermission]);

  return {
    orientation,
    needsPermission,
    requestPermission,
  };
}
