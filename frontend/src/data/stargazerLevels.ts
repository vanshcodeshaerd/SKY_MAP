/** Stargazer XP tiers (FRONTEND_MASTER_SPEC). */

export interface StargazerLevelDefinition {
  id: string;
  title: string;
  minXp: number;
  maxXp: number | null;
}

export const STARGAZER_LEVELS: StargazerLevelDefinition[] = [
  { id: 'novice', title: 'Novice Stargazer', minXp: 0, maxXp: 199 },
  { id: 'apprentice', title: 'Night Sky Apprentice', minXp: 200, maxXp: 599 },
  { id: 'navigator', title: 'Solar Navigator', minXp: 600, maxXp: 1499 },
  { id: 'master', title: 'Master Astronomer', minXp: 1500, maxXp: null },
];

export function getStargazerLevel(xp: number): StargazerLevelDefinition {
  let current = STARGAZER_LEVELS[0];
  for (const level of STARGAZER_LEVELS) {
    if (xp >= level.minXp) current = level;
  }
  return current;
}

export function getStargazerLevelProgress(xp: number): {
  level: StargazerLevelDefinition;
  xpIntoLevel: number;
  xpForNext: number | null;
  pct: number;
} {
  const level = getStargazerLevel(xp);
  const xpIntoLevel = xp - level.minXp;
  const xpForNext =
    level.maxXp === null ? null : level.maxXp - level.minXp + 1;
  const pct =
    xpForNext === null
      ? 100
      : Math.min(100, Math.round((xpIntoLevel / xpForNext) * 100));
  return { level, xpIntoLevel, xpForNext, pct };
}
