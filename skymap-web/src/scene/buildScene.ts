import type { CatalogBundle } from '../data/types.ts';
import type { ConstellationLine } from '../data/types.ts';
import type { SkyState } from '../sky/SkyState.ts';
import { worldToCamera, project, toENU, orientationMatrix } from '../projection.ts';
import { sunAltAz, moonAltAz } from '../astronomy.ts';
import { equatorialToHorizontal } from '../astronomy/fast.ts';
import type { SkySceneData, ProjectedStar, ConstellationSegment, CelestialSprite, GeodesicArc } from '../render/types.ts';

export interface SceneBuildInput {
  catalog: CatalogBundle;
  sky: SkyState;
  lat: number;
  lon: number;
  date: Date;
  heading: number;
  beta: number;
  gamma: number;
  width: number;
  height: number;
  fov: number;
  bortle: number;
  lines: ConstellationLine[];
  measureArc?: GeodesicArc | null;
}

export function buildSkyScene(input: SceneBuildInput): SkySceneData {
  const {
    catalog,
    sky,
    lat,
    lon,
    date,
    heading,
    beta,
    gamma,
    width,
    height,
    fov,
    bortle,
    lines,
    measureArc,
  } = input;

  sky.updateEnu(lat, lon, date, false);
  const enuVectors = sky.getEnuVectors();
  const stars = sky.getStars();
  const R = orientationMatrix(heading, beta, gamma);

  const projectedStars: ProjectedStar[] = [];
  const screenPositions = new Map<string, { x: number; y: number; onScreen: boolean }>();

  for (let i = 0; i < stars.length; i++) {
    const star = stars[i];
    const enu = enuVectors[i];
    const cam = worldToCamera(enu, R);
    const pt = project(cam, width, height, fov);
    const onScreen =
      !!pt &&
      pt.x >= 0 &&
      pt.x <= width &&
      pt.y >= 0 &&
      pt.y <= height &&
      cam.z > 0;
    const x = pt?.x ?? 0;
    const y = pt?.y ?? 0;
    projectedStars.push({
      id: star.id,
      x,
      y,
      magnitude: star.magnitude,
      colorIndex: star.colorIndex ?? 0.6,
      name: star.name,
      onScreen,
    });
    screenPositions.set(star.id, { x, y, onScreen });
  }

  const segments: ConstellationSegment[] = lines.map((line) => {
    const a = screenPositions.get(line.fromStarId);
    const b = screenPositions.get(line.toStarId);
    const visible = !!(a?.onScreen && b?.onScreen);
    return {
      x1: a?.x ?? 0,
      y1: a?.y ?? 0,
      x2: b?.x ?? 0,
      y2: b?.y ?? 0,
      constellationId: line.constellationId,
      visible,
    };
  });

  const bodies: CelestialSprite[] = [];
  for (const dso of catalog.dso) {
    const hor = equatorialToHorizontal(dso.ra, dso.dec, lat, lon, date);
    const enu = toENU(hor.altitude, hor.azimuth);
    const cam = worldToCamera(enu, R);
    const pt = project(cam, width, height, fov);
    bodies.push({
      x: pt?.x ?? 0,
      y: pt?.y ?? 0,
      label: dso.messier ?? dso.name,
      color: '#a78bfa',
      onScreen: !!(pt && cam.z > 0 && hor.altitude > 0),
    });
  }

  const sun = sunAltAz(date, lat, lon);
  const moon = moonAltAz(date, lat, lon);
  for (const [name, pos, color] of [
    ['Sun', sun, '#fbbf24'],
    ['Moon', moon, '#f1f5f9'],
  ] as const) {
    const enu = toENU(pos.altitude, pos.azimuth);
    const cam = worldToCamera(enu, R);
    const pt = project(cam, width, height, fov);
    bodies.push({
      x: pt?.x ?? 0,
      y: pt?.y ?? 0,
      label: name,
      color,
      onScreen: !!(pt && cam.z > 0),
    });
  }

  return {
    stars: projectedStars,
    lines: segments,
    bodies,
    labels: [],
    overlays: measureArc ? [measureArc] : [],
    bortle,
  };
}