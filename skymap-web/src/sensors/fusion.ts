import type { OrientationData } from '../orientation.ts';

export class OrientationFusion {
  private q = { w: 1, x: 0, y: 0, z: 0 };
  private initialized = false;

  updateFromEuler(data: OrientationData, declinationDeg: number, useTrueNorth: boolean): OrientationData {
    const decl = useTrueNorth ? 0 : declinationDeg;
    const h = ((data.h + decl) % 360 + 360) % 360;
    if (!this.initialized) {
      this.initialized = true;
      return { h, b: data.b, g: data.g };
    }
    const alpha = 0.15;
    let dh = h - this.quaternionToHeading();
    while (dh < -180) dh += 360;
    while (dh > 180) dh -= 360;
    const nh = this.quaternionToHeading() + alpha * dh;
    this.setFromHeading(nh, data.b, data.g);
    return { h: ((nh % 360) + 360) % 360, b: data.b, g: data.g };
  }

  private quaternionToHeading(): number {
    return (Math.atan2(2 * (this.q.w * this.q.z + this.q.x * this.q.y), 1 - 2 * (this.q.y ** 2 + this.q.z ** 2)) * 180) / Math.PI;
  }

  private setFromHeading(h: number, b: number, g: number): void {
    const hr = (h * Math.PI) / 180;
    const br = (b * Math.PI) / 180;
    const gr = (g * Math.PI) / 180;
    this.q.w = Math.cos(hr / 2) * Math.cos(br / 2);
    this.q.x = Math.sin(gr / 2);
    this.q.y = Math.sin(br / 2);
    this.q.z = Math.sin(hr / 2);
  }
}