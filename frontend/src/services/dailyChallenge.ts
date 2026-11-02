import { CELESTIAL_BODIES, CELESTIAL_BODY_LIST, GeodeticLocation, CelestialBodyId } from '../types/astronomy';
import { getAllCelestialPositions } from './astronomyEngine';
import type { MissionProgressState } from '../types/missions';

export interface DailyChallenge {
  dateKey: string;
  bodyId: CelestialBodyId;
  bodyName: string;
  azimuthDeg: number;
  altitudeDeg: number;
  hint: string;
  isAboveHorizon: boolean;
}

/** Local calendar date YYYY-MM-DD */
export function localDateKey(date: Date = new Date()): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, '0');
  const d = String(date.getDate()).padStart(2, '0');
  return `${y}-${m}-${d}`;
}

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

/**
 * Picks one visible (or best available) body for today's challenge at this location.
 * Deterministic per day + location so it feels like a daily quest.
 */
export function getDailyChallenge(
  location: GeodeticLocation,
  date: Date = new Date()
): DailyChallenge | null {
  const dateKey = localDateKey(date);
  const positions = getAllCelestialPositions(location, date);

  let candidates = CELESTIAL_BODY_LIST.filter((b) => positions[b.id].altitudeDeg >= 5);
  if (candidates.length === 0) {
    candidates = [...CELESTIAL_BODY_LIST].sort(
      (a, b) => positions[b.id].altitudeDeg - positions[a.id].altitudeDeg
    );
  }

  const seed = hashSeed(
    `${dateKey}|${location.latitude.toFixed(3)}|${location.longitude.toFixed(3)}`
  );
  const pick = candidates[seed % candidates.length];
  const pos = positions[pick.id];
  const meta = CELESTIAL_BODIES[pick.id];

  const hint = pos.isAboveHorizon
    ? `Look ${Math.round(pos.azimuthDeg)}° azimuth, ${Math.round(pos.altitudeDeg)}° above the horizon.`
    : `${meta.name} is below the horizon now—use AR sub-horizon mode or try tonight for a visible target.`;

  return {
    dateKey,
    bodyId: pick.id,
    bodyName: meta.name,
    azimuthDeg: pos.azimuthDeg,
    altitudeDeg: pos.altitudeDeg,
    hint,
    isAboveHorizon: pos.isAboveHorizon,
  };
}

export function isDailyChallengeCompleteToday(
  progress: MissionProgressState,
  dateKey: string
): boolean {
  return progress.dailyChallengeDate === dateKey && progress.dailyChallengeCompleted;
}
