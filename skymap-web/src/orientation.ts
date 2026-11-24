export interface OrientationData {
  h: number; // heading (alpha)
  b: number; // pitch (beta)
  g: number; // roll (gamma)
}

function angleDiff(a: number, b: number) {
  let diff = a - b;
  while (diff < -180) diff += 360;
  while (diff > 180) diff -= 360;
  return diff;
}

let smoothed: OrientationData = { h: 0, b: 0, g: 0 };
let hasInitialized = false;

function lowPass(next: OrientationData, a = 0.18) {
  if (!hasInitialized) {
    smoothed = { ...next };
    hasInitialized = true;
    return;
  }
  smoothed.h += a * angleDiff(next.h, smoothed.h); 
  // Keep h in [0, 360)
  smoothed.h = ((smoothed.h % 360) + 360) % 360;
  
  smoothed.b += a * (next.b - smoothed.b);
  smoothed.g += a * (next.g - smoothed.g);
}

export function getSmoothedOrientation(): OrientationData {
  return smoothed;
}

export async function startOrientation(onUpdate: (h: number, b: number, g: number) => void) {
  // iOS 13+ requires a permission request fired from a user gesture (a click)
  const AnyDOE = DeviceOrientationEvent as any;
  if (typeof AnyDOE.requestPermission === "function") {
    const result = await AnyDOE.requestPermission();
    if (result !== "granted") throw new Error("Orientation permission denied");
  }

  const handler = (e: DeviceOrientationEvent) => {
    const iosHeading = (e as any).webkitCompassHeading; // iOS Safari only
    const heading = iosHeading != null 
      ? iosHeading                 // already true-north-referenced on iOS
      : 360 - (e.alpha ?? 0);      // Android: alpha is magnetic north, counter-clockwise
      
    const current = {
        h: heading,
        b: e.beta ?? 0,
        g: e.gamma ?? 0
    };
    
    lowPass(current);
    onUpdate(smoothed.h, smoothed.b, smoothed.g);
  };

  if ("ondeviceorientationabsolute" in window) {
    (window as any).addEventListener("deviceorientationabsolute", handler);
  } else {
    (window as any).addEventListener("deviceorientation", handler);
  }
}
