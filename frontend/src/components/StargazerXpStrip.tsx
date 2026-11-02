import { Zap } from 'lucide-react';
import { useMissionProgressContext } from '../hooks/useMissionProgress';

export function StargazerXpStrip() {
  const { progress, xpLevelProgress } = useMissionProgressContext();
  const { level, pct } = xpLevelProgress;

  return (
    <div className="w-full max-w-2xl mx-auto mb-4 rounded-xl border border-violet-500/25 bg-[#111622]/90 px-4 py-3 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
        <div>
          <p className="text-[11px] uppercase tracking-wide text-violet-400/90 font-semibold flex items-center gap-1">
            <Zap className="w-3.5 h-3.5" />
            Stargazer XP
          </p>
          <p className="text-sm text-slate-100 font-medium">
            {level.title}
            <span className="text-slate-500 mx-2">·</span>
            <span className="text-violet-300 font-mono">{progress.stargazerXp} XP</span>
            {progress.dailyStreak > 1 && (
              <span className="text-amber-400/90 text-xs ml-2">🔥 {progress.dailyStreak}-day streak</span>
            )}
          </p>
        </div>
        <div className="flex items-center gap-2 min-w-[140px]">
          <div className="flex-1 h-2 rounded-full bg-slate-800 overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-violet-600 to-fuchsia-400 transition-all duration-500"
              style={{ width: `${pct}%` }}
            />
          </div>
          <span className="text-[11px] font-mono text-slate-400 w-8 text-right">{pct}%</span>
        </div>
      </div>
    </div>
  );
}
