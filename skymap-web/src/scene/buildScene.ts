import type { CatalogBundle, ConstellationLine } from '../data/types.ts';
import type { SkyState } from '../sky/SkyState.ts';
import {
  boresightENU,
  clipSegmentToNearPlane,
  orientationMatrix,
  project,
  toENU,
  worldToCamera,
  type Vector3,
} from '../projection.ts';
import { sunAltAz, moonAltAz } from '../astronomy.ts';
import { equatorialToHorizontal } from '../astronomy/fast.ts';
import { NAKED_EYE_PLANETS, planetAltAz } from '../planets.ts';
import type {
  CelestialSprite,
  ConstellationSegment,
  GeodesicArc,
  ProjectedStar,
  SkySceneData,
  VisibilityConfig,
} from '../render/types.ts';

export interface SceneBuildInput {
  catalog: CatalogBundle;
  sky: SkyState;
  lat: number;
  lon: number;
  date: Date;
  heading: number;
  beta: number;
  gamma: number;
  screenAngle?: number;
  width: number;
  height: number;
  fov: number;
  bortle: number;
  lines: ConstellationLine[];
  visibility: VisibilityConfig;
  activeConstellationId: string | null;
  selectedPlanetName: string | null;
  measureArc?: GeodesicArc | null;
}

