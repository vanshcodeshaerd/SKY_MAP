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

function angleDiff(a: number, b: number) {
  let diff = a - b;
  while (diff < -180) diff += 360;
  while (diff > 180) diff -= 360;
  return diff;
}

let smoothed: OrientationData = { h: 0, b: 90, g: 0 };
let hasInitialized = false;

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

function lowPass(next: OrientationData, a = 0.22) {
  if (!hasInitialized) {
    smoothed = { ...next };
    hasInitialized = true;
    return;
  }
  smoothed.h = (((smoothed.h + a * angleDiff(next.h, smoothed.h)) % 360) + 360) % 360;
  smoothed.b += a * angleDiff(next.b, smoothed.b);
  smoothed.g += a * angleDiff(next.g, smoothed.g);
}

export function getSmoothedOrientation(): OrientationData {
  return smoothed;
}

export function resetOrientationFilter() {
  hasInitialized = false;
  smoothed = { h: 0, b: 90, g: 0 };
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

    const heading =
      iosHeading != null
        ? iosHeading
        : (((360 - (e.alpha ?? 0)) % 360) + 360) % 360;

    capabilities.lastEventTimestamp = Date.now();
    lowPass({
      h: heading,
      b: e.beta ?? 90,
      g: e.gamma ?? 0,
    });
    onUpdate(smoothed.h, smoothed.b, smoothed.g);
  };

  if ('ondeviceorientationabsolute' in window) {
    (window as Window).addEventListener('deviceorientationabsolute' as keyof WindowEventMap, handler as EventListener);
  } else {
    (window as Window).addEventListener('deviceorientation', handler);
  }
}
