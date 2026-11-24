export interface CalibrationResult {
  azimuthNudge: number;
  skipped: boolean;
}

export function showCalibrationModal(
  onComplete: (result: CalibrationResult) => void
): void {
  const el = document.getElementById('calibration-modal');
  if (!el) {
    onComplete({ azimuthNudge: 0, skipped: true });
    return;
  }
  el.classList.remove('hidden');
  const continueBtn = document.getElementById('cal-continue') as HTMLButtonElement;
  const skipBtn = document.getElementById('cal-skip') as HTMLButtonElement;
  const slider = document.getElementById('azimuth-nudge') as HTMLInputElement;
  const finish = (skipped: boolean) => {
    el.classList.add('hidden');
    onComplete({ azimuthNudge: parseFloat(slider?.value ?? '0'), skipped });
  };
  continueBtn?.addEventListener('click', () => finish(false), { once: true });
  skipBtn?.addEventListener('click', () => finish(true), { once: true });
}