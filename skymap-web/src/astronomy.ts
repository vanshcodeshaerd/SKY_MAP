export function toRad(d: number) { return (d * Math.PI) / 180; }
export function toDeg(r: number) { return (r * 180) / Math.PI; }
export function norm360(d: number) { return ((d % 360) + 360) % 360; } 
export function julianDate(date: Date) { return date.getTime() / 86400000 + 2440587.5; } 

export interface CelestialPosition {
    altitude: number;
    azimuth: number;
    illumFraction?: number;
}

export function sunAltAz(date: Date, lat: number, lon: number): CelestialPosition {
  const JD = julianDate(date);
  const T = (JD - 2451545.0) / 36525;
  
  const L0 = norm360(280.46646 + T * (36000.76983 + 0.0003032 * T));      // mean longitude
  const M  = norm360(357.52911 + T * (35999.05029 - 0.0001537 * T));      // mean anomaly
  const Mr = toRad(M);
  const C = (1.914602 - T * (0.004817 + 0.000014 * T)) * Math.sin(Mr)
          + (0.019993 - 0.000101 * T) * Math.sin(2 * Mr)
          + 0.000289 * Math.sin(3 * Mr);                                  // equation of center
  const trueLong = L0 + C;
  const omega = 125.04 - 1934.136 * T;
  const appLong = trueLong - 0.00569 - 0.00478 * Math.sin(toRad(omega));  // apparent longitude
  
  const eps0 = 23 + (26 + (21.448 - T * (46.815 + T * (0.00059 - 0.001813 * T))) / 60) / 60;
  const eps = eps0 + 0.00256 * Math.cos(toRad(omega));                   // corrected obliquity
  
  const lam = toRad(appLong), epsR = toRad(eps);
  const ra  = toDeg(Math.atan2(Math.cos(epsR) * Math.sin(lam), Math.cos(lam)));
  const dec = toDeg(Math.asin(Math.sin(epsR) * Math.sin(lam)));
  
  const gmst = norm360(280.46061837 + 360.98564736629 * (JD - 2451545.0)
             + T * T * (0.000387933 - T / 38710000));
  const lst = norm360(gmst + lon);
  const ha  = norm360(lst - ra);
  
  const latR = toRad(lat), decR = toRad(dec), haR = toRad(ha);
  const alt = toDeg(Math.asin(Math.sin(latR) * Math.sin(decR) + Math.cos(latR) * Math.cos(decR) * Math.cos(haR)));
  const az  = norm360(toDeg(Math.atan2(-Math.sin(haR), Math.tan(decR) * Math.cos(latR) - Math.sin(latR) * Math.cos(haR))));
  
  return { altitude: alt, azimuth: az };
}

export function moonAltAz(date: Date, lat: number, lon: number): CelestialPosition {
  const JD = julianDate(date);
  const T = (JD - 2451545.0) / 36525;
  
  const Lp = norm360(218.3164477 + 481267.88123421 * T);   // mean longitude
  const D  = norm360(297.8501921 + 445267.1114034 * T);    // mean elongation from Sun
  const M  = norm360(357.5291092 + 35999.0502909 * T);     // Sun mean anomaly
  const Mp = norm360(134.9633964 + 477198.8675055 * T);    // Moon mean anomaly
  const F  = norm360(93.2720950 + 483202.0175233 * T);     // argument of latitude
  
  const [Dr, Mr, Mpr, Fr] = [D, M, Mp, F].map(toRad);
  
  const dL = 6.289 * Math.sin(Mpr) - 1.274 * Math.sin(2 * Dr - Mpr) + 0.658 * Math.sin(2 * Dr)
           - 0.186 * Math.sin(Mr) - 0.059 * Math.sin(2 * Dr - 2 * Mpr) - 0.057 * Math.sin(2 * Dr - Mr - Mpr)
           + 0.053 * Math.sin(2 * Dr + Mpr) + 0.046 * Math.sin(2 * Dr - Mr) + 0.041 * Math.sin(Mpr - Mr)
           - 0.035 * Math.sin(Dr) - 0.031 * Math.sin(Mpr + Mr);
  const dB = 5.128 * Math.sin(Fr) + 0.281 * Math.sin(Mpr + Fr) + 0.278 * Math.sin(Mpr - Fr)
           + 0.173 * Math.sin(2 * Dr - Fr) + 0.055 * Math.sin(2 * Dr + Fr - Mpr) + 0.046 * Math.sin(2 * Dr - Fr - Mr)
           + 0.033 * Math.sin(Fr + 2 * Mpr) + 0.017 * Math.sin(2 * Dr + Fr);
           
  const lambda = toRad(Lp + dL), beta = toRad(dB);
  const eps = toRad(23.4393 - 0.0000004 * T); // mean obliquity
  
  const ra  = toDeg(Math.atan2(Math.sin(lambda) * Math.cos(eps) - Math.tan(beta) * Math.sin(eps), Math.cos(lambda)));
  const dec = toDeg(Math.asin(Math.sin(beta) * Math.cos(eps) + Math.cos(beta) * Math.sin(eps) * Math.sin(lambda)));
  
  const gmst = norm360(280.46061837 + 360.98564736629 * (JD - 2451545.0));
  const lst = norm360(gmst + lon);
  const ha  = norm360(lst - ra);
  
  const latR = toRad(lat), decR = toRad(dec), haR = toRad(ha);
  const alt = toDeg(Math.asin(Math.sin(latR) * Math.sin(decR) + Math.cos(latR) * Math.cos(decR) * Math.cos(haR)));
  const az  = norm360(toDeg(Math.atan2(-Math.sin(haR), Math.tan(decR) * Math.cos(latR) - Math.sin(latR) * Math.cos(haR))));
  
  const elongation = Math.acos(Math.cos(toRad(D)));
  const illumFraction = (1 + Math.cos(Math.PI - elongation)) / 2;
  
  return { altitude: alt, azimuth: az, illumFraction };
}
