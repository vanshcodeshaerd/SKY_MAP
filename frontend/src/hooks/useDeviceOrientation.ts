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

    // Process orientation events using exact W3C Earth frame matrix projection
    const processOrientation = (event: DeviceOrientationEvent, isAbsoluteEvent: boolean) => {
      const alpha = event.alpha !== null ? event.alpha : 0;
      const beta = event.beta !== null ? event.beta : 90;
      const gamma = event.gamma !== null ? event.gamma : 0;

      const webkitHeading = (event as any).webkitCompassHeading;
      const webkitAccuracy = (event as any).webkitCompassAccuracy;

      const deg2rad = Math.PI / 180;
      const a = alpha * deg2rad;
      const b = beta * deg2rad;
      const g = gamma * deg2rad;

      const cA = Math.cos(a), sA = Math.sin(a);
      const cB = Math.cos(b), sB = Math.sin(b);
      const cG = Math.cos(g), sG = Math.sin(g);

      // Camera optical axis (out the back of the device: -z_device) in Earth coordinates (ENU):
      const Fx = -(cA * sG + sA * sB * cG); // East component
      const Fy = -(sA * sG - cA * sB * cG); // North component
      // Up (Zenith) component: +1 when pointed at Zenith (b=180), 0 at horizon (b=90), -1 at nadir (b=0)
      const Fz = -(cB * cG);

      // Compute Elevation Pitch: +90° = Zenith, 0° = Horizon, -90° = Nadir
      const pitchDeg = (Math.asin(Math.max(-1, Math.min(1, Fz))) * 180) / Math.PI;

      // Compute Compass Heading: 0° = North, 90° = East, 180° = South, 270° = West
      let headingDeg: number;

      if (typeof webkitHeading === 'number' && !isNaN(webkitHeading) && webkitHeading >= 0) {
        // iOS Safari provides direct True/Magnetic North heading (0 = N, 90 = E, 180 = S, 270 = W)
        headingDeg = (webkitHeading + 360) % 360;
      } else {
        // Derived from W3C vector projection
        const rawHeading = (Math.atan2(Fx, Fy) * 180) / Math.PI;
        headingDeg = (rawHeading + 360) % 360;
      }

      // Account for screen rotation (portrait = 0, landscape-left = 90, landscape-right = 270)
      let screenAngle = 0;
      if (typeof window !== 'undefined') {
        if (window.screen && window.screen.orientation && typeof window.screen.orientation.angle === 'number') {
          screenAngle = window.screen.orientation.angle;
        } else if (typeof (window as any).orientation === 'number') {
          screenAngle = (window as any).orientation;
        }
      }

      const effectiveCompassHeading = (headingDeg + screenAngle + 360) % 360;

      setOrientation((prev) => ({
        ...prev,
        alpha: event.alpha !== null ? Number(event.alpha.toFixed(2)) : null,
        beta: event.beta !== null ? Number(event.beta.toFixed(2)) : null,
        gamma: event.gamma !== null ? Number(event.gamma.toFixed(2)) : null,
        compassHeading: Number(effectiveCompassHeading.toFixed(2)),
        cameraPitch: Number(pitchDeg.toFixed(2)),
        cameraRoll: Number(gamma.toFixed(2)),
        absolute: isAbsoluteEvent || event.absolute || typeof webkitHeading === 'number',
        compassAccuracy: webkitAccuracy,
      }));
    };

    const handleAbsoluteOrientation = (event: DeviceOrientationEvent) => {
      usingAbsoluteRef.current = true;
      processOrientation(event, true);
    };

    const handleStandardOrientation = (event: DeviceOrientationEvent) => {
      if (usingAbsoluteRef.current) return;
      processOrientation(event, false);
    };

    if (typeof window !== 'undefined') {
      if ('ondeviceorientationabsolute' in window) {
        window.addEventListener('deviceorientationabsolute', handleAbsoluteOrientation as any, true);
      }
      window.addEventListener('deviceorientation', handleStandardOrientation, true);
    }

    return () => {
      if (typeof window !== 'undefined') {
        if ('ondeviceorientationabsolute' in window) {
          window.removeEventListener('deviceorientationabsolute', handleAbsoluteOrientation as any, true);
        }
        window.removeEventListener('deviceorientation', handleStandardOrientation, true);
      }
    };
  }, [orientation.permissionGranted, needsPermission]);

  return {
    orientation,
    needsPermission,
    requestPermission,
  };
}
