import { useMissionProgressContext } from '../hooks/useMissionProgress';
import { isMissionUnlocked } from '../services/missionEngine';
import { getMissionById } from '../data/missions';

/**
 * Compact mission progress indicator (Step 1 foundation — expanded in Step 2).
 */
export function MissionProgressStrip() {
  const { rank, completedCount, totalMissions, nextMissionId, progress } =
    useMissionProgressContext();

  const nextMission = nextMissionId ? getMissionById(nextMissionId) : null;
  const nextUnlocked = nextMissionId ? isMissionUnlocked(progress, nextMissionId) : false;
  const pct = totalMissions > 0 ? Math.round((completedCount / totalMissions) * 100) : 0;

  return (
    <div className="w-full max-w-2xl mx-auto mb-5 rounded-xl border border-amber-500/25 bg-orbit-card/90 px-4 py-3 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-amber-400/90 font-semibold">
            Mission progress
          </p>
          <p className="text-sm text-slate-100 font-medium">
            Rank: <span className="text-amber-300">{rank.title}</span>
            <span className="text-slate-500 mx-2">·</span>
            {completedCount}/{totalMissions} missions
          </p>
        </div>
        <div className="flex items-center gap-2 min-w-[140px]">
          <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-amber-500 to-amber-300 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[11px] font-mono text-slate-400 w-8 text-right">{pct}%</span>
        </div>
      </div>

      {nextMission && nextUnlocked ? (
        <p className="mt-2 text-xs text-slate-400">
          Active: <span className="text-sky-300">{nextMission.title}</span> — see checklist below
        </p>
      ) : completedCount >= totalMissions ? (
        <p className="mt-2 text-xs text-emerald-400">All missions complete — SkyGazer Pro!</p>
      ) : null}

      {progress.earnedBadgeIds.length > 0 && (
        <p className="mt-1.5 text-[11px] text-slate-500">
          Badges earned: {progress.earnedBadgeIds.length} (saved on this device only)
        </p>
      )}
    </div>
  );
}
