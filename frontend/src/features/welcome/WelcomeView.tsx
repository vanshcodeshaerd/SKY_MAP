import React from 'react';
import { CosmicParallaxBg } from '../../components/ui/CosmicParallaxBg';
import { MissionProgressStrip } from '../../components/MissionProgressStrip';
import { MissionControlPanel } from '../../components/MissionControlPanel';
import { DailyChallengeCard } from '../../components/DailyChallengeCard';
import { CollectionBook } from '../../components/CollectionBook';
import { Compass, Sparkles, Rocket, Camera, Eye, ArrowRight, ShieldAlert, BookOpen } from 'lucide-react';
import type { CelestialBodyId } from '../../types/astronomy';

interface WelcomeViewProps {
  onNavigate: (tab: 'dashboard' | 'sky3d' | 'ar' | 'cvlab') => void;
  onStartDailyChallenge: (bodyId: CelestialBodyId) => void;
}

export const WelcomeView: React.FC<WelcomeViewProps> = ({ onNavigate, onStartDailyChallenge }) => {
  return (
    <div className="relative w-full min-h-[calc(100vh-4rem)] flex flex-col items-center justify-start overflow-hidden">
      {/* Cosmic Parallax Canvas Background */}
      <CosmicParallaxBg head="SkyMap AR" text="Explore, Discover, Learn" loop={true}>
        <MissionProgressStrip />
        <DailyChallengeCard onStartChallenge={onStartDailyChallenge} />
        <MissionControlPanel onNavigate={onNavigate} />
        <CollectionBook />

        {/* Child & Student Friendly Welcome Banner */}
        <div className="text-center max-w-2xl mx-auto space-y-3 mb-6">
          <p className="text-sm sm:text-base md:text-lg text-slate-200 font-light leading-relaxed">
            Welcome, young space explorer! Step into your interactive observatory to fly through 3D planets, 
            track real-time stars, and look through your camera with augmented reality.
          </p>
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs font-medium">
            <Sparkles className="w-3.5 h-3.5 text-amber-400" />
            <span>Interactive Astronomy for Curious Minds & Kids</span>
          </div>
        </div>

        {/* 3 Main Action Cards for Young Learners */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4 w-full max-w-4xl">
          {/* Card 1: 3D Solar System */}
          <div 
            onClick={() => onNavigate('sky3d')}
            className="group cursor-pointer rounded-xl bg-[#111622]/90 hover:bg-[#161d2c] border border-[#1e283c] hover:border-amber-500/50 p-5 transition-all duration-200 shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-amber-500/15 border border-amber-500/30 flex items-center justify-center mb-3 text-amber-400 group-hover:scale-105 transition-transform">
                <Rocket className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white group-hover:text-amber-300 transition-colors mb-1.5 flex items-center justify-between">
                <span>3D Space Map</span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-amber-400 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Fly around the planets in 3D! Check Saturn's rings, the Sun's bright corona, and observe orbits in real-time.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#1e283c] flex items-center justify-between text-[11px] text-amber-400/90 font-medium">
              <span>Touch & Orbit 3D</span>
              <span className="px-2 py-0.5 rounded bg-amber-500/10 border border-amber-500/20 text-amber-300">Start 🚀</span>
            </div>
          </div>

          {/* Card 2: AR Sky Camera */}
          <div 
            onClick={() => onNavigate('ar')}
            className="group cursor-pointer rounded-xl bg-[#111622]/90 hover:bg-[#161d2c] border border-[#1e283c] hover:border-sky-500/50 p-5 transition-all duration-200 shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-sky-500/15 border border-sky-500/30 flex items-center justify-center mb-3 text-sky-400 group-hover:scale-105 transition-transform">
                <Camera className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white group-hover:text-sky-300 transition-colors mb-1.5 flex items-center justify-between">
                <span>AR Sky Camera</span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-sky-400 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Hold up your phone or laptop camera to spot celestial objects floating right in your room or real sky.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#1e283c] flex items-center justify-between text-[11px] text-sky-400/90 font-medium">
              <span>Live Sensor Sync</span>
              <span className="px-2 py-0.5 rounded bg-sky-500/10 border border-sky-500/20 text-sky-300">Scan 📱</span>
            </div>
          </div>

          {/* Card 3: Today's Sky Dashboard */}
          <div 
            onClick={() => onNavigate('dashboard')}
            className="group cursor-pointer rounded-xl bg-[#111622]/90 hover:bg-[#161d2c] border border-[#1e283c] hover:border-emerald-500/50 p-5 transition-all duration-200 shadow-xl flex flex-col justify-between"
          >
            <div>
              <div className="w-10 h-10 rounded-lg bg-emerald-500/15 border border-emerald-500/30 flex items-center justify-center mb-3 text-emerald-400 group-hover:scale-105 transition-transform">
                <Compass className="w-5 h-5" />
              </div>
              <h3 className="text-base font-semibold text-white group-hover:text-emerald-300 transition-colors mb-1.5 flex items-center justify-between">
                <span>What's in the Sky?</span>
                <ArrowRight className="w-4 h-4 text-slate-500 group-hover:text-emerald-400 group-hover:translate-x-1 transition-all" />
              </h3>
              <p className="text-xs text-slate-400 leading-relaxed">
                Simple cards showing which planets are up in your sky right now, where to look, and their distances.
              </p>
            </div>
            <div className="mt-4 pt-3 border-t border-[#1e283c] flex items-center justify-between text-[11px] text-emerald-400/90 font-medium">
              <span>Local Visibility</span>
              <span className="px-2 py-0.5 rounded bg-emerald-500/10 border border-emerald-500/20 text-emerald-300">View 🌟</span>
            </div>
          </div>
        </div>

        {/* Fun Space Fact & Solar Safety Tip */}
        <div className="mt-6 w-full max-w-4xl grid grid-cols-1 md:grid-cols-2 gap-3 text-left">
          <div className="rounded-lg bg-[#111622]/80 border border-[#1e283c] p-3.5 flex items-start gap-3">
            <BookOpen className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold text-white block mb-0.5">Kids Cosmic Fact of the Day</span>
              <span className="text-slate-400">
                A year on Mercury is only 88 days long, but a single day on Venus lasts longer than its entire year!
              </span>
            </div>
          </div>

          <div className="rounded-lg bg-[#111622]/80 border border-amber-500/20 p-3.5 flex items-start gap-3">
            <ShieldAlert className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="text-xs">
              <span className="font-semibold text-amber-300 block mb-0.5">Observer Safety Reminder</span>
              <span className="text-slate-400">
                Never look directly at the Sun with your eyes, binoculars, or telescopes without ISO-certified solar filters.
              </span>
            </div>
          </div>
        </div>

        {/* CV Lab Sub-Access */}
        <div className="mt-5 text-center">
          <button
            onClick={() => onNavigate('cvlab')}
            className="text-xs text-slate-400 hover:text-sky-300 transition-colors inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full hover:bg-[#161d2c] border border-transparent hover:border-[#1e283c]"
          >
            <Eye className="w-3.5 h-3.5 text-sky-400" />
            <span>Curious about astronomy cameras? Try the <strong>CV Computer Vision Lab</strong></span>
            <ArrowRight className="w-3 h-3 ml-0.5" />
          </button>
        </div>
      </CosmicParallaxBg>
    </div>
  );
};
