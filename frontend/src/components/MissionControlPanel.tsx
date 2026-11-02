import { CheckCircle2, Circle, Lock, Rocket, ChevronRight, Award, Download } from 'lucide-react';
import { BADGES, MISSIONS, getBadgeById, getMissionById } from '../data/missions';
import { useMissionProgressContext } from '../hooks/useMissionProgress';
import { isMissionComplete, isMissionUnlocked } from '../services/missionEngine';
import type { MissionNavTab } from '../types/missions';

interface MissionControlPanelProps {
  onNavigate: (tab: MissionNavTab) => void;
}

export function MissionControlPanel({ onNavigate }: MissionControlPanelProps) {
  const { progress, rank, evaluations, nextMissionId, completedCount, totalMissions, exportProgressCsv } =
    useMissionProgressContext();

  const nextMission = nextMissionId ? getMissionById(nextMissionId) : null;

  const handleContinue = () => {
    if (nextMission?.suggestedTab) {
      onNavigate(nextMission.suggestedTab);
    } else if (nextMissionId === 'cadet_setup') {
      onNavigate('dashboard');
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-6 rounded-2xl border border-[#1e283c] bg-[#0c1018]/95 shadow-2xl overflow-hidden">
      <div className="px-4 sm:px-5 py-4 border-b border-[#1e283c] bg-gradient-to-r from-[#111622] to-[#0f172a]">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
          <div>
            <h2 className="text-base font-semibold text-white flex items-center gap-2">
              <Rocket className="w-5 h-5 text-amber-400" />
              Mission Control
            </h2>
            <p className="text-xs text-slate-400 mt-0.5">
              Rank <span className="text-amber-300 font-medium">{rank.title}</span> ·{' '}
              {completedCount}/{totalMissions} complete · saved on this device only
            </p>
          </div>
          {nextMission && (
            <button
              type="button"
              onClick={handleContinue}
              className="inline-flex items-center justify-center gap-2 px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 text-sm font-bold transition shadow-lg shadow-amber-500/20"
            >
              Continue mission
              <ChevronRight className="w-4 h-4" />
            </button>
          )}
        </div>
      </div>

      <div className="p-4 sm:p-5 space-y-3 max-h-[420px] overflow-y-auto">
        {MISSIONS.map((mission) => {
          const evaluation = evaluations.find((e) => e.missionId === mission.id);
          const complete = isMissionComplete(progress, mission.id);
          const unlocked = isMissionUnlocked(progress, mission.id);
          const isActive = nextMissionId === mission.id;

          return (
            <div
              key={mission.id}
              className={`rounded-xl border p-3.5 transition ${
                complete
                  ? 'border-emerald-500/40 bg-emerald-500/5'
                  : isActive
                  ? 'border-amber-500/50 bg-amber-500/5 ring-1 ring-amber-500/20'
                  : unlocked
                  ? 'border-[#253147] bg-[#111622]/80'
                  : 'border-slate-800 bg-slate-950/50 opacity-70'
              }`}
            >
              <div className="flex items-start justify-between gap-2 mb-2">
                <div>
                  <h3 className="text-sm font-semibold text-slate-100">{mission.title}</h3>
                  <p className="text-[11px] text-slate-400">{mission.subtitle}</p>
                </div>
                {complete ? (
                  <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
                ) : !unlocked ? (
                  <Lock className="w-4 h-4 text-slate-500 shrink-0 mt-0.5" />
                ) : null}
              </div>

              <ul className="space-y-1.5 mb-2">
                {mission.steps.map((step) => {
                  const done =
                    complete || (evaluation?.completedSteps.includes(step.id) ?? false);
                  return (
                    <li key={step.id} className="flex items-start gap-2 text-xs">
                      {done ? (
                        <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0 mt-0.5" />
                      ) : (
                        <Circle className="w-3.5 h-3.5 text-slate-600 shrink-0 mt-0.5" />
                      )}
                      <span className={done ? 'text-slate-300' : 'text-slate-500'}>{step.label}</span>
                    </li>
                  );
                })}
              </ul>

              {unlocked && !complete && mission.suggestedTab && (
                <button
                  type="button"
                  onClick={() => onNavigate(mission.suggestedTab!)}
                  className="text-[11px] font-medium text-sky-400 hover:text-sky-300 inline-flex items-center gap-1"
                >
                  Go to activity
                  <ChevronRight className="w-3 h-3" />
                </button>
              )}

              {!unlocked && mission.requires.length > 0 && (
                <p className="text-[10px] text-slate-500">
                  Complete {mission.requires.map((id) => getMissionById(id)?.title ?? id).join(', ')}{' '}
                  first
                </p>
              )}
            </div>
          );
        })}
      </div>

      {progress.earnedBadgeIds.length > 0 && (
        <div className="px-4 sm:px-5 py-4 border-t border-[#1e283c] bg-[#111622]/50">
          <p className="text-xs font-semibold text-slate-300 flex items-center gap-1.5 mb-2">
            <Award className="w-4 h-4 text-amber-400" />
            Your badges
          </p>
          <div className="flex flex-wrap gap-2">
            {progress.earnedBadgeIds.map((badgeId) => {
              const badge = getBadgeById(badgeId);
              if (!badge) return null;
              return (
                <div
                  key={badgeId}
                  title={badge.description}
                  className="flex items-center gap-1.5 px-2.5 py-1 rounded-lg bg-[#161d2c] border border-[#253147] text-[11px] text-slate-200"
                >
                  <span>{badge.emoji}</span>
                  <span>{badge.title}</span>
                </div>
              );
            })}
          </div>
          <p className="text-[10px] text-slate-500 mt-2">
            {BADGES.length - progress.earnedBadgeIds.length} badges still to earn
          </p>
        </div>
      )}

      <div className="px-4 sm:px-5 py-3 border-t border-[#1e283c] bg-[#0c1018]/80 flex justify-end">
        <button
          type="button"
          onClick={exportProgressCsv}
          className="inline-flex items-center gap-1.5 text-[11px] font-medium text-sky-400 hover:text-sky-300"
        >
          <Download className="w-3.5 h-3.5" />
          Export progress CSV
        </button>
      </div>
    </div>
  );
}
