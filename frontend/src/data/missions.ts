/**
 * Mission catalog for SkyGazer AR gamification (Steps 1–8 roadmap).
 */

import type { BadgeDefinition, MissionDefinition, RankDefinition } from '../types/missions';

export const MISSION_STORAGE_KEY = 'skygazer_missions_v1';

export const RANKS: RankDefinition[] = [
  { id: 'cadet', title: 'Cadet', minCompletedMissions: 0 },
  { id: 'navigator', title: 'Navigator', minCompletedMissions: 2 },
  { id: 'observer', title: 'Observer', minCompletedMissions: 4 },
  { id: 'mission_specialist', title: 'Mission Specialist', minCompletedMissions: 5 },
  { id: 'skygazer_pro', title: 'SkyGazer Pro', minCompletedMissions: 6 },
];

export const BADGES: BadgeDefinition[] = [
  {
    id: 'badge_cadet',
    title: 'Cadet Badge',
    description: 'Completed observatory setup and read live Sun coordinates.',
    emoji: '🎖️',
  },
  {
    id: 'badge_agreement',
    title: 'Agreement Achieved',
    description: 'Client and server ephemeris agreed within 0.1°.',
    emoji: '🎯',
  },
  {
    id: 'badge_ar_navigator',
    title: 'AR Navigator',
    description: 'Safely locked a sky target in AR view.',
    emoji: '📡',
  },
  {
    id: 'badge_orbit_master',
    title: 'Orbit Master',
    description: 'Explored the 3D sky map and diurnal path.',
    emoji: '🪐',
  },
  {
    id: 'badge_lab_detective',
    title: 'Lab Detective',
    description: 'Processed a sky image in the CV Lab.',
    emoji: '🔬',
  },
  {
    id: 'badge_collector',
    title: 'Planet Collector',
    description: 'Discovered multiple bodies in AR scanner mode.',
    emoji: '🌌',
  },
];

export const MISSIONS: MissionDefinition[] = [
  {
    id: 'cadet_setup',
    title: 'Mission 1 — Cadet Setup',
    subtitle: 'Learn your observatory before AR.',
    steps: [
      { id: 'location', label: 'Set your location (GPS or manual in Calibration)' },
      { id: 'dashboard', label: 'Open the Solar Dashboard' },
      { id: 'live_sun', label: 'Watch live Azimuth & Altitude update for 3 seconds' },
    ],
    rewardBadgeId: 'badge_cadet',
    requires: [],
    suggestedTab: 'dashboard',
  },
  {
    id: 'math_agreement',
    title: 'Mission 2 — Math vs Server',
    subtitle: 'Compare browser math with NASA-grade Skyfield.',
    steps: [
      { id: 'compare_on', label: 'Enable server compare on the Dashboard' },
      { id: 'within_threshold', label: 'Keep client vs server difference under 0.1°' },
    ],
    rewardBadgeId: 'badge_agreement',
    requires: ['cadet_setup'],
    suggestedTab: 'dashboard',
  },
  {
    id: 'sky_scanner',
    title: 'Mission 3 — Sky Scanner',
    subtitle: 'Lock a target in AR (never look directly at the Sun).',
    steps: [
      { id: 'ar_lock', label: 'Achieve TARGET LOCKED on an above-horizon body' },
    ],
    rewardBadgeId: 'badge_ar_navigator',
    requires: ['cadet_setup'],
    suggestedTab: 'ar',
  },
  {
    id: 'orbit_master',
    title: 'Mission 4 — Orbit Master',
    subtitle: 'Fly the 3D celestial sphere.',
    steps: [
      { id: 'visit_3d', label: 'Open the 3D Space Map' },
    ],
    rewardBadgeId: 'badge_orbit_master',
    requires: ['cadet_setup'],
    suggestedTab: 'sky3d',
  },
  {
    id: 'lab_detective',
    title: 'Mission 5 — Lab Detective',
    subtitle: 'Run the OpenCV vision pipeline once.',
    steps: [
      { id: 'cv_process', label: 'Process an image in the CV Lab' },
    ],
    rewardBadgeId: 'badge_lab_detective',
    requires: ['math_agreement'],
    suggestedTab: 'cvlab',
  },
  {
    id: 'planet_collector',
    title: 'Mission 6 — Planet Collector',
    subtitle: 'Discover three different bodies in AR.',
    steps: [
      { id: 'discover_three', label: 'Lock or discover 3 unique celestial bodies' },
    ],
    rewardBadgeId: 'badge_collector',
    requires: ['sky_scanner'],
    suggestedTab: 'ar',
  },
];

export function getMissionById(id: string): MissionDefinition | undefined {
  return MISSIONS.find((m) => m.id === id);
}

export function getBadgeById(id: string): BadgeDefinition | undefined {
  return BADGES.find((b) => b.id === id);
}
