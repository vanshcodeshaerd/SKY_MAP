/** Low-order WMM declination approximation (degrees east). */

export function magneticDeclination(lat: number, lon: number, _date = new Date()): number {
  const latR = (lat * Math.PI) / 180;
  const lonR = (lon * Math.PI) / 180;
  const decl =
    11.5 * Math.sin(lonR) * Math.cos(latR) -
    6.2 * Math.cos(lonR * 0.7) +
    0.35 * lat * 0.1;
  return Math.max(-25, Math.min(25, decl));
}