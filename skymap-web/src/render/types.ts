import type { Point2D } from '../projection.ts';

export type RenderMode = 'AR' | 'VR_PLANETARIUM' | 'VR_STEREO' | 'NIGHT_RED';

export interface ProjectedStar {
  id: string;
  x: number;
  y: number;
  magnitude: number;
  colorIndex: number;
  name?: string;
  onScreen: boolean;
}

export interface ConstellationSegment {
  x1: number;
  y1: number;
  x2: number;
  y2: number;
  constellationId: string;
  visible: boolean;
}

export interface CelestialSprite {
  x: number;
  y: number;
  label: string;
  color: string;
  onScreen: boolean;
}

export interface GeodesicArc {
  points: Point2D[];
  label: string;
}

export interface SkySceneData {
  stars: ProjectedStar[];
  lines: ConstellationSegment[];
  bodies: CelestialSprite[];
  labels: { x: number; y: number; text: string }[];
  overlays: GeodesicArc[];
  bortle: number;
}

export interface RenderOptions {
  mode: RenderMode;
  magLimit: number;
  showStars: boolean;
  showLines: boolean;
  showLabels: boolean;
}