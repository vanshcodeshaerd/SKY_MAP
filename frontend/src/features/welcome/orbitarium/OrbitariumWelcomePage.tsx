import { useState } from 'react';
import { Camera, Compass, Rocket, Telescope, X } from 'lucide-react';
import type { CelestialBodyId } from '../../../types/astronomy';
import { MissionProgressStrip } from '../../../components/MissionProgressStrip';
import { StargazerXpStrip } from '../../../components/StargazerXpStrip';
import { SafetyQuizCard } from '../../../components/SafetyQuizCard';
import { DailyChallengeCard } from '../../../components/DailyChallengeCard';
import { DailyQuestsCard } from '../../../components/DailyQuestsCard';
import { MissionControlPanel } from '../../../components/MissionControlPanel';
import { CollectionBook } from '../../../components/CollectionBook';
import { OrbitariumSolarViewport } from './OrbitariumSolarViewport';
import { WelcomeMobileDock } from './WelcomeMobileDock';
import { useWelcomeViewportLayout } from './useWelcomeViewportLayout';
import type { OrbitariumInfo } from './planets';

type AppTab = 'dashboard' | 'sky3d' | 'ar' | 'cvlab';

const TRACKABLE = new Set<string>([
  'Sun',
  'Moon',
  'Mercury',
  'Venus',
  'Mars',
  'Jupiter',
  'Saturn',
  'Uranus',
  'Neptune',
]);

interface OrbitariumWelcomePageProps {
  onNavigate: (tab: AppTab) => void;
  onOpenBodyInAr: (bodyId: CelestialBodyId) => void;
  onStartDailyChallenge: (bodyId: CelestialBodyId) => void;
  onStartQuestAr: (bodyId: CelestialBodyId) => void;
}

