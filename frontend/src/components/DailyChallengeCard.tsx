import { Calendar, Target, CheckCircle2, Rocket } from 'lucide-react';
import { CELESTIAL_BODIES } from '../types/astronomy';
import { useMissionProgressContext } from '../hooks/useMissionProgress';
import type { CelestialBodyId } from '../types/astronomy';

interface DailyChallengeCardProps {
  onStartChallenge: (bodyId: CelestialBodyId) => void;
}

export function DailyChallengeCard({ onStartChallenge }: DailyChallengeCardProps) {
  const { dailyChallenge, isDailyChallengeDoneToday } = useMissionProgressContext();

  if (!dailyChallenge) return null;

  const meta = CELESTIAL_BODIES[dailyChallenge.bodyId];

  return (
    <div className="w-full max-w-3xl mx-auto mb-5 rounded-xl border border-sky-500/30 bg-gradient-to-br from-sky-950/40 to-[#0c1018] p-4 shadow-lg">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-1">
          <p className="text-[11px] uppercase tracking-wide text-sky-400 font-semibold flex items-center gap-1.5">
            <Calendar className="w-3.5 h-3.5" />
            Today&apos;s sky challenge
          </p>
          <h3 className="text-base font-semibold text-white flex items-center gap-2">
            <span style={{ color: meta.color }}>{meta.symbol}</span>
            Find {dailyChallenge.bodyName} in AR
          </h3>
          <p className="text-xs text-slate-400">{dailyChallenge.hint}</p>
          {!dailyChallenge.isAboveHorizon && (
            <p className="text-[11px] text-amber-400/90">
              Tip: enable sub-horizon planets in AR layers, or come back when it rises.
            </p>
          )}
        </div>

        {isDailyChallengeDoneToday ? (
          <div className="flex items-center gap-2 px-3 py-2 rounded-lg bg-emerald-500/10 border border-emerald-500/40 text-emerald-300 text-sm font-medium">
            <CheckCircle2 className="w-4 h-4" />
            Done today!
          </div>
        ) : (
          <button
            type="button"
            onClick={() => onStartChallenge(dailyChallenge.bodyId)}
            className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-sm font-bold transition shadow-lg shadow-sky-900/40"
          >
            <Rocket className="w-4 h-4" />
            Start in AR
          </button>
        )}
      </div>

      {!isDailyChallengeDoneToday && (
        <p className="mt-2 text-[10px] text-slate-500 flex items-center gap-1">
          <Target className="w-3 h-3" />
          Lock onto {dailyChallenge.bodyName} with TARGET LOCKED (never look directly at the Sun).
        </p>
      )}
    </div>
  );
}
