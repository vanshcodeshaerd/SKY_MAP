import { useState } from 'react';
import { ShieldAlert, CheckCircle2 } from 'lucide-react';
import { useMissionProgressContext } from '../hooks/useMissionProgress';

export function SafetyQuizCard() {
  const { progress, passSafetyQuiz } = useMissionProgressContext();
  const [step, setStep] = useState(0);
  const [passed, setPassed] = useState(false);

  if (progress.safetyQuizPassed) {
    return (
      <div className="w-full max-w-3xl mx-auto mb-4 rounded-lg border border-emerald-500/30 bg-emerald-500/5 px-3 py-2 flex items-center gap-2 text-xs text-emerald-300">
        <CheckCircle2 className="w-4 h-4 shrink-0" />
        Observer safety quiz passed — Sun AR tools unlocked.
      </div>
    );
  }

  const questions = [
    {
      q: 'Is it safe to look at the Sun through this app’s camera without a solar filter?',
      options: [
        { label: 'No — never look at the real Sun directly', correct: true },
        { label: 'Yes — the phone screen protects my eyes', correct: false },
      ],
    },
    {
      q: 'When using AR to find the Sun, you should…',
      options: [
        { label: 'Point the phone without looking at the Sun; use on-screen guidance only', correct: true },
        { label: 'Stare at the Sun to align faster', correct: false },
      ],
    },
  ];

  const current = questions[step];

  const handleAnswer = (correct: boolean) => {
    if (!correct) {
      setStep(0);
      return;
    }
    if (step + 1 >= questions.length) {
      passSafetyQuiz();
      setPassed(true);
    } else {
      setStep(step + 1);
    }
  };

  return (
    <div className="w-full max-w-3xl mx-auto mb-4 rounded-xl border border-amber-500/30 bg-amber-500/5 p-4">
      <p className="text-xs font-semibold text-amber-300 flex items-center gap-2 mb-2">
        <ShieldAlert className="w-4 h-4" />
        Safety quest (required before Sun AR)
      </p>
      {passed ? (
        <p className="text-xs text-emerald-300">Great job — stay safe out there!</p>
      ) : (
        <>
          <p className="text-sm text-slate-200 mb-3">{current.q}</p>
          <div className="flex flex-col sm:flex-row gap-2">
            {current.options.map((opt) => (
              <button
                key={opt.label}
                type="button"
                onClick={() => handleAnswer(opt.correct)}
                className="text-left text-xs px-3 py-2 rounded-lg border border-orbit-border bg-orbit-card hover:border-amber-500/40 text-slate-300"
              >
                {opt.label}
              </button>
            ))}
          </div>
        </>
      )}
    </div>
  );
}
