import * as Astronomy from 'astronomy-engine';
import { norm360 } from '../astronomy.ts';
import type { CelestialPosition } from '../astronomy.ts';
import { equatorialToHorizontal } from './fast.ts';

function observer(lat: number, lon: number, elevationM = 0): Astronomy.Observer {
  return new Astronomy.Observer(lat, lon, elevationM);
}

/** Apparent topocentric Sun (refraction-aware horizon via astronomy-engine). */
export function sunAltAz(date: Date, lat: number, lon: number): CelestialPosition {
  const obs = observer(lat, lon);
  const equ = Astronomy.Equator(Astronomy.Body.Sun, date, obs, true, true);
  const hor = Astronomy.Horizon(date, obs, equ.ra, equ.dec, 'normal');
  return { altitude: hor.altitude, azimuth: norm360(hor.azimuth) };
}

/** Apparent topocentric Moon. */
export function moonAltAz(date: Date, lat: number, lon: number): CelestialPosition {
  const obs = observer(lat, lon);
  const equ = Astronomy.Equator(Astronomy.Body.Moon, date, obs, true, true);
  const hor = Astronomy.Horizon(date, obs, equ.ra, equ.dec, 'normal');
  let illumFraction: number | undefined;
  try {
    illumFraction = Astronomy.Illumination(Astronomy.Body.Moon, date).phase_fraction;
  } catch {
    /* ignore */
  }
  return { altitude: hor.altitude, azimuth: norm360(hor.azimuth), illumFraction };
}

/** Validation helper — compare legacy horizontal transform vs engine for a body. */
export function engineEquatorialHorizon(
  body: Astronomy.Body,
  date: Date,
  lat: number,
  lon: number
): CelestialPosition {
  const obs = observer(lat, lon);
  const equ = Astronomy.Equator(body, date, obs, true, true);
  const raDeg = norm360(equ.ra * 15);
  const decDeg = equ.dec;
  const hor = equatorialToHorizontal(raDeg, decDeg, lat, lon, date);
  const horEngine = Astronomy.Horizon(date, obs, equ.ra, equ.dec, 'normal');
  void hor;
  return { altitude: horEngine.altitude, azimuth: norm360(horEngine.azimuth) };
}