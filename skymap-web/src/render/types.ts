import type { Point2D } from '../projection.ts';

export type RenderMode = 'AR' | 'VR_PLANETARIUM' | 'VR_STEREO' | 'NIGHT_RED';

export type CelestialFilterMode = 'BOTH' | 'PLANETS' | 'CONSTELLATIONS';

export interface VisibilityConfig {
  mode: CelestialFilterMode;
  planets: boolean;
  stars: boolean;
  constellations: boolean;
  constellationLines: boolean;
  constellationLabels: boolean;
  deepSkyObjects: boolean;
}

export function visibilityFromMode(mode: CelestialFilterMode): VisibilityConfig {
  switch (mode) {
    case 'PLANETS':
      return {
        mode: 'PLANETS',
        planets: true,
        stars: false,
        constellations: false,
        constellationLines: false,
        constellationLabels: false,
        deepSkyObjects: false,
      };
    case 'CONSTELLATIONS':
      return {
        mode: 'CONSTELLATIONS',
        planets: false,
        stars: true,
        constellations: true,
        constellationLines: true,
        constellationLabels: true,
        deepSkyObjects: false,
      };
    case 'BOTH':
    default:
      return {
        mode: 'BOTH',
        planets: true,
        stars: true,
        constellations: true,
        constellationLines: true,
        constellationLabels: true,
        deepSkyObjects: true,
      };
  }
}

export interface ProjectedStar {
  id: string;
  x: number;
  y: number;
  magnitude: number;
  colorIndex: number;
  name?: string;
  constellationId?: string;
  onScreen: boolean;
  questTarget?: boolean;
}

export interface ConstellationSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  constellationId: string;
  visible: boolean;
  highlighted?: boolean;
  ghost?: boolean;
  quest?: boolean;
}

export interface CelestialSprite {
  id: string;
  kind: 'planet' | 'sun' | 'moon' | 'dso';
  x: number;
  y: number;
  label: string;
  color: string;
  magnitude?: number;
  altitude: number;
  azimuth: number;
  distanceAU?: number;
  angularDiameterArcsec?: number;
  onScreen: boolean;
  selected?: boolean;
}

export interface GeodesicArc {
  points: Point2D[];
  label: string;
}

export interface SkySceneData {
  stars: ProjectedStar[];
  lines: ConstellationSegment[];
  bodies: CelestialSprite[];
  labels: { x: number; y: number; text: string; constellationId?: string; highlighted?: boolean }[];
  overlays: GeodesicArc[];
  bortle: number;
  visibility: VisibilityConfig;
  activeConstellationId: string | null;
  selectedPlanetName: string | null;
}

export interface RenderOptions {
  mode: RenderMode;
  magLimit: number;
  showStars: boolean;
  showLines: boolean;
  showLabels: boolean;
}
