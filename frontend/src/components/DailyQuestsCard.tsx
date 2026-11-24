import { ListChecks, CheckCircle2, Crosshair } from 'lucide-react';
import { CELESTIAL_BODIES } from '../types/astronomy';
import { useMissionProgressContext } from '../hooks/useMissionProgress';
import type { CelestialBodyId } from '../types/astronomy';

interface DailyQuestsCardProps {
  onStartQuestAr: (bodyId: CelestialBodyId) => void;
  onOpenDashboard: () => void;
}

export function DailyQuestsCard({ onStartQuestAr, onOpenDashboard }: DailyQuestsCardProps) {
  const { dailyQuests, isDailyQuestComplete } = useMissionProgressContext();

  if (dailyQuests.length === 0) return null;

  const doneCount = dailyQuests.filter((q) => isDailyQuestComplete(q.id)).length;

  return (
    <div className="w-full max-w-3xl mx-auto mb-5 rounded-xl border border-violet-500/30 bg-gradient-to-br from-violet-950/30 to-[#0c1018] p-4 shadow-lg">
      <p className="text-[11px] uppercase tracking-wide text-violet-400 font-semibold flex items-center gap-1.5 mb-2">
        <ListChecks className="w-3.5 h-3.5" />
        Daily alignment quests ({doneCount}/{dailyQuests.length})
      </p>
      <ul className="space-y-2">
        {dailyQuests.map((quest) => {
          const done = isDailyQuestComplete(quest.id);
          const meta = quest.bodyId ? CELESTIAL_BODIES[quest.bodyId] : null;
          return (
            <li
              key={quest.id}
              className={`flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 rounded-lg border px-3 py-2 ${
                done
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : 'border-slate-800 bg-slate-950/40'
              }`}
            >
              <div className="min-w-0">
                <p className="text-sm font-medium text-slate-100 flex items-center gap-2">
                  {done ? (
                    <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  ) : (
                    <Crosshair className="w-4 h-4 text-violet-400 shrink-0" />
                  )}
                  {meta && (
                    <span style={{ color: meta.color }} className="text-xs">
                      {meta.symbol}
                    </span>
                  )}
                  {quest.title}
                </p>
                <p className="text-[11px] text-slate-500 mt-0.5">{quest.description}</p>
              </div>
              <div className="flex items-center gap-2 shrink-0">
                <span className="text-[10px] font-mono text-violet-300">+{quest.xpReward} XP</span>
                {!done && quest.kind === 'align_hold' && quest.bodyId && (
                  <button
                    type="button"
                    onClick={() => onStartQuestAr(quest.bodyId!)}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-violet-600 hover:bg-violet-500 text-white font-semibold"
                  >
                    AR
                  </button>
                )}
                {!done && quest.kind === 'compare_math' && (
                  <button
                    type="button"
                    onClick={onOpenDashboard}
                    className="text-[11px] px-2.5 py-1 rounded-lg bg-emerald-700 hover:bg-emerald-600 text-white font-semibold"
                  >
                    Dashboard
                  </button>
                )}
              </div>
            </li>
          );
        })}
      </ul>
    </div>
  );
}
