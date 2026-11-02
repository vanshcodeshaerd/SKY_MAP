/**
 * Mission progress persistence and completion rules (localStorage only).
 */

import { MISSIONS, MISSION_STORAGE_KEY, RANKS, getMissionById } from '../data/missions';
import type {
  BadgeId,
  MissionAppSnapshot,
  MissionEvaluationResult,
  MissionId,
  MissionProgressState,
  RankId,
} from '../types/missions';
import type { CelestialBodyId } from '../types/astronomy';

export function createDefaultProgress(): MissionProgressState {
  return {
    version: 1,
    completedMissionIds: [],
    earnedBadgeIds: [],
    discoveredBodyIds: [],
    dailyChallengeDate: null,
    dailyChallengeCompleted: false,
    updatedAt: new Date().toISOString(),
  };
}

export function loadProgress(): MissionProgressState {
  if (typeof window === 'undefined') return createDefaultProgress();

  try {
    const raw = localStorage.getItem(MISSION_STORAGE_KEY);
    if (!raw) return createDefaultProgress();
    const parsed = JSON.parse(raw) as MissionProgressState;
    if (parsed.version !== 1) return createDefaultProgress();
    return {
      ...createDefaultProgress(),
      ...parsed,
      completedMissionIds: parsed.completedMissionIds ?? [],
      earnedBadgeIds: parsed.earnedBadgeIds ?? [],
      discoveredBodyIds: parsed.discoveredBodyIds ?? [],
    };
  } catch {
    return createDefaultProgress();
  }
}

export function saveProgress(state: MissionProgressState): void {
  if (typeof window === 'undefined') return;
  const next: MissionProgressState = {
    ...state,
    updatedAt: new Date().toISOString(),
  };
  localStorage.setItem(MISSION_STORAGE_KEY, JSON.stringify(next));
}

export function resetProgress(): MissionProgressState {
  const fresh = createDefaultProgress();
  saveProgress(fresh);
  return fresh;
}

export function isMissionComplete(state: MissionProgressState, missionId: MissionId): boolean {
  return state.completedMissionIds.includes(missionId);
}

export function isMissionUnlocked(state: MissionProgressState, missionId: MissionId): boolean {
  const mission = getMissionById(missionId);
  if (!mission) return false;
  return mission.requires.every((req) => state.completedMissionIds.includes(req));
}

export function awardBadge(state: MissionProgressState, badgeId: BadgeId): MissionProgressState {
  if (state.earnedBadgeIds.includes(badgeId)) return state;
  return {
    ...state,
    earnedBadgeIds: [...state.earnedBadgeIds, badgeId],
  };
}

export function recordDiscoveredBody(
  state: MissionProgressState,
  bodyId: CelestialBodyId
): MissionProgressState {
  if (state.discoveredBodyIds.includes(bodyId)) return state;
  return {
    ...state,
    discoveredBodyIds: [...state.discoveredBodyIds, bodyId],
  };
}

export function completeMission(
  state: MissionProgressState,
  missionId: MissionId
): MissionProgressState {
  if (state.completedMissionIds.includes(missionId)) return state;

  const mission = getMissionById(missionId);
  if (!mission || !isMissionUnlocked(state, missionId)) return state;

  let next: MissionProgressState = {
    ...state,
    completedMissionIds: [...state.completedMissionIds, missionId],
  };
  next = awardBadge(next, mission.rewardBadgeId);
  saveProgress(next);
  return next;
}

export function getRank(state: MissionProgressState): { id: RankId; title: string } {
  const count = state.completedMissionIds.length;
  let current = RANKS[0];
  for (const rank of RANKS) {
    if (count >= rank.minCompletedMissions) current = rank;
  }
  return { id: current.id, title: current.title };
}

function evaluateSteps(
  missionId: MissionId,
  snapshot: MissionAppSnapshot
): MissionEvaluationResult {
  const mission = getMissionById(missionId);
  if (!mission) {
    return { missionId, complete: false, completedSteps: [], pendingSteps: [] };
  }

  const completedSteps: string[] = [];
  const pendingSteps: string[] = [];

  const check = (stepId: string, done: boolean) => {
    if (done) completedSteps.push(stepId);
    else pendingSteps.push(stepId);
  };

  switch (missionId) {
    case 'cadet_setup':
      check('location', snapshot.locationConfigured);
      check('dashboard', snapshot.visitedDashboard);
      check('live_sun', snapshot.dashboardLiveSeconds >= 3);
      break;
    case 'math_agreement':
      check('compare_on', snapshot.serverCompareActive);
      check(
        'within_threshold',
        snapshot.serverCompareDeltaDeg !== null && snapshot.serverCompareDeltaDeg < 0.1
      );
      break;
    case 'sky_scanner':
      check('ar_lock', snapshot.arBodyLocked);
      break;
    case 'orbit_master':
      check('visit_3d', snapshot.visitedSky3d);
      break;
    case 'lab_detective':
      check('cv_process', snapshot.cvLabProcessedImage);
      break;
    case 'planet_collector':
      check('discover_three', snapshot.discoveredBodyCount >= 3);
      break;
    default:
      break;
  }

  const complete = pendingSteps.length === 0 && completedSteps.length === mission.steps.length;
  return { missionId, complete, completedSteps, pendingSteps };
}

export function evaluateMission(
  missionId: MissionId,
  snapshot: MissionAppSnapshot,
  progress: MissionProgressState
): MissionEvaluationResult {
  if (isMissionComplete(progress, missionId)) {
    const mission = getMissionById(missionId)!;
    return {
      missionId,
      complete: true,
      completedSteps: mission.steps.map((s) => s.id),
      pendingSteps: [],
    };
  }
  if (!isMissionUnlocked(progress, missionId)) {
    return {
      missionId,
      complete: false,
      completedSteps: [],
      pendingSteps: getMissionById(missionId)?.steps.map((s) => s.id) ?? [],
    };
  }
  return evaluateSteps(missionId, snapshot);
}

/** Evaluate all unlocked, incomplete missions; returns IDs newly completed */
export function evaluateAllMissions(
  snapshot: MissionAppSnapshot,
  progress: MissionProgressState
): { progress: MissionProgressState; newlyCompleted: MissionId[] } {
  let next = progress;
  const newlyCompleted: MissionId[] = [];

  for (const mission of MISSIONS) {
    if (isMissionComplete(next, mission.id)) continue;
    if (!isMissionUnlocked(next, mission.id)) continue;

    const result = evaluateSteps(mission.id, snapshot);
    if (result.complete) {
      const before = next.completedMissionIds.length;
      next = completeMission(next, mission.id);
      if (next.completedMissionIds.length > before) {
        newlyCompleted.push(mission.id);
      }
    }
  }

  if (newlyCompleted.length > 0) {
    saveProgress(next);
  }

  return { progress: next, newlyCompleted };
}

export function getNextMission(progress: MissionProgressState): MissionId | null {
  for (const mission of MISSIONS) {
    if (!isMissionComplete(progress, mission.id) && isMissionUnlocked(progress, mission.id)) {
      return mission.id;
    }
  }
  return null;
}

export function countCompletedMissions(progress: MissionProgressState): number {
  return progress.completedMissionIds.length;
}

export function markDailyChallengeComplete(
  progress: MissionProgressState,
  dateKey: string
): MissionProgressState {
  if (
    progress.dailyChallengeDate === dateKey &&
    progress.dailyChallengeCompleted
  ) {
    return progress;
  }
  const next: MissionProgressState = {
    ...progress,
    dailyChallengeDate: dateKey,
    dailyChallengeCompleted: true,
  };
  saveProgress(next);
  return next;
}
