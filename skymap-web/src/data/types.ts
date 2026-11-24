export interface Star {
  id: string;
  hip?: number;
  gaiaId?: string;
  name?: string;
  bayer?: string;
  ra: number;
  dec: number;
  magnitude: number;
  absoluteMagnitude?: number;
  distanceLightYears?: number;
  spectralType?: string;
  colorIndex?: number;
  properMotionRA?: number;
  properMotionDec?: number;
  constellationId?: string;
}

export interface ConstellationMeta {
  id: string;
  nameLatin: string;
  nameEnglish: string;
  abbreviation: string;
  mythology?: string;
  bestSeason?: string;
  principalStars?: string[];
}

export interface ConstellationLine {
  constellationId: string;
  fromStarId: string;
  toStarId: string;
}

export interface DeepSkyObject {
  id: string;
  messier?: string;
  name: string;
  ra: number;
  dec: number;
  magnitude?: number;
  type: string;
  constellationId?: string;
}

export type CatalogStage = 'initial' | 'intermediate' | 'advanced' | 'extended';

export interface CatalogBundle {
  stars: Star[];
  constellations: ConstellationMeta[];
  lines: ConstellationLine[];
  dso: DeepSkyObject[];
  loadTimeMs: number;
  graphErrors: string[];
}