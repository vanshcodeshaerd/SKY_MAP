import type { CatalogBundle, ConstellationLine, Star } from '../data/types.ts';
import type { SkyState } from '../sky/SkyState.ts';
import { sampleGreatCircle, unitFromRaDec } from '../astronomy/spherical.ts';
import { icrsToEnu } from '../astronomy/skyTransform.ts';
import { formatArcDms } from '../astronomy/precision.ts';
import { separationBetweenStars } from '../recognition.ts';
import { enuToCameraSpace } from '../projection/enuCamera.ts';
import {
  clipSegmentToNearPlane,
  project,
  toENU,
  type Point2D,
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
  cameraPitch: number;
  cameraRoll: number;
  refreshSky?: boolean;
  width: number;
  height: number;
  fov: number;
  bortle: number;
  lines: ConstellationLine[];
  visibility: VisibilityConfig;
  activeConstellationId: string | null;
  selectedPlanetName: string | null;
  measurePair?: { a: Star; b: Star } | null;
  quest?: {
    constellationId: string;
    includeStarIds: Set<string>;
    hideOfficialLines: boolean;
    showGhost: boolean;
    completedEdges: { a: string; b: string }[];
  } | null;
}

function buildSphericalMeasureArc(
  a: Star,
  b: Star,
  lat: number,
  lon: number,
  date: Date,
  heading: number,
  pitch: number,
  roll: number,
  width: number,
  height: number,
  fov: number
): GeodesicArc | null {
  const samples = sampleGreatCircle(a.ra, a.dec, b.ra, b.dec, 36);
  const points: Point2D[] = [];
  for (const s of samples) {
    const enu = icrsToEnu(unitFromRaDec(s.ra, s.dec), lat, lon, date);
    const cam = enuToCameraSpace(enu, heading, pitch, roll);
    const pt = project(cam, width, height, fov);
    if (pt && cam.z > 0.001) points.push(pt);
  }
  if (points.length < 2) return null;
  return { points, label: formatArcDms(separationBetweenStars(a, b)) };
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
    cameraPitch,
    cameraRoll,
    refreshSky = false,
    width,
    height,
    fov,
    bortle,
    lines,
    visibility,
    activeConstellationId,
    selectedPlanetName,
    measurePair,
    quest,
  } = input;

  const toCam = (enu: Vector3) => enuToCameraSpace(enu, heading, cameraPitch, cameraRoll);

  const projectedStars: ProjectedStar[] = [];
  const segments: ConstellationSegment[] = [];
  const labels: SkySceneData['labels'] = [];

  if (visibility.stars || visibility.constellations) {
    sky.updateEnu(lat, lon, date, refreshSky);
    const enuVectors = sky.getEnuVectors();
    const stars = sky.getStars();

    const camMap = new Map<string, Vector3>();
    const screenPositions = new Map<string, { x: number; y: number; onScreen: boolean }>();

    const magLimit = bortle <= 3 ? 6.5 : bortle <= 5 ? 4.8 : 3.2;

    for (let i = 0; i < stars.length; i++) {
      const star = stars[i];
      const enu = enuVectors[i];
      const cam = toCam(enu);
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

      const questStar = !!quest?.includeStarIds.has(star.id);
      if (visibility.stars && (star.magnitude <= magLimit || questStar)) {
        projectedStars.push({
          id: star.id,
          x,
          y,
          magnitude: star.magnitude,
          colorIndex: star.colorIndex ?? 0.6,
          name: star.name,
          constellationId: star.constellationId,
          onScreen,
          questTarget: questStar,
        });
      }
    }

    if (visibility.constellations && visibility.constellationLines) {
      const conCentroidAcc = new Map<string, { sx: number; sy: number; count: number }>();
      const starById = new Map(catalog.stars.map((s) => [s.id, s]));

      const tessellatePair = (
        sa: Star,
        sb: Star,
        constellationId: string,
        flags: { highlighted?: boolean; ghost?: boolean; quest?: boolean }
      ) => {
        const arcSamples = sampleGreatCircle(sa.ra, sa.dec, sb.ra, sb.dec, 14);
        let prevCam: Vector3 | null = null;
        for (const sample of arcSamples) {
          const enu = icrsToEnu(unitFromRaDec(sample.ra, sample.dec), lat, lon, date);
          const cam = toCam(enu);
          if (prevCam) {
            const clipped = clipSegmentToNearPlane(prevCam, cam, 0.02);
            if (clipped) {
              const p1 = project(clipped[0], width, height, fov);
              const p2 = project(clipped[1], width, height, fov);
              if (p1 && p2) {
                const inBounds =
                  (p1.x >= -120 && p1.x <= width + 120 && p1.y >= -120 && p1.y <= height + 120) ||
                  (p2.x >= -120 && p2.x <= width + 120 && p2.y >= -120 && p2.y <= height + 120);
                if (inBounds) {
                  segments.push({
                    x1: p1.x,
                    y1: p1.y,
                    x2: p2.x,
                    y2: p2.y,
                    constellationId,
                    visible: true,
                    highlighted: flags.highlighted,
                    ghost: flags.ghost,
                    quest: flags.quest,
                  });
                  const acc = conCentroidAcc.get(constellationId) ?? { sx: 0, sy: 0, count: 0 };
                  acc.sx += (p1.x + p2.x) * 0.5;
                  acc.sy += (p1.y + p2.y) * 0.5;
                  acc.count += 1;
                  conCentroidAcc.set(constellationId, acc);
                }
              }
            }
          }
          prevCam = cam;
        }
      };

      for (const line of lines) {
        const sa = starById.get(line.fromStarId);
        const sb = starById.get(line.toStarId);
        if (!sa || !sb) continue;

        const isQuestCon =
          !!quest && line.constellationId.toLowerCase() === quest.constellationId.toLowerCase();
        if (quest && !isQuestCon) continue;
        if (isQuestCon && quest.hideOfficialLines && !quest.showGhost) continue;

        const highlighted =
          activeConstellationId !== null &&
          line.constellationId.toLowerCase() === activeConstellationId.toLowerCase();

        tessellatePair(sa, sb, line.constellationId, {
          highlighted: highlighted && !isQuestCon,
          ghost: !!(isQuestCon && quest?.showGhost),
          quest: false,
        });
      }

      if (quest) {
        for (const edge of quest.completedEdges) {
          const sa = starById.get(edge.a);
          const sb = starById.get(edge.b);
          if (!sa || !sb) continue;
          tessellatePair(sa, sb, quest.constellationId, { highlighted: true, quest: true, ghost: false });
        }
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
      const cam = toCam(enu);
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
      const cam = toCam(enu);
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
      const cam = toCam(enu);
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

  const measureArc = measurePair
    ? buildSphericalMeasureArc(
        measurePair.a,
        measurePair.b,
        lat,
        lon,
        date,
        heading,
        cameraPitch,
        cameraRoll,
        width,
        height,
        fov
      )
    : null;

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
