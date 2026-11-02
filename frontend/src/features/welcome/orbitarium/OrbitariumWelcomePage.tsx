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

/** One background, no columns or dividers: text left, solar system fixed on the right. */
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
        {/* Same background everywhere — 3D is transparent except stars/planets, shifted right */}
        <OrbitariumSolarViewport
          selected={selected}
          onSelect={setSelected}
          speed={speed}
          onSpeedChange={setSpeed}
        />

        {/* Left: your copy only (no panel, no fill) */}
        <div className="absolute inset-y-0 left-0 z-10 w-1/2 overflow-y-auto overscroll-y-contain touch-pan-y pointer-events-auto">
          <div className="welcome-copy-slot p-4 sm:p-6 md:p-8 max-w-md min-h-full flex flex-col gap-5 pb-28">
            <header className="space-y-2">
              <p className="text-xs uppercase tracking-[0.35em] text-orbit-primary">SkyMap AR</p>
              <h1 className="font-orbitarium-display text-2xl sm:text-3xl md:text-4xl leading-tight">
                Welcome
              </h1>
              <p className="text-sm text-orbit-muted-foreground leading-relaxed">
                Your welcome text goes here. Select a world on the right to read more.
              </p>
            </header>

            <div className="flex flex-wrap gap-2">
              <button
                type="button"
                onClick={() => setMissionHubOpen(true)}
                className="inline-flex items-center gap-1.5 rounded-full border border-orbit-border/50 px-3 py-2 text-xs text-orbit-foreground"
              >
                <Sparkles className="w-3.5 h-3.5 text-orbit-primary" />
                Missions
              </button>
              <button
                type="button"
                onClick={() => onNavigate('dashboard')}
                className="inline-flex items-center gap-1.5 rounded-full bg-orbit-primary px-3 py-2 text-xs font-semibold text-orbit-primary-foreground"
              >
                Enter observatory
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>

            {selected ? (
              <section className="space-y-3 animate-fade-in">
                <p className="text-[10px] uppercase tracking-[0.25em] text-orbit-primary">
                  {selected.type}
                </p>
                <h2 className="font-orbitarium-display text-2xl sm:text-3xl">{selected.name}</h2>
                <p className="text-sm text-orbit-muted-foreground leading-relaxed">
                  {selected.description}
                </p>
                <dl className="grid grid-cols-2 gap-x-3 gap-y-2 text-xs">
                  {selected.facts.slice(0, 4).map((f) => (
                    <div key={f.label}>
                      <dt className="text-orbit-muted-foreground">{f.label}</dt>
                      <dd className="font-medium mt-0.5">{f.value}</dd>
                    </div>
                  ))}
                </dl>
                {TRACKABLE.has(selected.name) && (
                  <button
                    type="button"
                    onClick={() => onOpenBodyInAr(selected.name as CelestialBodyId)}
                    className="inline-flex items-center justify-center gap-2 py-2.5 px-4 rounded-xl bg-orbit-primary text-orbit-primary-foreground text-sm font-medium min-h-[44px]"
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
