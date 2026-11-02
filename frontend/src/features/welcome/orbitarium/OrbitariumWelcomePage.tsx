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

/**
 * One layout everywhere: starfield + solar system full screen, welcome copy on the left.
 * Planet facts appear as plain text in the copy column when you tap a world or a pill.
 */
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

  return (
    <>
      <div className="orbitarium-root relative h-[100dvh] min-h-[100dvh] w-full overflow-hidden bg-orbit-background text-orbit-foreground font-welcome-body">
        <div className="welcome-earth-glow pointer-events-none hidden sm:block" aria-hidden />

        <OrbitariumSolarViewport
          selected={selected}
          onSelect={setSelected}
          speed={speed}
          onSpeedChange={setSpeed}
          layout={layout}
          fullBleed
        />

        <div
          className="welcome-copy-slot absolute inset-y-0 left-0 z-10 w-[54%] max-w-xl overflow-y-auto overscroll-y-contain touch-pan-y pointer-events-auto sm:w-[50%] lg:w-[46%]"
          style={{ background: 'transparent' }}
        >
          <div className="space-y-5 px-4 py-6 pb-[max(1rem,env(safe-area-inset-bottom))] sm:space-y-6 sm:px-6 sm:py-8 lg:pl-10 xl:pl-[clamp(2rem,6vw,5rem)] min-h-full flex flex-col justify-center">
            <header className="space-y-3 sm:space-y-4">
              <div className="flex items-center gap-3">
                <p className="text-[10px] sm:text-[11px] font-mono uppercase tracking-[0.35em] text-amber-400 font-semibold shrink-0">
                  SkyMap AR
                </p>
                <span className="welcome-brand-rule hidden sm:block" aria-hidden />
              </div>

              <h1 className="font-bold tracking-tight text-white leading-[1.08] text-[clamp(1.5rem,4.2vw,3.75rem)]">
                Explore the
                <span className="hidden sm:inline">
                  <br />
                </span>{' '}
                <span className="welcome-hero-accent">Solar System</span>
                <span className="hidden sm:inline">
                  <br />
                  in Augmented Reality
                </span>
                <span className="sm:hidden"> in AR</span>
              </h1>

              <p className="max-w-md text-[13px] sm:text-[15px] leading-relaxed text-slate-300">
                Interactive observatory and 3D map. Choose a planet on the right — facts show here
                as plain text.
              </p>
            </header>

            <div className="flex flex-wrap items-center gap-2">
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="welcome-cta-primary inline-flex items-center gap-2 rounded-full px-4 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-semibold min-h-[44px] shadow-lg shadow-amber-500/20"
              >
                <Telescope className="w-4 h-4 shrink-0" strokeWidth={2.25} />
                Enter Observatory
              </button>
              <button
                type="button"
                onClick={() => onNavigate('sky3d')}
                className="inline-flex items-center gap-1.5 rounded-full border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-xs font-medium text-amber-300 min-h-[44px]"
              >
                <Compass className="w-3.5 h-3.5 shrink-0" />
                3D Map
              </button>
              <button
                type="button"
                onClick={() => onNavigate('ar')}
                className="inline-flex items-center gap-1.5 rounded-full border border-sky-500/30 bg-sky-500/10 px-3 py-2 text-xs font-medium text-sky-300 min-h-[44px]"
              >
                <Camera className="w-3.5 h-3.5 shrink-0" />
                AR View
              </button>
              <button
                type="button"
                onClick={() => setMissionHubOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-white/25 bg-white/5 px-3 py-2 text-xs font-medium min-h-[44px]"
              >
                <Rocket className="w-3.5 h-3.5 shrink-0 text-orbit-primary" />
                Missions
              </button>
            </div>

            {selected ? (
              <section className="space-y-2 sm:space-y-3 animate-fade-in text-left" aria-live="polite">
                <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.28em] text-orbit-primary">
                  {selected.type}
                </p>
                <h2 className="font-bold tracking-tight text-white text-lg sm:text-2xl lg:text-3xl">
                  {selected.name}
                </h2>
                <p className="text-xs sm:text-sm leading-relaxed text-orbit-muted-foreground">
                  {selected.description}
                </p>
                <dl className="grid grid-cols-2 gap-x-2 gap-y-2 sm:gap-x-3 text-xs sm:text-sm">
                  {selected.facts.map((f) => (
                    <div key={f.label}>
                      <dt className="text-orbit-muted-foreground text-[10px] sm:text-xs">{f.label}</dt>
                      <dd className="font-medium tabular-nums mt-0.5">{f.value}</dd>
                    </div>
                  ))}
                </dl>
                {TRACKABLE.has(selected.name) && (
                  <button
                    type="button"
                    onClick={() => onOpenBodyInAr(selected.name as CelestialBodyId)}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-white/25 bg-white/5 px-4 py-2 text-xs sm:text-sm font-medium min-h-[44px]"
                  >
                    <Camera className="w-4 h-4" />
                    Track in AR
                  </button>
                )}
              </section>
            ) : (
              <p className="text-[11px] sm:text-xs text-orbit-muted-foreground/80 max-w-sm">
                Tap a planet in the sky or use the labels on the right.
              </p>
            )}
          </div>
        </div>
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
