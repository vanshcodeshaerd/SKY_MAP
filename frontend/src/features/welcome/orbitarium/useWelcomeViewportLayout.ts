import { useEffect, useState } from 'react';

export type WelcomeViewportLayout = {
  shiftX: number;
  camY: number;
  camZ: number;
  fov: number;
  minDist: number;
  maxDist: number;
  navLeftPercent: number;
  tier: 'phone' | 'tablet' | 'desktop';
};

function compute(width: number, height: number): WelcomeViewportLayout {
  const short = height < 640;
  const narrow = width < 640;
  const tablet = width >= 640 && width < 1024;

  if (narrow) {
    return {
      shiftX: 0,
      camY: short ? 70 : 76,
      camZ: short ? 112 : 120,
      fov: 54,
      minDist: 10,
      maxDist: 200,
      navLeftPercent: 46,
      tier: 'phone',
    };
  }

  if (tablet) {
    return {
      shiftX: 0,
      camY: 68,
      camZ: 110,
      fov: 50,
      minDist: 8,
      maxDist: 200,
      navLeftPercent: 42,
      tier: 'tablet',
    };
  }

  return {
    shiftX: 0,
    camY: 62,
    camZ: 104,
    fov: 48,
    minDist: 7,
    maxDist: 180,
    navLeftPercent: 40,
    tier: 'desktop',
  };
}

export function useWelcomeViewportLayout(): WelcomeViewportLayout {
  const [layout, setLayout] = useState<WelcomeViewportLayout>(() =>
    typeof window !== 'undefined' ? compute(window.innerWidth, window.innerHeight) : compute(1280, 800)
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