export function OrbitariumWelcomePage({
  onNavigate,
  onOpenBodyInAr,
  onStartDailyChallenge,
  onStartQuestAr,
}: OrbitariumWelcomePageProps) {
  const [missionHubOpen, setMissionHubOpen] = useState(false);
  const [selected, setSelected] = useState<OrbitariumInfo | null>(null);
  const [speed, setSpeed] = useState(1);
  const layout = useWelcomeViewportLayout();
  const stacked = layout.tier !== 'desktop';

  return (
    <>
      <div
        className={`orbitarium-root w-full overflow-hidden bg-orbit-background text-orbit-foreground font-welcome-body ${
          stacked ? 'flex h-[100dvh] flex-col' : 'relative h-[100dvh] min-h-[100dvh]'
        }`}
      >
        {!stacked && <div className="welcome-earth-glow hidden sm:block" aria-hidden />}

        {/* Mobile / tablet: compact header — no scroll over the 3D scene */}
        {stacked && (
          <header className="shrink-0 z-20 px-4 pt-[max(0.75rem,env(safe-area-inset-top))] pb-3 bg-gradient-to-b from-orbit-background via-orbit-background/90 to-orbit-background/0">
            <p className="text-[10px] uppercase tracking-[0.35em] text-orbit-primary font-semibold">SkyMap AR</p>
            <h1 className="mt-1 text-[clamp(1.35rem,5.5vw,1.85rem)] font-bold leading-tight text-white">
              Explore the <span className="welcome-hero-accent">Solar System</span>
            </h1>
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="welcome-cta-primary mt-3 w-full flex items-center justify-center gap-2 rounded-2xl py-3.5 text-base font-semibold min-h-[52px] shadow-lg shadow-amber-500/15"
            >
              <Telescope className="w-5 h-5" />
              Enter Observatory
            </button>
            <div className="mt-2 grid grid-cols-3 gap-2">
              <button
                type="button"
                onClick={() => onNavigate('sky3d')}
                className="min-h-[44px] rounded-xl border border-orbit-border bg-orbit-card/80 text-xs font-medium text-orbit-foreground flex flex-col items-center justify-center gap-0.5"
              >
                <Compass className="w-4 h-4 text-orbit-primary" />
                3D Map
              </button>
              <button
                type="button"
                onClick={() => onNavigate('ar')}
                className="min-h-[44px] rounded-xl border border-orbit-border bg-orbit-card/80 text-xs font-medium text-orbit-foreground flex flex-col items-center justify-center gap-0.5"
              >
                <Camera className="w-4 h-4 text-sky-400" />
                AR Sky
              </button>
              <button
                type="button"
                onClick={() => setMissionHubOpen(true)}
                className="min-h-[44px] rounded-xl border border-orbit-border bg-orbit-card/80 text-xs font-medium text-orbit-foreground flex flex-col items-center justify-center gap-0.5"
              >
                <Rocket className="w-4 h-4 text-orbit-primary" />
                Missions
              </button>
            </div>
          </header>
        )}

        {/* Solar system — full bleed on desktop; dedicated middle band on mobile */}
        <div className={stacked ? 'relative flex-1 min-h-[36dvh]' : 'absolute inset-0'}>
          <OrbitariumSolarViewport
            selected={selected}
            onSelect={setSelected}
            speed={speed}
            onSpeedChange={setSpeed}
            layout={layout}
            fullBleed={!stacked}
            embedded={stacked}
          />
        </div>

        {stacked && (
          <WelcomeMobileDock
            selected={selected}
            onSelect={setSelected}
            speed={speed}
            onSpeedChange={setSpeed}
            trackable={TRACKABLE}
            onOpenBodyInAr={onOpenBodyInAr}
          />
        )}

        {/* Desktop: floating copy on the left */}
        {!stacked && (
          <div
            className="absolute inset-y-0 left-0 z-10 flex w-[min(100%,46%)] max-w-xl items-center overflow-y-auto overscroll-y-contain touch-pan-y pointer-events-auto"
            style={{ background: 'transparent' }}
          >
            <div className="welcome-copy-slot space-y-6 px-5 py-8 sm:px-8 sm:py-10 lg:pl-10 xl:pl-[clamp(2rem,6vw,5rem)]">
              <header className="space-y-4">
                <div className="flex items-center gap-3">
                  <p className="text-[11px] font-mono uppercase tracking-[0.35em] text-amber-400 font-semibold shrink-0">
                    SkyMap AR
                  </p>
                  <span className="welcome-brand-rule hidden sm:block" aria-hidden />
                </div>
                <h1 className="font-bold tracking-tight text-white leading-[1.06] text-[clamp(2.25rem,4.5vw,3.75rem)]">
                  Explore the
                  <br />
                  <span className="welcome-hero-accent">Solar System</span>
                  <br />
                  in Augmented Reality
                </h1>
                <p className="max-w-md text-[15px] leading-relaxed text-slate-300">
                  Interactive observatory and 3D map. Tap a planet to learn more.
                </p>
              </header>

              <div className="flex flex-wrap items-center gap-2 sm:gap-3">
                <button
                  type="button"
                  onClick={() => onNavigate('dashboard')}
                  className="welcome-cta-primary inline-flex items-center gap-2 rounded-full px-6 py-3 text-sm font-semibold min-h-[48px] shadow-lg shadow-amber-500/20"
                >
                  <Telescope className="w-4 h-4" strokeWidth={2.25} />
                  Enter Observatory
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('sky3d')}
                  className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3.5 py-2 text-xs font-medium text-amber-300 min-h-[44px]"
                >
                  <Compass className="w-3.5 h-3.5 shrink-0" />
                  3D Map
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate('ar')}
                  className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3.5 py-2 text-xs font-medium text-sky-300 min-h-[44px]"
                >
                  <Camera className="w-3.5 h-3.5 shrink-0" />
                  AR View
                </button>
                <button
                  type="button"
                  onClick={() => setMissionHubOpen(true)}
                  className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/5 px-3.5 py-2 text-xs font-medium min-h-[44px]"
                >
                  <Rocket className="w-3.5 h-3.5 shrink-0 text-orbit-primary" />
                  Missions
                </button>
              </div>

              {selected ? (
                <section className="space-y-3 animate-fade-in">
                  <p className="text-[10px] uppercase tracking-[0.28em] text-orbit-primary">{selected.type}</p>
                  <h2 className="font-bold text-white text-2xl lg:text-3xl">{selected.name}</h2>
                  <p className="text-sm text-orbit-muted-foreground leading-relaxed">{selected.description}</p>
                  <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-sm">
                    {selected.facts.map((f) => (
                      <div key={f.label}>
                        <dt className="text-orbit-muted-foreground text-xs">{f.label}</dt>
                        <dd className="font-medium tabular-nums">{f.value}</dd>
                      </div>
                    ))}
                  </dl>
                  {TRACKABLE.has(selected.name) && (
                    <button
                      type="button"
                      onClick={() => onOpenBodyInAr(selected.name as CelestialBodyId)}
                      className="inline-flex items-center gap-2 rounded-full border border-white/25 px-4 py-2.5 text-sm min-h-[44px]"
                    >
                      <Camera className="w-4 h-4" />
                      Track in AR
                    </button>
                  )}
                </section>
              ) : (
                <p className="text-xs text-orbit-muted-foreground/80 max-w-sm">
                  Tap a planet on the right to see facts here.
                </p>
              )}
            </div>
          </div>
        )}
      </div>

      {missionHubOpen && (
        <div className="fixed inset-0 z-[60] flex justify-end">
          <button
            type="button"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            aria-label="Close mission hub"
            onClick={() => setMissionHubOpen(false)}
          />
          <div className="relative w-full max-w-lg h-full bg-orbit-background border-l border-orbit-border shadow-2xl overflow-y-auto p-4 pt-14">
            <button
              type="button"
              onClick={() => setMissionHubOpen(false)}
              className="absolute top-3 right-3 p-2 rounded-lg hover:bg-orbit-elevated text-orbit-muted-foreground"
            >
              <X className="w-5 h-5" />
            </button>
            <h2 className="text-lg font-semibold text-white flex items-center gap-2 mb-4">
              <Rocket className="w-5 h-5 text-amber-400" />
              Mission hub
            </h2>
            <MissionProgressStrip />
            <StargazerXpStrip />
            <SafetyQuizCard />
            <DailyChallengeCard onStartChallenge={onStartDailyChallenge} />
            <DailyQuestsCard
              onStartQuestAr={onStartQuestAr}
              onOpenDashboard={() => onNavigate('dashboard')}
            />
            <MissionControlPanel onNavigate={onNavigate} />
            <CollectionBook />
          </div>
        </div>
      )}
    </>
  );
}
