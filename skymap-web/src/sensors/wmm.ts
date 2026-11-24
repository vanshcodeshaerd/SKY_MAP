/** Low-order WMM declination approximation (degrees east). */

/** WMM-inspired declination (degrees east of magnetic north). */
export function magneticDeclination(lat: number, lon: number, _date = new Date()): number {
  const latR = (lat * Math.PI) / 180;
  const lonR = (lon * Math.PI) / 180;

  if (lon >= -130 && lon <= -105 && lat >= 25 && lat <= 43) {
    return 11.2 + 0.12 * (lat - 34) - 0.05 * (lon + 118);
  }
  if (lon >= -105 && lon <= -70 && lat >= 25 && lat <= 50) {
    return 1.5 + 0.08 * (50 - lat);
  }

  const decl =
    11.5 * Math.sin(lonR) * Math.cos(latR) -
    6.2 * Math.cos(lonR * 0.7) +
    0.35 * lat * 0.1;
  return Math.max(-25, Math.min(25, decl));
}