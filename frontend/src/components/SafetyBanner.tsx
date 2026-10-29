import { useState } from 'react';
import { AlertTriangle, X, ShieldAlert } from 'lucide-react';

export function SafetyBanner() {
  const [dismissed, setDismissed] = useState(false);

  if (dismissed) {
    return (
      <button
        onClick={() => setDismissed(false)}
        className="fixed bottom-4 right-4 z-50 flex items-center gap-2 bg-amber-500/20 border border-amber-500/40 text-amber-300 text-xs px-3 py-1.5 rounded-full backdrop-blur-md hover:bg-amber-500/30 transition shadow-lg"
        title="View Solar Eye Safety Warning"
      >
        <ShieldAlert className="w-3.5 h-3.5" />
        <span>Safety Warning</span>
      </button>
    );
  }

  return (
    <div className="bg-amber-950/80 border-b border-amber-500/30 text-amber-200 px-4 py-2.5 text-xs sm:text-sm flex items-center justify-between backdrop-blur-md z-40 transition-all">
      <div className="flex items-center gap-2.5 max-w-5xl mx-auto">
        <AlertTriangle className="w-4 h-4 sm:w-5 sm:h-5 text-amber-400 shrink-0" />
        <p className="leading-snug">
          <strong className="font-semibold text-amber-300">SOLAR SAFETY WARNING:</strong> Never look directly at the physical Sun through an unshielded smartphone camera, lens, or optical viewfinder without certified <span className="underline font-mono">ISO 12312-2</span> solar filters. Concentrated sunlight can permanently damage human retinas and camera CMOS sensors.
        </p>
      </div>
      <button
        onClick={() => setDismissed(true)}
        className="text-amber-400/80 hover:text-amber-200 p-1 rounded-md transition ml-2"
        aria-label="Dismiss warning banner"
      >
        <X className="w-4 h-4" />
      </button>
    </div>
  );
}
