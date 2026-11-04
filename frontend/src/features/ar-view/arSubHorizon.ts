/**
 * Sub-horizon AR visibility — mirrors 3D sky explorer behaviour for bodies below Alt 0°.
 */

import * as THREE from 'three';
import { CelestialBodyId, CelestialCoordinates } from '../../types/astronomy';
import { azAltToEnuVector } from '../../services/coordinateTransforms';

export const AR_VIEWPORT_MARGIN_PX = 15;
/** Extra pixels below the fold where sub-horizon bodies remain visible (under the green horizon arc). */
export const AR_SUB_HORIZON_BOTTOM_EXTRA_PX = 96;

export type ArBodyVisibility = 'above' | 'sub-surface' | 'sub-beacon' | 'hidden';

export interface ArScreenProjection {
  u: number;
  v: number;
  isInFront: boolean;
  angularSeparationDeg: number;
  azimuthOffsetDeg: number;
  elevationOffsetDeg: number;
}

export interface ArViewport {
  width: number;
  height: number;
}

export interface SubHorizonBodyEntry {
  bodyId: CelestialBodyId;
  coords: CelestialCoordinates;
  horizonEnu: THREE.Vector3;
}

export function isInArViewport(
  u: number,
  v: number,
  viewport: ArViewport,
  margin = AR_VIEWPORT_MARGIN_PX,
  bottomExtra = 0
): boolean {
  return (
    u >= margin &&
    u <= viewport.width - margin &&
    v >= margin &&
    v <= viewport.height - margin + bottomExtra
  );
}

/**
 * Classifies how a body should appear in AR (above sky, below horizon surface, or azimuth beacon).
 */
export function classifyArBodyVisibility(
  altitudeDeg: number,
  proj: ArScreenProjection | undefined,
  viewport: ArViewport,
  showSubHorizon: boolean
): ArBodyVisibility {
  if (!proj) return 'hidden';

  if (altitudeDeg >= 0) {
    if (!proj.isInFront) return 'hidden';
    return isInArViewport(proj.u, proj.v, viewport) ? 'above' : 'hidden';
  }

  if (!showSubHorizon) return 'hidden';

  if (
    proj.isInFront &&
    isInArViewport(proj.u, proj.v, viewport, AR_VIEWPORT_MARGIN_PX, AR_SUB_HORIZON_BOTTOM_EXTRA_PX)
  ) {
    return 'sub-surface';
  }

  return 'sub-beacon';
}

/** Bodies currently below the local horizon (single pass over cached positions). */
export function buildSubHorizonCatalog(
  allPositions: Record<CelestialBodyId, CelestialCoordinates>
): SubHorizonBodyEntry[] {
  const entries: SubHorizonBodyEntry[] = [];
  for (const bodyId of Object.keys(allPositions) as CelestialBodyId[]) {
    const coords = allPositions[bodyId];
    if (!coords || coords.altitudeDeg >= 0) continue;
    entries.push({
      bodyId,
      coords,
      horizonEnu: azAltToEnuVector(coords.azimuthDeg, 0),
    });
  }
  return entries;
}

export function subHorizonGuidanceText(altitudeDeg: number, azimuthDeg: number): string {
  const depth = Math.abs(altitudeDeg).toFixed(0);
  return `Below horizon · Az ${azimuthDeg.toFixed(0)}° · Point down ~${depth}°`;
}
