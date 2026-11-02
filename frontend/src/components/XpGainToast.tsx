import { Sparkles } from 'lucide-react';
import { useMissionProgressContext } from '../hooks/useMissionProgress';

export function XpGainToast() {
  const { lastXpGain, clearLastXpGain } = useMissionProgressContext();

  if (!lastXpGain) return null;

  return (
    <div className="fixed top-36 left-1/2 -translate-x-1/2 z-[100] animate-fade-in">
      <div className="rounded-xl border border-violet-500/50 bg-slate-950/95 backdrop-blur-md shadow-2xl px-4 py-2 flex items-center gap-2">
        <Sparkles className="w-4 h-4 text-violet-400" />
        <span className="text-sm font-semibold text-violet-200">+{lastXpGain.amount} XP</span>
        <span className="text-xs text-slate-400">{lastXpGain.reason}</span>
        <button
          type="button"
          onClick={clearLastXpGain}
          className="text-slate-500 hover:text-white text-xs ml-2"
        >
          OK
        </button>
      </div>
    </div>
  );
}
