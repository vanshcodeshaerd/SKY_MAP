import type { Star } from './data/types.ts';
import { formatArcDms } from './astronomy/precision.ts';
import { separationBetweenStars } from './recognition.ts';
import type { GeodesicArc } from './render/types.ts';
import type { Point2D } from './projection.ts';

export interface MeasureState {
  starA: Star | null;
  starB: Star | null;
}

export function hitTestStar(
  stars: { id: string; x: number; y: number; onScreen: boolean }[],
  catalog: Map<string, Star>,
  px: number,
  py: number,
  radius = 20
): Star | null {
  for (const p of stars) {
    if (!p.onScreen) continue;
    if (Math.hypot(p.x - px, p.y - py) <= radius) {
      return catalog.get(p.id) ?? null;
    }
  }
  return null;
}

export function buildGeodesicArc(
  a: Point2D,
  b: Point2D,
  starA: Star,
  starB: Star
): GeodesicArc {
  const sep = separationBetweenStars(starA, starB);
  const points: Point2D[] = [];
  const steps = 24;
  for (let i = 0; i <= steps; i++) {
    const t = i / steps;
    const angle = (t - 0.5) * 0.15;
    const x = a.x + (b.x - a.x) * t;
    const y = a.y + (b.y - a.y) * t - Math.sin(t * Math.PI) * 40 - angle * 10;
    points.push({ x, y });
  }
  return { points, label: formatArcDms(sep) };
}