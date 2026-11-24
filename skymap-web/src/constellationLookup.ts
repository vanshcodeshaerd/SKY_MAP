import boundsData from './data/constellations.bounds.json';

interface BoundPoly {
  id: string;
  rings: number[][][];
}

const bounds = boundsData as BoundPoly[];

function raToLon(ra: number): number {
  const r = ((ra % 360) + 360) % 360;
  return r > 180 ? r - 360 : r;
}

function pointInRing(x: number, y: number, ring: number[][]): boolean {
  let inside = false;
  for (let i = 0, j = ring.length - 1; i < ring.length; j = i++) {
    const xi = ring[i][0], yi = ring[i][1];
    const xj = ring[j][0], yj = ring[j][1];
    const intersect = yi > y !== yj > y && x < ((xj - xi) * (y - yi)) / (yj - yi + 1e-12) + xi;
    if (intersect) inside = !inside;
  }
  return inside;
}

/** IAU constellation containing J2000 RA/Dec (bounds stored as GeoJSON longitude). */
export function constellationFromRaDec(raDeg: number, decDeg: number): string | null {
  const lon = raToLon(raDeg);
  for (const b of bounds) {
    for (const ring of b.rings) {
      for (const shift of [0, 360, -360]) {
        const shifted = ring.map(([x, y]) => [x + shift, y]);
        if (pointInRing(lon, decDeg, shifted)) return b.id;
      }
    }
  }
  return null;
}