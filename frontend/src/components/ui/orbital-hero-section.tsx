import * as React from 'react';
import { useEffect, useRef } from 'react';
import {
  attachOrbitalHeroCanvas,
  type OrbitalHeroSectionProps as EngineProps,
  type Planet,
  SOLAR_SYSTEM,
  INNER_PLANETS,
} from './orbital-hero-section.engine';

export type { Planet };
export { SOLAR_SYSTEM, INNER_PLANETS };

export interface OrbitalHeroSectionProps extends Omit<EngineProps, 'scrim'> {
  /** Seconds-per-year feel: lower = faster orbits (maps to engine speed). */
  yearSeconds?: number;
  /** AU half-width of view (maps to orbitScale on resize). */
  viewRadius?: number;
  /** Edge scrim for hero copy (demo API). */
  scrim?: boolean | 'none' | 'left' | 'right' | 'top' | 'bottom';
  scrimStrength?: number;
  /** Sun position in frame — reserved for future camera bias. */
  focus?: [number, number];
  onPlanetSelect?: (name: string) => void;
  children?: React.ReactNode;
}

export function OrbitalHeroSection({
  planets,
  innerOnly,
  paused,
  yearSeconds = 16,
  viewRadius = 3.1,
  scrim = 'left',
  scrimStrength = 0.88,
  focus: _focus,
  onPlanetSelect,
  className = '',
  children,
  starCount = 1200,
  tilt = 58,
  sunColor = '#FFF2CC',
  ...rest
}: OrbitalHeroSectionProps) {
  const hostRef = useRef<HTMLDivElement | null>(null);
  const canvasRef = useRef<HTMLCanvasElement | null>(null);

  const propsRef = useRef<EngineProps & { scrimEdge?: EngineProps['scrimEdge'] }>({
    planets,
    innerOnly,
    paused,
    starCount,
    tilt,
    sunColor,
    scrim: scrim !== 'none' && scrim !== false,
    scrimEdge: scrim === false || scrim === 'none' || scrim === true ? 'left' : scrim,
    scrimStrength,
    speed: 86400 / Math.max(0.5, yearSeconds),
    orbitScale: 90,
  });

  propsRef.current = {
    planets,
    innerOnly,
    paused,
    starCount,
    tilt,
    sunColor,
    scrim: scrim !== 'none' && scrim !== false,
    scrimEdge: scrim === false || scrim === 'none' || scrim === true ? 'left' : scrim,
    scrimStrength,
    speed: 86400 / Math.max(0.5, yearSeconds),
    orbitScale: propsRef.current.orbitScale,
  };

  useEffect(() => {
    const host = hostRef.current;
    const canvas = canvasRef.current;
    if (!host || !canvas) return;

    const updateScale = () => {
      const rect = host.getBoundingClientRect();
      const min = Math.min(rect.width, rect.height);
      propsRef.current.orbitScale = (min * 0.48) / Math.max(0.8, viewRadius);
    };
    updateScale();
    const ro = new ResizeObserver(updateScale);
    ro.observe(host);

    const cleanup = attachOrbitalHeroCanvas(host, canvas, propsRef, onPlanetSelect);

    return () => {
      ro.disconnect();
      cleanup();
    };
  }, [onPlanetSelect, viewRadius]);

  return (
    <div
      ref={hostRef}
      className={`relative isolate h-full w-full overflow-hidden bg-black touch-pan-y ${className}`}
      {...rest}
    >
      <canvas ref={canvasRef} aria-hidden className="absolute inset-0 h-full w-full" />
      {children ? <div className="relative z-10 h-full w-full pointer-events-none">{children}</div> : null}
    </div>
  );
}

export default OrbitalHeroSection;
