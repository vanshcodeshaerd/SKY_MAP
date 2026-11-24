/**
 * Scene-layer visibility for BOTH / PLANETS / CONSTELLATIONS modes.
 * Matches skymap-web/src/render/types.ts semantics.
 */

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
        deepSkyObjects: true,
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