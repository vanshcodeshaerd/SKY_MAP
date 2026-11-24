/** Full-sky constellation AR + connect-the-dots Play (same origin as main app). */

export function ConstellationPlayFrame({ onClose }: { onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[100] bg-black flex flex-col">
      <iframe
        title="Constellation Play"
        src="/constellations/"
        className="flex-1 w-full border-0"
        allow="camera; gyroscope; accelerometer; magnetometer; geolocation"
      />
      <button
        type="button"
        onClick={onClose}
        className="absolute top-[max(0.5rem,env(safe-area-inset-top))] left-3 z-[70] min-h-[40px] px-4 py-2 rounded-xl bg-slate-900/90 border border-slate-600 text-slate-100 text-xs font-semibold backdrop-blur-md shadow-lg"
      >
        ← Back to unified AR sky
      </button>
    </div>
  );
}