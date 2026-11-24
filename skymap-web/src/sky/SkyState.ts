import type { Star } from '../data/types.ts';
import { applyProperMotion } from '../astronomy/precision.ts';
import { icrsUnitVector } from '../astronomy/icrs.ts';
import { icrsToEnu } from '../astronomy/skyTransform.ts';
import type { Vector3 } from '../projection.ts';

export class SkyState {
  private icrs: Vector3[] = [];
  private enu: Vector3[] = [];
  private lastTransformMs = 0;
  private transformIntervalMs = 120;
  private stars: Star[];

  constructor(stars: Star[]) {
    this.stars = stars;
    this.rebuildIcrs(new Date());
  }

  rebuildIcrs(date: Date) {
    this.icrs = this.stars.map((star) => {
      const { ra, dec } = applyProperMotion(star, date);
      return icrsUnitVector(ra, dec);
    });
  }

  updateEnu(lat: number, lon: number, date: Date, force = false) {
    const now = performance.now();
    if (!force && now - this.lastTransformMs < this.transformIntervalMs) return;
    this.lastTransformMs = now;
    this.enu = this.icrs.map((v) => icrsToEnu(v, lat, lon, date));
  }

  getEnuVectors(): readonly Vector3[] {
    return this.enu;
  }

  getStars(): readonly Star[] {
    return this.stars;
  }

  setSimulatedDate(date: Date) {
    this.rebuildIcrs(date);
    this.lastTransformMs = 0;
  }
}