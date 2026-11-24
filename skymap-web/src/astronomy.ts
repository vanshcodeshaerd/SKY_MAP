export function toRad(d: number) { return (d * Math.PI) / 180; }
export function toDeg(r: number) { return (r * 180) / Math.PI; }
export function norm360(d: number) { return ((d % 360) + 360) % 360; } 
export function julianDate(date: Date) { return date.getTime() / 86400000 + 2440587.5; } 

export interface CelestialPosition {
    altitude: number;
    azimuth: number;
    illumFraction?: number;
}

export { sunAltAz, moonAltAz } from './astronomy/bodies.ts';
