import { useState } from 'react';
import { AlertTriangle, X, ShieldAlert } from 'lucide-react';

const STORAGE_KEY = 'skygazer_safety_banner_dismissed';

export function SafetyBanner() {
  const [dismissed, setDismissed] = useState(() => {
    try {
      return sessionStorage.getItem(STORAGE_KEY) === '1';
    } catch {
      return false;
    }
  });

  const dismiss = () => {
    setDismissed(true);
    try {
      sessionStorage.setItem(STORAGE_KEY, '1');
    } catch {
      /* ignore */
    }
  };

  const restore = () => {
    setDismissed(false);
    try {
      sessionStorage.removeItem(STORAGE_KEY);
    } catch {
      /* ignore */
    }
  };

  if (dismissed) {
    return (
      <button
        onClick={restore}
        className="fixed bottom-24 right-3 md:bottom-4 md:right-4 z-40 flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs px-3 py-1.5 rounded-full backdrop-blur-md hover:bg-amber-500/30 transition shadow-lg"
        title="View Solar Eye Safety Warning"
      >
        <ShieldAlert className="w-3.5 h-3.5" />
        <span>Safety</span>
      </button>
    );
  }

  return (
    <div className="relative z-40 w-full bg-amber-950 border-b border-amber-500/30 text-amber-200 px-3 py-2 sm:px-4 sm:py-2.5">
      <div className="max-w-7xl mx-auto flex items-start sm:items-center gap-2">
        <AlertTriangle className="w-4 h-4 mt-0.5 sm:mt-0 text-amber-400 shrink-0" />
        <p className="flex-1 min-w-0 text-[11px] sm:text-sm leading-snug">
          <strong className="font-semibold text-amber-300">SOLAR SAFETY: </strong>
          <span className="sm:hidden">Never point an unshielded phone camera at the Sun. Use ISO 12312-2 filters.</span>
          <span className="hidden sm:inline">
            Never look directly at the physical Sun through an unshielded smartphone camera, lens, or optical viewfinder without certified{' '}
            <span className="underline font-mono">ISO 12312-2</span> solar filters. Concentrated sunlight can permanently damage human retinas and camera CMOS sensors.
          </span>
        </p>
        <button
          onClick={dismiss}
          className="shrink-0 text-amber-400/80 hover:text-amber-200 p-1.5 -mr-1 rounded-md transition"
          aria-label="Dismiss warning banner"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
}
