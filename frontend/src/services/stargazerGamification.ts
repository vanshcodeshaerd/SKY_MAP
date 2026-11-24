import { getBadgeById } from '../data/missions';
import type { CelestialBodyId } from '../types/astronomy';
import type { BadgeId, MissionProgressState } from '../types/missions';
import { awardBadge, saveProgress } from './missionEngine';
import { localDateKey } from './dailyChallenge';
import type { DailyQuest } from './dailyQuests';
import { syncDailyQuestDate } from './dailyQuests';

export interface XpGainEvent {
  amount: number;
  reason: string;
}

const DISCOVERY_BADGE_BY_BODY: Partial<Record<CelestialBodyId, BadgeId>> = {
  Sun: 'badge_helios_seeker',
  Moon: 'badge_lunar_observer',
  Saturn: 'badge_lord_of_rings',
  Mars: 'badge_red_planet',
};

const MOON_PHASE_BUCKETS = [
  'New',
  'Waxing Crescent',
  'First Quarter',
  'Waxing Gibbous',
  'Full',
  'Waning Gibbous',
  'Last Quarter',
  'Waning Crescent',
];

export function moonPhaseToBucket(phaseName: string | undefined): string {
  if (!phaseName) return 'Unknown';
  const lower = phaseName.toLowerCase();
  for (const bucket of MOON_PHASE_BUCKETS) {
    if (lower.includes(bucket.toLowerCase().split(' ')[0])) return bucket;
  }
  if (lower.includes('full')) return 'Full';
  if (lower.includes('quarter')) return 'First Quarter';
  return phaseName;
}

export function addStargazerXp(
  progress: MissionProgressState,
  amount: number,
  persist = true
): MissionProgressState {
  if (amount <= 0) return progress;
  const next: MissionProgressState = {
    ...progress,
    stargazerXp: progress.stargazerXp + amount,
  };
  if (persist) saveProgress(next);
  return next;
}

function bumpDailyStreak(progress: MissionProgressState, dateKey: string): MissionProgressState {
  if (progress.lastDailyPlayDate === dateKey) return progress;
  const yesterday = new Date(dateKey);
  yesterday.setDate(yesterday.getDate() - 1);
  const yKey = localDateKey(yesterday);
  const nextStreak =
    progress.lastDailyPlayDate === yKey ? progress.dailyStreak + 1 : 1;
  return {
    ...progress,
    dailyStreak: nextStreak,
    lastDailyPlayDate: dateKey,
  };
}

export function applyBodyLockRewards(
  progress: MissionProgressState,
  bodyId: CelestialBodyId,
  options: {
    dateKey: string;
    moonPhaseName?: string;
    sunAltitudeDeg?: number;
  }
): { progress: MissionProgressState; xpEvents: XpGainEvent[] } {
  let next = syncDailyQuestDate(progress, options.dateKey);
  const xpEvents: XpGainEvent[] = [];
  const wasNew = !next.discoveredBodyIds.includes(bodyId);

  if (wasNew) {
    next = addStargazerXp(next, 25, false);
    xpEvents.push({ amount: 25, reason: `Discovered ${bodyId}` });
  }

  if (bodyId === 'Sun' && (options.sunAltitudeDeg ?? 0) >= 5) {
    const id: BadgeId = 'badge_helios_seeker';
    if (!next.earnedBadgeIds.includes(id)) {
      next = awardBadge(next, id);
      next = addStargazerXp(next, 100, false);
      xpEvents.push({ amount: 100, reason: 'Helios Seeker badge' });
    }
  }

  if (bodyId === 'Moon') {
    const bucket = moonPhaseToBucket(options.moonPhaseName);
    if (bucket !== 'Unknown' && !next.moonPhaseBucketsSeen.includes(bucket)) {
      next = {
        ...next,
        moonPhaseBucketsSeen: [...next.moonPhaseBucketsSeen, bucket],
      };
    }
    const id: BadgeId = 'badge_lunar_observer';
    if (
      next.moonPhaseBucketsSeen.length >= 3 &&
      !next.earnedBadgeIds.includes(id)
    ) {
      next = awardBadge(next, id);
      next = addStargazerXp(next, 100, false);
      xpEvents.push({ amount: 100, reason: 'Lunar Observer badge' });
    }
  }

  const discoveryBadge = DISCOVERY_BADGE_BY_BODY[bodyId];
  if (
    discoveryBadge &&
    bodyId !== 'Sun' &&
    bodyId !== 'Moon' &&
    !next.earnedBadgeIds.includes(discoveryBadge)
  ) {
    next = awardBadge(next, discoveryBadge);
    const badge = getBadgeById(discoveryBadge);
    next = addStargazerXp(next, 75, false);
    xpEvents.push({
      amount: 75,
      reason: badge ? `${badge.title} badge` : 'Discovery badge',
    });
  }

  next = bumpDailyStreak(next, options.dateKey);
  saveProgress(next);
  return { progress: next, xpEvents };
}

export function completeDailyQuest(
  progress: MissionProgressState,
  quest: DailyQuest
): { progress: MissionProgressState; xpEvent: XpGainEvent | null } {
  let next = syncDailyQuestDate(progress, quest.dateKey);
  if (next.completedDailyQuestIds.includes(quest.id)) {
    return { progress: next, xpEvent: null };
  }
  next = {
    ...next,
    completedDailyQuestIds: [...next.completedDailyQuestIds, quest.id],
  };
  next = addStargazerXp(next, quest.xpReward, false);
  next = bumpDailyStreak(next, quest.dateKey);
  saveProgress(next);
  return {
    progress: next,
    xpEvent: { amount: quest.xpReward, reason: quest.title },
  };
}

export function completeDailyChallengeXp(
  progress: MissionProgressState,
  dateKey: string
): { progress: MissionProgressState; xpEvent: XpGainEvent | null } {
  if (progress.dailyChallengeDate === dateKey && progress.dailyChallengeCompleted) {
    return { progress, xpEvent: null };
  }
  let next = addStargazerXp(progress, 120, false);
  next = bumpDailyStreak(next, dateKey);
  saveProgress(next);
  return { progress: next, xpEvent: { amount: 120, reason: "Today's sky challenge" } };
}

export function passSafetyQuiz(progress: MissionProgressState): MissionProgressState {
  if (progress.safetyQuizPassed) return progress;
  const next: MissionProgressState = {
    ...progress,
    safetyQuizPassed: true,
  };
  saveProgress(next);
  return next;
}

export function awardMissionCompleteXp(
  progress: MissionProgressState,
  missionTitle: string
): { progress: MissionProgressState; xpEvent: XpGainEvent } {
  const next = addStargazerXp(progress, 80, true);
  return { progress: next, xpEvent: { amount: 80, reason: `Mission: ${missionTitle}` } };
}
