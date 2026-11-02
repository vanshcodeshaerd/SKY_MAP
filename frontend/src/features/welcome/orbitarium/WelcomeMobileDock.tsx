import { Camera } from 'lucide-react';
import type { CelestialBodyId } from '../../../types/astronomy';
import {
  ORBITARIUM_PLANETS,
  ORBITARIUM_SUN,
  type OrbitariumInfo,
  type OrbitariumPlanet,
} from './planets';

const NAV_ITEMS: OrbitariumInfo[] = [
  ORBITARIUM_SUN,
  ...ORBITARIUM_PLANETS.map((p: OrbitariumPlanet) => ({
    name: p.name,
    type: p.type,
    description: p.description,
    facts: p.facts,
  })),
];

interface WelcomeMobileDockProps {
  selected: OrbitariumInfo | null;
  onSelect: (info: OrbitariumInfo | null) => void;
  speed: number;
  onSpeedChange: (speed: number) => void;
  trackable: Set<string>;
  onOpenBodyInAr: (bodyId: CelestialBodyId) => void;
}

/** Bottom planet picker + facts — large targets, no overlap with the 3D view. */
export function WelcomeMobileDock({
  selected,
  onSelect,
  speed,
  onSpeedChange,
  trackable,
  onOpenBodyInAr,
}: WelcomeMobileDockProps) {
  return (
    <div
      className="shrink-0 z-20 border-t border-orbit-border/60 bg-orbit-background/95 backdrop-blur-md pb-[max(0.5rem,env(safe-area-inset-bottom))]"
      role="region"
      aria-label="Planet explorer"
    >
      <p className="px-4 pt-2 text-[11px] text-orbit-muted-foreground text-center">
        Pick a planet · drag the sky to spin · use +/− to zoom
      </p>

      <div className="flex gap-2 overflow-x-auto px-3 py-2 scrollbar-none snap-x snap-mandatory">
        {NAV_ITEMS.map((p) => {
          const active = selected?.name === p.name;
          return (
            <button
              key={p.name}
              type="button"
              onClick={() => onSelect(active ? null : p)}
              className={`snap-start shrink-0 min-h-[44px] rounded-full px-4 py-2 text-sm font-medium transition ${
                active
                  ? 'bg-orbit-primary text-orbit-primary-foreground shadow-md'
                  : 'bg-orbit-card border border-orbit-border text-orbit-foreground'
              }`}
              aria-pressed={active}
            >
              {p.name}
            </button>
          );
        })}
      </div>

      <label className="flex items-center justify-center gap-2 px-4 pb-1 text-[11px] text-orbit-muted-foreground">
        Orbit speed
        <input
          type="range"
          min={0}
          max={5}
          step={0.1}
          value={speed}
          onChange={(e) => onSpeedChange(+e.target.value)}
          className="accent-orbit-primary w-28 min-h-[44px]"
          aria-label="Orbit animation speed"
        />
      </label>

      {selected && (
        <div className="mx-3 mb-2 max-h-[34vh] overflow-y-auto overscroll-y-contain rounded-2xl border border-orbit-border/50 bg-orbit-card/80 p-4 space-y-2 animate-fade-in">
          <p className="text-[10px] uppercase tracking-widest text-orbit-primary">{selected.type}</p>
          <h2 className="text-xl font-bold text-orbit-foreground">{selected.name}</h2>
          <p className="text-sm text-orbit-muted-foreground leading-relaxed">{selected.description}</p>
          <dl className="grid grid-cols-2 gap-2 text-xs">
            {selected.facts.slice(0, 4).map((f) => (
              <div key={f.label}>
                <dt className="text-orbit-muted-foreground">{f.label}</dt>
                <dd className="font-medium tabular-nums">{f.value}</dd>
              </div>
            ))}
          </dl>
          {trackable.has(selected.name) && (
            <button
              type="button"
              onClick={() => onOpenBodyInAr(selected.name as CelestialBodyId)}
              className="w-full flex items-center justify-center gap-2 min-h-[48px] rounded-xl bg-orbit-primary/90 text-orbit-primary-foreground text-sm font-semibold"
            >
              <Camera className="w-4 h-4" />
              Track in AR
            </button>
          )}
        </div>
      )}
    </div>
  );
}
