import { useState, useEffect, useCallback, useRef } from 'react';
import { DeviceOrientationState } from '../types/astronomy';

export interface EnuOrientationState extends DeviceOrientationState {
  compassHeading: number | null; // 0 to 360 clockwise from North
  cameraPitch: number | null;    // -90 to +90 (0 = horizon, +90 = zenith, -90 = nadir)
  cameraRoll: number | null;     // sideways tilt in degrees
}

export function useDeviceOrientation() {
  const [orientation, setOrientation] = useState<EnuOrientationState>({
    alpha: null,
    beta: null,
    gamma: null,
    compassHeading: null,
    cameraPitch: null,
    cameraRoll: null,
    absolute: false,
    compassAccuracy: undefined,
    isSupported: typeof window !== 'undefined' && 'DeviceOrientationEvent' in window,
    permissionGranted: false,
  });

  const [needsPermission, setNeedsPermission] = useState<boolean>(false);
  const usingAbsoluteRef = useRef<boolean>(false);

  useEffect(() => {
    // Check if iOS 13+ permission is required
    if (
      typeof window !== 'undefined' &&
      typeof (window as any).DeviceOrientationEvent !== 'undefined' &&
      typeof (window as any).DeviceOrientationEvent.requestPermission === 'function'
    ) {
      setNeedsPermission(true);
    } else {
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

    const processOrientation = (event: DeviceOrientationEvent, isAbsoluteEvent: boolean) => {
      const webkitHeading = (event as any).webkitCompassHeading;
      const webkitAccuracy = (event as any).webkitCompassAccuracy;

      let heading: number | null = null;

      if (typeof webkitHeading === 'number' && !isNaN(webkitHeading)) {
        // iOS Safari provides direct True/Magnetic North compass heading (0 = N, 90 = E, 180 = S, 270 = W)
        heading = (webkitHeading + 360) % 360;
      } else if (event.alpha !== null) {
        // W3C DeviceOrientation: alpha increases counter-clockwise (0 = N, 90 = W, 180 = S, 270 = E)
        // Convert to clockwise Compass Azimuth: (360 - alpha)
        heading = (360 - event.alpha + 360) % 360;
      }

      // Elevation Pitch: In portrait mode, beta is 90° when vertical facing horizon.
      // Tilting up to the sky: beta decreases to 0° (Zenith = +90°).
      // Tilting down to ground: beta increases to 180° (Nadir = -90°).
      let pitch: number | null = null;
      let roll: number | null = null;

      if (event.beta !== null) {
        pitch = Math.max(-90, Math.min(90, 90 - event.beta));
      }

      if (event.gamma !== null) {
        roll = event.gamma;
      }

      setOrientation((prev) => ({
        ...prev,
        alpha: event.alpha !== null ? Number(event.alpha.toFixed(2)) : null,
        beta: event.beta !== null ? Number(event.beta.toFixed(2)) : null,
        gamma: event.gamma !== null ? Number(event.gamma.toFixed(2)) : null,
        compassHeading: heading !== null ? Number(heading.toFixed(2)) : null,
        cameraPitch: pitch !== null ? Number(pitch.toFixed(2)) : null,
        cameraRoll: roll !== null ? Number(roll.toFixed(2)) : null,
        absolute: isAbsoluteEvent || event.absolute || typeof webkitHeading === 'number',
        compassAccuracy: webkitAccuracy,
      }));
    };

    // Handler for Android deviceorientationabsolute (magnetometer-backed)
    const handleAbsoluteOrientation = (event: DeviceOrientationEvent) => {
      usingAbsoluteRef.current = true;
      processOrientation(event, true);
    };

    // Standard fallback handler
    const handleStandardOrientation = (event: DeviceOrientationEvent) => {
      if (usingAbsoluteRef.current) return; // Prioritize absolute if active
      processOrientation(event, false);
    };

    if ('ondeviceorientationabsolute' in window) {
      window.addEventListener('deviceorientationabsolute', handleAbsoluteOrientation as any, true);
    }
    window.addEventListener('deviceorientation', handleStandardOrientation, true);

    return () => {
      if ('ondeviceorientationabsolute' in window) {
        window.removeEventListener('deviceorientationabsolute', handleAbsoluteOrientation as any, true);
      }
      window.removeEventListener('deviceorientation', handleStandardOrientation, true);
    };
  }, [orientation.permissionGranted, needsPermission]);

  return {
    orientation,
    needsPermission,
    requestPermission,
  };
}
