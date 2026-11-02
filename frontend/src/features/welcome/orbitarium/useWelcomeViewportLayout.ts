import { useEffect, useState } from 'react';

export type WelcomeViewportLayout = {
  shiftX: number;
  camY: number;
  camZ: number;
  fov: number;
  minDist: number;
  maxDist: number;
  /** Where planet picker starts (CSS left %). */
  navLeftPercent: number;
  /** Rough breakpoint label for layout tweaks. */
  tier: 'phone' | 'tablet' | 'desktop';
};

function compute(width: number, height: number): WelcomeViewportLayout {
  const short = height < 640;
  const narrow = width < 640;
  const tablet = width >= 640 && width < 1024;

  if (narrow) {
    return {
      shiftX: 0,
      camY: short ? 36 : 32,
      camZ: short ? 68 : 62,
      fov: width / Math.max(height, 1) < 0.55 ? 54 : 50,
      minDist: 10,
      maxDist: 100,
      navLeftPercent: 0,
      tier: 'phone',
    };
  }

  if (tablet) {
    return {
      shiftX: 10,
      camY: 28,
      camZ: 54,
      fov: 46,
      minDist: 8,
      maxDist: 88,
      navLeftPercent: 38,
      tier: 'tablet',
    };
  }

  return {
    shiftX: 22,
    camY: 26,
    camZ: 48,
    fov: 42,
    minDist: 7,
    maxDist: 82,
    navLeftPercent: 40,
    tier: 'desktop',
  };
}

export function useWelcomeViewportLayout(): WelcomeViewportLayout {
  const [layout, setLayout] = useState<WelcomeViewportLayout>(() =>
    typeof window !== 'undefined'
      ? compute(window.innerWidth, window.innerHeight)
      : compute(1280, 800)
  );

  useEffect(() => {
    const update = () => setLayout(compute(window.innerWidth, window.innerHeight));
    update();
    window.addEventListener('resize', update);
    window.addEventListener('orientationchange', update);
    return () => {
      window.removeEventListener('resize', update);
      window.removeEventListener('orientationchange', update);
    };
  }, []);

  return layout;
}
