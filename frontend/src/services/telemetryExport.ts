import type { GeodeticLocation } from '../types/astronomy';
import type { MissionProgressState } from '../types/missions';

export function buildProgressCsv(
  progress: MissionProgressState,
  location: GeodeticLocation,
  extras: {
    rankTitle: string;
    dailyChallengeDate: string | null;
    dailyChallengeCompleted: boolean;
  }
): string {
  const rows: string[] = [
    'field,value',
    `exported_at,${new Date().toISOString()}`,
    `rank,${extras.rankTitle}`,
    `missions_completed,${progress.completedMissionIds.length}`,
    `missions_list,"${progress.completedMissionIds.join('; ')}"`,
    `badges,"${progress.earnedBadgeIds.join('; ')}"`,
    `discovered_bodies,"${progress.discoveredBodyIds.join('; ')}"`,
    `daily_challenge_date,${extras.dailyChallengeDate ?? ''}`,
    `daily_challenge_complete,${extras.dailyChallengeCompleted}`,
    `observer_lat,${location.latitude}`,
    `observer_lon,${location.longitude}`,
    `observer_elevation_m,${location.elevationM}`,
  ];
  return rows.join('\n');
}

export function downloadTextFile(filename: string, content: string, mime = 'text/csv') {
  const blob = new Blob([content], { type: mime });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = filename;
  a.click();
  URL.revokeObjectURL(url);
}
