import { CelestialBodyId, CELESTIAL_BODY_LIST } from '../types/astronomy';
import { CelestialCoordinates } from '../types/astronomy';

interface CelestialBodySelectorProps {
  selectedBody: CelestialBodyId;
  onSelectBody: (body: CelestialBodyId) => void;
  allPositions?: Record<CelestialBodyId, CelestialCoordinates>;
}

export function CelestialBodySelector({
  selectedBody,
  onSelectBody,
  allPositions,
}: CelestialBodySelectorProps) {
  return (
    <div className="w-full overflow-x-auto pb-1 scrollbar-thin scrollbar-thumb-slate-800 scrollbar-track-transparent">
      <div className="flex items-center gap-2 min-w-max">
        {CELESTIAL_BODY_LIST.map((body) => {
          const isSelected = selectedBody === body.id;
          const pos = allPositions ? allPositions[body.id] : null;
          const isVisible = pos ? pos.isAboveHorizon : false;

          return (
            <button
              key={body.id}
              onClick={() => onSelectBody(body.id)}
              className={`px-3 py-2 rounded-xl text-xs font-medium flex items-center gap-2.5 transition-all duration-200 border ${
                isSelected
                  ? 'bg-gradient-to-r from-slate-900 to-slate-850 border-amber-500/80 text-white shadow-lg shadow-amber-500/10 ring-1 ring-amber-500/40'
                  : 'bg-slate-950/60 hover:bg-slate-900 border-slate-800/80 text-slate-300 hover:text-white'
              }`}
            >
              <span className="text-base select-none leading-none">{body.symbol}</span>
              <div className="flex flex-col text-left">
                <div className="flex items-center gap-1.5">
                  <span className="font-semibold">{body.name}</span>
                  {/* Status dot: green if above horizon */}
                  <span
                    className={`w-1.5 h-1.5 rounded-full ${
                      isVisible ? 'bg-emerald-400 shadow-sm shadow-emerald-400/50' : 'bg-slate-600'
                    }`}
                    title={isVisible ? 'Currently above horizon (visible in sky)' : 'Currently below horizon'}
                  />
                </div>
                {pos && (
                  <span
                    className={`font-mono text-[10px] ${
                      isVisible ? 'text-amber-300' : 'text-slate-500'
                    }`}
                  >
                    {pos.altitudeDeg >= 0 ? '+' : ''}
                    {pos.altitudeDeg.toFixed(1)}°
                  </span>
                )}
              </div>
            </button>
          );
        })}
      </div>
    </div>
  );
}
