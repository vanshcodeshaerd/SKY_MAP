import { getSensorCapabilities, resetOrientationFilter } from '../orientation.ts';

export interface CalibrationResult {
  azimuthNudge: number;
  skipped: boolean;
  resetRequested?: boolean;
}

export interface CalibrationStatusInfo {
  cameraReady: boolean;
  locationReady: boolean;
  headingDeg: number;
}

export function showCalibrationModal(
  onComplete: (result: CalibrationResult) => void,
  status?: CalibrationStatusInfo
): void {
  const el = document.getElementById('calibration-modal');
  if (!el) {
    onComplete({ azimuthNudge: 0, skipped: true });
    return;
  }
  el.classList.remove('hidden');

  const continueBtn = document.getElementById('cal-continue') as HTMLButtonElement | null;
  const skipBtn = document.getElementById('cal-skip') as HTMLButtonElement | null;
  const resetBtn = document.getElementById('cal-reset') as HTMLButtonElement | null;
  const slider = document.getElementById('azimuth-nudge') as HTMLInputElement | null;
  const nudgeVal = document.getElementById('azimuth-nudge-val');
  const statusEl = document.getElementById('cal-status-list');

  const caps = getSensorCapabilities();
  if (statusEl) {
    const camOk = status?.cameraReady ? 'Ready' : 'Pending / Denied';
    const locOk = status?.locationReady ? 'Locked' : 'Acquiring GPS';
    const motionOk = caps.supported ? (caps.permissionGranted ? 'Active' : 'Needs Gesture') : 'Unavailable (Sim Mode)';
    const compassOk = caps.iosTrueNorth
      ? 'True North (iOS)'
      : caps.absolute
      ? 'Absolute Magnetic + WMM'
      : 'Relative / Desktop Sim';
    statusEl.innerHTML = `
      <div>Camera: <span class="text-primary-container">${camOk}</span></div>
      <div>Location: <span class="text-primary-container">${locOk}</span></div>
      <div>Motion Sensors: <span class="text-primary-container">${motionOk}</span></div>
      <div>Compass Health: <span class="text-primary-container">${compassOk}</span></div>
    `;
  }

  const updateReadout = () => {
    if (nudgeVal && slider) {
      const v = parseFloat(slider.value);
      nudgeVal.textContent = `${v >= 0 ? '+' : ''}${v.toFixed(1)}°`;
    }
  };
  slider?.addEventListener('input', updateReadout);
  updateReadout();

  const onReset = () => {
    if (slider) slider.value = '0';
    updateReadout();
    resetOrientationFilter();
  };
  resetBtn?.addEventListener('click', onReset);

  const finish = (skipped: boolean) => {
    el.classList.add('hidden');
    resetBtn?.removeEventListener('click', onReset);
    onComplete({ azimuthNudge: parseFloat(slider?.value ?? '0'), skipped });
  };

  continueBtn?.addEventListener('click', () => finish(false), { once: true });
  skipBtn?.addEventListener('click', () => finish(true), { once: true });
}
