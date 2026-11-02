import { CELESTIAL_BODY_LIST, CelestialBodyId, GeodeticLocation } from '../types/astronomy';
import { getAllCelestialPositions } from './astronomyEngine';
import { localDateKey } from './dailyChallenge';
import type { MissionProgressState } from '../types/missions';

export type DailyQuestKind = 'align_hold' | 'compare_math' | 'visit_3d';

export interface DailyQuest {
  id: string;
  dateKey: string;
  kind: DailyQuestKind;
  title: string;
  description: string;
  xpReward: number;
  holdSeconds: number;
  bodyId?: CelestialBodyId;
  compareMaxDeltaDeg?: number;
}

function hashSeed(input: string): number {
  let h = 0;
  for (let i = 0; i < input.length; i++) {
    h = (h * 31 + input.charCodeAt(i)) >>> 0;
  }
  return h;
}

function pickVisibleBodies(location: GeodeticLocation, date: Date, count: number): CelestialBodyId[] {
  const positions = getAllCelestialPositions(location, date);
  const sorted = [...CELESTIAL_BODY_LIST].sort(
    (a, b) => positions[b.id].altitudeDeg - positions[a.id].altitudeDeg
  );
  return sorted.slice(0, count).map((b) => b.id);
}

/** Three daily alignment / skill quests (50–150 XP each). */
export function getDailyQuests(
  location: GeodeticLocation,
  date: Date = new Date()
): DailyQuest[] {
  const dateKey = localDateKey(date);
  const seed = hashSeed(
    `${dateKey}|quests|${location.latitude.toFixed(2)}|${location.longitude.toFixed(2)}`
  );
  const visible = pickVisibleBodies(location, date, 5);
  const bodyA = visible[seed % visible.length] ?? 'Moon';
  const bodyB = visible[(seed + 3) % visible.length] ?? 'Jupiter';
  const xpRewards = [50 + (seed % 3) * 25, 75 + ((seed >> 3) % 3) * 25, 100 + ((seed >> 6) % 2) * 50];

  return [
    {
      id: `${dateKey}_align_${bodyA}`,
      dateKey,
      kind: 'align_hold',
      title: `Golden lock: ${bodyA}`,
      description: `Hold TARGET LOCKED on ${bodyA} for 3 seconds in AR.`,
      xpReward: xpRewards[0],
      holdSeconds: 3,
      bodyId: bodyA,
    },
    {
      id: `${dateKey}_align_${bodyB}`,
      dateKey,
      kind: 'align_hold',
      title: `Golden lock: ${bodyB}`,
      description: `Hold TARGET LOCKED on ${bodyB} for 3 seconds in AR.`,
      xpReward: xpRewards[1],
      holdSeconds: 3,
      bodyId: bodyB,
    },
    {
      id: `${dateKey}_compare`,
      dateKey,
      kind: 'compare_math',
      title: 'Math agreement check',
      description: 'Enable server compare on Dashboard with difference under 0.15°.',
      xpReward: xpRewards[2],
      holdSeconds: 0,
      compareMaxDeltaDeg: 0.15,
    },
  ];
}

export function isDailyQuestComplete(
  progress: MissionProgressState,
  questId: string,
  dateKey: string
): boolean {
  if (progress.dailyQuestDate !== dateKey) return false;
  return progress.completedDailyQuestIds.includes(questId);
}

export function syncDailyQuestDate(progress: MissionProgressState, dateKey: string): MissionProgressState {
  if (progress.dailyQuestDate === dateKey) return progress;
  return {
    ...progress,
    dailyQuestDate: dateKey,
    completedDailyQuestIds: [],
  };
}
