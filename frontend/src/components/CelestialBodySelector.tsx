import { CelestialBodyId, CELESTIAL_BODY_LIST } from '../types/astronomy';
import { CelestialCoordinates } from '../types/astronomy';
import { getPlanetThumbnail } from '../services/planetTextures';

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
    <div className="w-full overflow-x-auto pb-1 scrollbar-thin">
      <div className="flex items-center gap-1.5 min-w-max">
        {CELESTIAL_BODY_LIST.map((body) => {
          const isSelected = selectedBody === body.id;
          const pos = allPositions ? allPositions[body.id] : null;
          const isVisible = pos ? pos.isAboveHorizon : false;
          const thumbnailSrc = getPlanetThumbnail(body.id, 64);

          return (
            <button
              key={body.id}
              onClick={() => onSelectBody(body.id)}
              className={`min-h-[44px] px-2.5 py-1.5 rounded-md text-xs font-medium flex items-center gap-2.5 transition-colors border ${
                isSelected
                  ? 'bg-[#151c2a] border-amber-500/70 text-slate-100 ring-1 ring-amber-500/30'
                  : 'bg-[#0d121c] hover:bg-[#131926] border-orbit-border text-slate-300 hover:text-white'
              }`}
              title={`${body.name} (${body.category.replace('_', ' ')}): ${
                isVisible ? 'Above Horizon' : 'Sub-Horizon'
              }`}
            >
              {/* Realistic Planet Miniature Disc */}
              <div className="w-6 h-6 rounded-full overflow-hidden shrink-0 bg-black/40 flex items-center justify-center border border-white/10">
                {thumbnailSrc ? (
                  <img
                    src={thumbnailSrc}
                    alt={body.name}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                ) : (
                  <span className="text-xs select-none">{body.symbol}</span>
                )}
              </div>

              <div className="flex flex-col text-left leading-tight">
                <div className="flex items-center gap-1.5">
                  <span className="font-medium text-[11px] text-slate-200">{body.name}</span>
                  {/* Status Indicator Icon: text and shape distinguished */}
                  <span
                    className={`w-1.5 h-1.5 rounded-full shrink-0 ${
                      isVisible ? 'bg-emerald-400' : 'bg-slate-600'
                    }`}
                  />
                </div>
                {pos && (
                  <span
                    className={`font-mono tabular-nums text-[10px] ${
                      isVisible ? 'text-sky-300' : 'text-slate-500'
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
