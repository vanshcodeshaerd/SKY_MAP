import { CELESTIAL_BODY_LIST } from '../types/astronomy';
import { useMissionProgressContext } from '../hooks/useMissionProgress';
import { getPlanetThumbnail } from '../services/planetTextures';

export function CollectionBook() {
  const { progress } = useMissionProgressContext();
  const discovered = new Set(progress.discoveredBodyIds);

  return (
    <div className="w-full max-w-3xl mx-auto mb-6 rounded-xl border border-orbit-border bg-orbit-card/80 p-4">
      <p className="text-xs font-semibold text-slate-200 mb-1">Planet collection book</p>
      <p className="text-[11px] text-slate-500 mb-3">
        Discover bodies in AR (TARGET LOCKED). {discovered.size}/{CELESTIAL_BODY_LIST.length}{' '}
        logged on this device.
      </p>
      <div className="grid grid-cols-3 sm:grid-cols-5 gap-2">
        {CELESTIAL_BODY_LIST.map((b) => {
          const found = discovered.has(b.id);
          return (
            <div
              key={b.id}
              className={`flex flex-col items-center gap-1 p-2 rounded-lg border text-center transition ${
                found
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : 'border-slate-800 bg-slate-950/50 opacity-50 grayscale'
              }`}
              title={found ? `Discovered: ${b.name}` : `Not yet discovered: ${b.name}`}
            >
              <img
                src={getPlanetThumbnail(b.id, 48)}
                alt={b.name}
                className="w-8 h-8 object-contain"
              />
              <span className="text-[10px] font-medium text-slate-300">{b.name}</span>
            </div>
          );
        })}
      </div>
    </div>
  );
}
