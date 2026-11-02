import { useEffect, useState } from 'react';

export type WelcomeViewportLayout = {
  camY: number;
  camZ: number;
  fov: number;
  minDist: number;
  maxDist: number;
  /** Left copy column width — matches original desktop split. */
  copyWidthPercent: number;
  /** Camera view offset so the system fills the right pane. */
  viewShiftRatio: number;
  tier: 'phone' | 'tablet' | 'desktop';
};

function compute(width: number, height: number): WelcomeViewportLayout {
  const short = height < 640;
  const narrow = width < 640;
  const tablet = width >= 640 && width < 1024;
  const copyWidthPercent = 48;

  if (narrow) {
    const tallPhone = height / Math.max(width, 1) > 1.35;
    return {
      camY: short ? 34 : tallPhone ? 30 : 32,
      camZ: short ? 66 : tallPhone ? 58 : 62,
      fov: width / Math.max(height, 1) < 0.55 ? 54 : 50,
      minDist: 8,
      maxDist: 96,
      copyWidthPercent,
      viewShiftRatio: 0.17,
      tier: 'phone',
    };
  }

  if (tablet) {
    return {
      camY: 28,
      camZ: 54,
      fov: 46,
      minDist: 8,
      maxDist: 88,
      copyWidthPercent,
      viewShiftRatio: 0.2,
      tier: 'tablet',
    };
  }

  return {
    camY: 26,
    camZ: 48,
    fov: 42,
    minDist: 7,
    maxDist: 82,
    copyWidthPercent,
    viewShiftRatio: 0.22,
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
