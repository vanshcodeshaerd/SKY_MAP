import { julianDate, norm360, toDeg, toRad } from '../astronomy.ts';

export interface HorizontalCoords {
  altitude: number;
  azimuth: number;
  ha: number;
  ra: number;
  dec: number;
}

export function gmstDegrees(date: Date): number {
  const JD = julianDate(date);
  const T = (JD - 2451545.0) / 36525;
  return norm360(
    280.46061837 +
      360.98564736629 * (JD - 2451545.0) +
      T * T * (0.000387933 - T / 38710000)
  );
}

export function lstDegrees(date: Date, lon: number): number {
  return norm360(gmstDegrees(date) + lon);
}

/** Quadrant-safe horizontal coords from J2000 equatorial (degrees). */
export function equatorialToHorizontal(
  raDeg: number,
  decDeg: number,
  lat: number,
  lon: number,
  date: Date
): HorizontalCoords {
  const lst = lstDegrees(date, lon);
  const ha = norm360(lst - raDeg);
  const latR = toRad(lat);
  const decR = toRad(decDeg);
  const haR = toRad(ha);

  const alt = toDeg(
    Math.asin(
      Math.sin(latR) * Math.sin(decR) +
        Math.cos(latR) * Math.cos(decR) * Math.cos(haR)
    )
  );
  const az = norm360(
    toDeg(
      Math.atan2(
        -Math.sin(haR),
        Math.tan(decR) * Math.cos(latR) - Math.sin(latR) * Math.cos(haR)
      )
    )
  );

  return { altitude: alt, azimuth: az, ha, ra: raDeg, dec: decDeg };
}

/** Inverse of equatorialToHorizontal: alt/az → RA/Dec (degrees). */
export function horizontalToEquatorial(
  altDeg: number,
  azDeg: number,
  lat: number,
  lon: number,
  date: Date
): { ra: number; dec: number } {
  const lst = lstDegrees(date, lon);
  const latR = toRad(lat);
  const altR = toRad(altDeg);
  const azR = toRad(azDeg);
  const sinDec =
    Math.sin(latR) * Math.sin(altR) + Math.cos(latR) * Math.cos(altR) * Math.cos(azR);
  const dec = toDeg(Math.asin(Math.max(-1, Math.min(1, sinDec))));
  const ha = toDeg(
    Math.atan2(
      -Math.sin(azR) * Math.cos(altR),
      Math.sin(altR) * Math.cos(latR) - Math.cos(altR) * Math.sin(latR) * Math.cos(azR)
    )
  );
  const ra = norm360(lst - ha);
  return { ra, dec };
}