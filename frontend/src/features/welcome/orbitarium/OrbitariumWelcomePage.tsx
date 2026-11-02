import { useState } from 'react';
import { Camera, ChevronRight, Rocket, Sparkles, X } from 'lucide-react';
import type { CelestialBodyId } from '../../../types/astronomy';
import { MissionProgressStrip } from '../../../components/MissionProgressStrip';
import { StargazerXpStrip } from '../../../components/StargazerXpStrip';
import { SafetyQuizCard } from '../../../components/SafetyQuizCard';
import { DailyChallengeCard } from '../../../components/DailyChallengeCard';
import { DailyQuestsCard } from '../../../components/DailyQuestsCard';
import { MissionControlPanel } from '../../../components/MissionControlPanel';
import { CollectionBook } from '../../../components/CollectionBook';
import { OrbitariumSolarViewport } from './OrbitariumSolarViewport';
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

  return (
    <>
      <div className="orbitarium-root relative h-[100dvh] w-full overflow-hidden bg-orbit-background text-orbit-foreground">
        <OrbitariumSolarViewport
          selected={selected}
          onSelect={setSelected}
          speed={speed}
          onSpeedChange={setSpeed}
          compact
          fullBleed
          sceneShiftX={22}
          controlsAnchor="right"
        />

        <div
          className="absolute inset-x-0 top-0 z-10 max-h-[52dvh] overflow-y-auto overscroll-y-contain touch-pan-y pointer-events-auto lg:inset-y-0 lg:max-h-none lg:flex lg:w-[46%] lg:max-w-2xl lg:items-center lg:overflow-y-auto"
          style={{ background: 'transparent' }}
        >
          <div className="welcome-copy-slot space-y-6 px-6 py-8 sm:px-10 lg:py-10 lg:pl-12 xl:pl-[clamp(2rem,8vw,5rem)]">
            <header className="space-y-3">
              <p className="text-xs uppercase tracking-[0.35em] text-orbit-primary">SkyMap AR</p>
              <h1 className="font-orbitarium-display text-3xl leading-[1.15] sm:text-4xl lg:text-[2.75rem]">
                Welcome
              </h1>
              <p className="max-w-md text-sm leading-relaxed text-orbit-muted-foreground sm:text-base">
                Your welcome text goes here. Tap a planet on the right to see distance, facts, and
                more in this column.
              </p>
            </header>

            <div className="flex flex-wrap items-center gap-3">
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="inline-flex items-center gap-1.5 rounded-full bg-orbit-primary px-5 py-2.5 text-sm font-semibold text-orbit-primary-foreground min-h-[44px]"
              >
                Enter observatory
                <ChevronRight className="w-4 h-4" />
              </button>
              <button
                type="button"
                onClick={() => setMissionHubOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-orbit-border/60 px-5 py-2.5 text-sm text-orbit-foreground min-h-[44px]"
              >
                <Sparkles className="w-4 h-4 text-orbit-primary" />
                Missions
              </button>
            </div>

            {selected ? (
              <section className="space-y-3 animate-fade-in pt-2">
                <p className="text-[10px] uppercase tracking-[0.25em] text-orbit-primary">
                  {selected.type}
                </p>
                <h2 className="font-orbitarium-display text-2xl sm:text-3xl">{selected.name}</h2>
                <p className="text-sm leading-relaxed text-orbit-muted-foreground">
                  {selected.description}
                </p>
                <dl className="grid grid-cols-2 gap-x-4 gap-y-3 text-sm">
                  {selected.facts.map((f) => (
                    <div key={f.label}>
                      <dt className="text-orbit-muted-foreground text-xs">{f.label}</dt>
                      <dd className="mt-0.5 font-medium">{f.value}</dd>
                    </div>
                  ))}
                </dl>
                {TRACKABLE.has(selected.name) && (
                  <button
                    type="button"
                    onClick={() => onOpenBodyInAr(selected.name as CelestialBodyId)}
                    className="inline-flex items-center justify-center gap-2 rounded-full border border-orbit-border/60 px-5 py-2.5 text-sm font-medium min-h-[44px]"
                  >
                    <Camera className="w-4 h-4" />
                    Track in AR
                  </button>
                )}
              </section>
            ) : null}
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
          <div className="relative w-full max-w-lg h-full bg-[#090d14] border-l border-slate-800 shadow-2xl overflow-y-auto p-4 pt-14">
            <button
              type="button"
              onClick={() => setMissionHubOpen(false)}
              className="absolute top-3 right-3 p-2 rounded-lg hover:bg-slate-800 text-slate-400"
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