const PLANET_COLORS: Record<string, string> = {
  Mercury: '#cbd5e1',
  Venus: '#fde68a',
  Mars: '#f87171',
  Jupiter: '#fdba74',
  Saturn: '#fcd34d',
};

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
    screenAngle = 0,
    width,
    height,
    fov,
    bortle,
    lines,
    visibility,
    activeConstellationId,
    selectedPlanetName,
    measureArc,
  } = input;

  const R = orientationMatrix(heading, beta, gamma, screenAngle);
  void boresightENU(R);

  const projectedStars: ProjectedStar[] = [];
  const segments: ConstellationSegment[] = [];
  const labels: SkySceneData['labels'] = [];

  if (visibility.stars || visibility.constellations) {
    sky.updateEnu(lat, lon, date, false);
    const enuVectors = sky.getEnuVectors();
    const stars = sky.getStars();

    const camMap = new Map<string, Vector3>();
    const screenPositions = new Map<string, { x: number; y: number; onScreen: boolean }>();

    const magLimit = bortle <= 3 ? 6.5 : bortle <= 5 ? 4.8 : 3.2;

    for (let i = 0; i < stars.length; i++) {
      const star = stars[i];
      const enu = enuVectors[i];
      const cam = worldToCamera(enu, R);
      camMap.set(star.id, cam);

      const pt = project(cam, width, height, fov);
      const onScreen =
        !!pt &&
        pt.x >= -20 &&
        pt.x <= width + 20 &&
        pt.y >= -20 &&
        pt.y <= height + 20 &&
        cam.z > 0.001;

      const x = pt?.x ?? 0;
      const y = pt?.y ?? 0;
      screenPositions.set(star.id, { x, y, onScreen });

      if (visibility.stars && star.magnitude <= magLimit) {
        projectedStars.push({
          id: star.id,
          x,
          y,
          magnitude: star.magnitude,
          colorIndex: star.colorIndex ?? 0.6,
          name: star.name,
          constellationId: star.constellationId,
          onScreen,
        });
      }
    }

    if (visibility.constellations && visibility.constellationLines) {
      const conCentroidAcc = new Map<string, { sx: number; sy: number; count: number }>();

      for (const line of lines) {
        const camA = camMap.get(line.fromStarId);
        const camB = camMap.get(line.toStarId);
        if (!camA || !camB) continue;

        const clipped = clipSegmentToNearPlane(camA, camB, 0.02);
        if (!clipped) continue;

        const p1 = project(clipped[0], width, height, fov);
        const p2 = project(clipped[1], width, height, fov);
        if (!p1 || !p2) continue;

        const inBounds =
          (p1.x >= -120 && p1.x <= width + 120 && p1.y >= -120 && p1.y <= height + 120) ||
          (p2.x >= -120 && p2.x <= width + 120 && p2.y >= -120 && p2.y <= height + 120);
        if (!inBounds) continue;

        const highlighted =
          activeConstellationId !== null &&
          line.constellationId.toLowerCase() === activeConstellationId.toLowerCase();

        segments.push({
          x1: p1.x,
          y1: p1.y,
          x2: p2.x,
          y2: p2.y,
          constellationId: line.constellationId,
          visible: true,
          highlighted,
        });

        const acc = conCentroidAcc.get(line.constellationId) ?? { sx: 0, sy: 0, count: 0 };
        acc.sx += (p1.x + p2.x) * 0.5;
        acc.sy += (p1.y + p2.y) * 0.5;
        acc.count += 1;
        conCentroidAcc.set(line.constellationId, acc);
      }

      if (visibility.constellationLabels) {
        for (const [conId, acc] of conCentroidAcc) {
          const cx = acc.sx / acc.count;
          const cy = acc.sy / acc.count;
          if (cx >= 30 && cx <= width - 30 && cy >= 50 && cy <= height - 50) {
            const meta = catalog.constellations.find(
              (c) => c.id.toLowerCase() === conId.toLowerCase()
            );
            labels.push({
              x: cx,
              y: cy,
              text: meta ? meta.nameLatin.toUpperCase() : conId.toUpperCase(),
              constellationId: conId,
              highlighted:
                activeConstellationId !== null &&
                conId.toLowerCase() === activeConstellationId.toLowerCase(),
            });
          }
        }
      }
    }
  }

  const bodies: CelestialSprite[] = [];

  if (visibility.deepSkyObjects) {
    for (const dso of catalog.dso) {
      const hor = equatorialToHorizontal(dso.ra, dso.dec, lat, lon, date);
      const enu = toENU(hor.altitude, hor.azimuth);
      const cam = worldToCamera(enu, R);
      const pt = project(cam, width, height, fov);
      bodies.push({
        id: dso.id,
        kind: 'dso',
        x: pt?.x ?? 0,
        y: pt?.y ?? 0,
        label: dso.messier ?? dso.name,
        color: '#a78bfa',
        magnitude: dso.magnitude,
        altitude: hor.altitude,
        azimuth: hor.azimuth,
        onScreen: !!(pt && cam.z > 0.001 && hor.altitude > 0),
      });
    }
  }

  if (visibility.planets) {
    const sun = sunAltAz(date, lat, lon);
    const moon = moonAltAz(date, lat, lon);
    for (const [name, pos, color, kind] of [
      ['Sun', sun, '#fbbf24', 'sun'],
      ['Moon', moon, '#f1f5f9', 'moon'],
    ] as const) {
      const enu = toENU(pos.altitude, pos.azimuth);
      const cam = worldToCamera(enu, R);
      const pt = project(cam, width, height, fov);
      bodies.push({
        id: name.toLowerCase(),
        kind,
        x: pt?.x ?? 0,
        y: pt?.y ?? 0,
        label: name,
        color,
        altitude: pos.altitude,
        azimuth: pos.azimuth,
        onScreen: !!(pt && cam.z > 0.001),
        selected: selectedPlanetName === name,
      });
    }

    for (const planet of NAKED_EYE_PLANETS) {
      const pos = planetAltAz(planet, date, lat, lon);
      const enu = toENU(pos.altitude, pos.azimuth);
      const cam = worldToCamera(enu, R);
      const pt = project(cam, width, height, fov);
      bodies.push({
        id: planet.toLowerCase(),
        kind: 'planet',
        x: pt?.x ?? 0,
        y: pt?.y ?? 0,
        label: planet,
        color: PLANET_COLORS[planet] ?? '#fde68a',
        magnitude: pos.magnitude,
        altitude: pos.altitude,
        azimuth: pos.azimuth,
        distanceAU: pos.distanceAU,
        angularDiameterArcsec: pos.angularDiameterArcsec,
        onScreen: !!(pt && cam.z > 0.001),
        selected: selectedPlanetName === planet,
      });
    }
  }

  return {
    stars: projectedStars,
    lines: segments,
    bodies,
    labels,
    overlays: measureArc ? [measureArc] : [],
    bortle,
    visibility,
    activeConstellationId,
    selectedPlanetName,
  };
}
