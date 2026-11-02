import { getMissionById, getBadgeById } from '../data/missions';
import { getMissionDebrief } from '../data/missionDebriefs';
import type { MissionId } from '../types/missions';

interface MissionCompleteToastProps {
  missionIds: MissionId[];
  onDismiss: () => void;
}

export function MissionCompleteToast({ missionIds, onDismiss }: MissionCompleteToastProps) {
  if (missionIds.length === 0) return null;

  const mission = getMissionById(missionIds[missionIds.length - 1]);
  const badge = mission ? getBadgeById(mission.rewardBadgeId) : undefined;
  const debrief = mission ? getMissionDebrief(mission.id) : null;

  return (
    <div className="fixed top-20 left-1/2 -translate-x-1/2 z-[100] max-w-md w-[92vw] animate-fade-in">
      <div className="rounded-xl border border-emerald-500/50 bg-slate-950/95 backdrop-blur-md shadow-2xl px-4 py-3 flex items-start gap-3">
        <span className="text-2xl">{badge?.emoji ?? '🎉'}</span>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-semibold text-emerald-300">Mission complete!</p>
          <p className="text-xs text-slate-200 truncate">{mission?.title}</p>
          {badge && (
            <p className="text-[11px] text-slate-400 mt-0.5">
              Earned: {badge.title} — {badge.description}
            </p>
          )}
          {debrief && (
            <p className="text-[11px] text-slate-500 mt-2 leading-relaxed border-t border-slate-800 pt-2">
              {debrief}
            </p>
          )}
        </div>
        <button
          type="button"
          onClick={onDismiss}
          className="text-slate-400 hover:text-white text-xs shrink-0 px-2 py-1"
        >
          OK
        </button>
      </div>
    </div>
  );
}
