import { useState } from 'react';
import { Camera, Rocket, Telescope, X } from 'lucide-react';
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

/** One canvas + starfield behind the whole page; copy floats left, solar system on the right. */
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
        <div className="welcome-earth-glow pointer-events-none" aria-hidden />

        <OrbitariumSolarViewport
          selected={selected}
          onSelect={setSelected}
          speed={speed}
          onSpeedChange={setSpeed}
          layout={layout}
          fullBleed
        />

        <div
          className="welcome-copy-slot absolute inset-y-0 left-0 z-10 flex max-w-2xl items-center overflow-y-auto overscroll-y-contain touch-pan-y pointer-events-auto pt-[max(0.5rem,env(safe-area-inset-top))] pb-[max(0.75rem,env(safe-area-inset-bottom))]"
          style={{
            width: `${layout.copyWidthPercent}%`,
            background: 'transparent',
          }}
        >
          <div className="space-y-6 px-5 py-6 sm:space-y-7 sm:px-8 sm:py-8 lg:pl-12 xl:pl-[clamp(2.5rem,7vw,6rem)] w-full">
            <header className="space-y-4 sm:space-y-5">
              <div className="flex items-center gap-3">
                <p className="text-[10px] sm:text-[11px] uppercase tracking-[0.45em] text-orbit-primary shrink-0 font-semibold">
                  SkyMap AR
                </p>
                <span className="welcome-brand-rule hidden min-[420px]:block" aria-hidden />
              </div>

              <h1 className="font-welcome-serif text-[clamp(1.35rem,5.5vw,3.25rem)] leading-[1.12] text-orbit-foreground">
                Explore the
                <br />
                <span className="welcome-hero-accent">Solar System</span>
                <br />
                in Augmented Reality
              </h1>

              <p className="max-w-md text-[13px] sm:text-[15px] leading-[1.65] text-orbit-muted-foreground font-light">
                A next-gen AR observatory that brings the universe to you. Tap a planet on the
                right — distance, orbits, and facts appear here as plain text.
              </p>
            </header>

            <div className="flex flex-wrap items-center gap-2 sm:gap-3">
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="welcome-cta-primary inline-flex items-center gap-2 rounded-full px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-semibold min-h-[44px] sm:min-h-[48px] transition shadow-lg shadow-amber-500/15"
              >
                <Telescope className="w-4 h-4 shrink-0" strokeWidth={2.25} />
                Enter Observatory
              </button>
              <button
                type="button"
                onClick={() => setMissionHubOpen(true)}
                className="inline-flex items-center gap-2 rounded-full border border-white/25 bg-white/5 px-5 py-2.5 sm:px-6 sm:py-3 text-xs sm:text-sm font-medium text-orbit-foreground min-h-[44px] sm:min-h-[48px] backdrop-blur-sm transition hover:border-white/40"
              >
                <Rocket className="w-4 h-4 shrink-0 text-orbit-primary" strokeWidth={2} />
                Missions
              </button>
            </div>

            {selected ? (
              <section className="space-y-2 sm:space-y-3 animate-fade-in text-left" aria-live="polite">
                <p className="text-[9px] sm:text-[10px] uppercase tracking-[0.28em] text-orbit-primary">
                  {selected.type}
                </p>
                <h2 className="font-welcome-serif text-xl sm:text-2xl lg:text-3xl">{selected.name}</h2>
                <p className="text-xs sm:text-sm leading-relaxed text-orbit-muted-foreground font-light">
                  {selected.description}
                </p>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 sm:gap-y-3 text-xs sm:text-sm">
                  {selected.facts.map((f) => (
                    <div key={f.label}>
                      <dt className="text-orbit-muted-foreground text-[10px] sm:text-xs font-normal">
                        {f.label}
                      </dt>
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
                Spin the sky on the right · pinch or use +/− to zoom · pick a label below the map.
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
