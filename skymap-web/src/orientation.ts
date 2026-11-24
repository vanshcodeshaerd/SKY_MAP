import {
  attitudeFromEvent,
  getSmoothedAttitude,
  pushAttitudeSample,
  resetAttitudeFilter,
} from './ar/deviceAttitude.ts';

export interface OrientationData {
  h: number; // clockwise compass heading [0, 360)
  b: number; // pitch (beta)
  g: number; // roll (gamma)
}

export interface SensorCapabilities {
  supported: boolean;
  absolute: boolean;
  iosTrueNorth: boolean;
  permissionGranted: boolean;
  lastEventTimestamp: number;
}

const capabilities: SensorCapabilities = {
  supported: typeof window !== 'undefined' && 'DeviceOrientationEvent' in window,
  absolute: false,
  iosTrueNorth: false,
  permissionGranted: false,
  lastEventTimestamp: 0,
};

export function getSensorCapabilities(): Readonly<SensorCapabilities> {
  return capabilities;
}

export function getScreenOrientationAngle(): number {
  if (typeof window === 'undefined') return 0;
  if (window.screen?.orientation && typeof window.screen.orientation.angle === 'number') {
    return window.screen.orientation.angle;
  }
  const legacy = (window as unknown as { orientation?: number }).orientation;
  return typeof legacy === 'number' ? legacy : 0;
}

export function getSmoothedOrientation(): OrientationData {
  const att = getSmoothedAttitude();
  return { h: att.heading, b: 90 + att.pitch, g: att.roll };
}

export { getSmoothedAttitude, getLatestAttitude } from './ar/deviceAttitude.ts';

export function resetOrientationFilter() {
  resetAttitudeFilter();
}

export async function startOrientation(onUpdate: (h: number, b: number, g: number) => void) {
  const AnyDOE = DeviceOrientationEvent as unknown as {
    requestPermission?: () => Promise<'granted' | 'denied'>;
  };
  if (typeof AnyDOE?.requestPermission === 'function') {
    const result = await AnyDOE.requestPermission();
    if (result !== 'granted') {
      capabilities.permissionGranted = false;
      throw new Error('Orientation permission denied');
    }
  }
  capabilities.permissionGranted = true;

  const handler = (e: DeviceOrientationEvent) => {
    if (e.alpha == null && e.beta == null && e.gamma == null) return;
    const iosHeading = (e as unknown as { webkitCompassHeading?: number }).webkitCompassHeading;
    if (iosHeading != null) {
      capabilities.iosTrueNorth = true;
      capabilities.absolute = true;
    } else if (e.absolute) {
      capabilities.absolute = true;
    }

    capabilities.lastEventTimestamp = Date.now();
    const att = attitudeFromEvent(e);
    pushAttitudeSample(att);
    const sm = getSmoothedAttitude();
    onUpdate(sm.heading, 90 + sm.pitch, sm.roll);
  };

  if ('ondeviceorientationabsolute' in window) {
    (window as Window).addEventListener('deviceorientationabsolute' as keyof WindowEventMap, handler as EventListener);
  } else {
    (window as Window).addEventListener('deviceorientation', handler);
  }
}
