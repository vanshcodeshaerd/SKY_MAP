import { ORBITARIUM_PLANETS } from '@/features/welcome/orbitarium/planets';
import { SOLAR_SYSTEM, type Planet } from '@/components/ui/orbital-hero-section.engine';

const TEXTURE_BY_NAME: Record<string, string> = {
  Sun: '/textures/sun.jpg',
  ...Object.fromEntries(ORBITARIUM_PLANETS.map((p) => [p.name, p.texture])),
};

/** J2000 hero planets with Solar System Scope textures (same as Orbitarium 3D). */
export function getWelcomeHeroPlanets(): Planet[] {
  return SOLAR_SYSTEM.map((p) => ({
    ...p,
    texture: TEXTURE_BY_NAME[p.name],
  }));
}

export { TEXTURE_BY_NAME };
