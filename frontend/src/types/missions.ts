/**
 * Gamification types for young-learner missions (local-only progress).
 */

import type { CelestialBodyId } from './astronomy';

export type MissionId =
  | 'cadet_setup'
  | 'math_agreement'
  | 'sky_scanner'
  | 'orbit_master'
  | 'lab_detective'
  | 'planet_collector';

export type MissionNavTab = 'dashboard' | 'sky3d' | 'ar' | 'cvlab';

export type BadgeId =
  | 'badge_cadet'
  | 'badge_agreement'
  | 'badge_ar_navigator'
  | 'badge_orbit_master'
  | 'badge_lab_detective'
  | 'badge_collector';

export type RankId = 'cadet' | 'navigator' | 'observer' | 'mission_specialist' | 'skygazer_pro';

export interface RankDefinition {
  id: RankId;
  title: string;
  minCompletedMissions: number;
}

export interface MissionStep {
  id: string;
  label: string;
}

export interface MissionDefinition {
  id: MissionId;
  title: string;
  subtitle: string;
  steps: MissionStep[];
  rewardBadgeId: BadgeId;
  /** Mission IDs that must be completed before this one unlocks */
  requires: MissionId[];
  /** Tab to open for hints (optional) */
  suggestedTab?: MissionNavTab;
}

export interface BadgeDefinition {
  id: BadgeId;
  title: string;
  description: string;
  emoji: string;
}

/** Persisted in localStorage — no PII, no coordinates */
export interface MissionProgressState {
  version: 1;
  completedMissionIds: MissionId[];
  earnedBadgeIds: BadgeId[];
  discoveredBodyIds: CelestialBodyId[];
  dailyChallengeDate: string | null;
  dailyChallengeCompleted: boolean;
  updatedAt: string;
}

/** Runtime signals used to evaluate mission completion (session + app state) */
export interface MissionAppSnapshot {
  locationConfigured: boolean;
  visitedDashboard: boolean;
  dashboardLiveSeconds: number;
  /** User enabled Dashboard server compare */
  serverCompareActive: boolean;
  /** Great-circle-ish delta in degrees (az/alt residual); null until first successful compare */
  serverCompareDeltaDeg: number | null;
  arBodyLocked: boolean;
  arLockedBodyId: CelestialBodyId | null;
  visitedSky3d: boolean;
  cvLabProcessedImage: boolean;
  discoveredBodyCount: number;
}

export interface MissionEvaluationResult {
  missionId: MissionId;
  complete: boolean;
  completedSteps: string[];
  pendingSteps: string[];
}
