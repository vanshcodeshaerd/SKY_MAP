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

let modalOpen = false;
let liveNudge: ((deg: number) => void) | null = null;

export function isCalibrationModalOpen(): boolean {
  return modalOpen;
}

export function setCalibrationNudge(deg: number): void {
  const slider = document.getElementById('azimuth-nudge') as HTMLInputElement | null;
  const nudgeVal = document.getElementById('azimuth-nudge-val');
  if (slider) slider.value = String(Math.round(deg * 2) / 2);
  if (nudgeVal) {
    const v = parseFloat(slider?.value ?? String(deg));
    nudgeVal.textContent = `${v >= 0 ? '+' : ''}${v.toFixed(1)}°`;
  }
  liveNudge?.(parseFloat(slider?.value ?? String(deg)));
}

export function setCalibrationAlignHint(text: string): void {
  const el = document.getElementById('cal-align-status');
  if (el) el.textContent = text;
}

export function showCalibrationModal(
  onComplete: (result: CalibrationResult) => void,
  status?: CalibrationStatusInfo,
  onAzimuthLive?: (deg: number) => void
): void {
  const el = document.getElementById('calibration-modal');
  if (!el) {
    onComplete({ azimuthNudge: 0, skipped: true });
    return;
  }

  if (modalOpen) {
    el.classList.add('hidden');
    modalOpen = false;
  }

  el.classList.remove('hidden');
  modalOpen = true;
  liveNudge = onAzimuthLive ?? null;

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
      ${status ? `<div class="text-on-surface-variant/80 mt-1">Heading: ${status.headingDeg.toFixed(1)}° — nudge until a known direction lines up, or hold a bright star in the reticle.</div>` : ''}
    `;
  }

  setCalibrationAlignHint('Hold a bright star (or the Moon) in the center for about a second to auto-align.');

  const updateReadout = () => {
    if (nudgeVal && slider) {
      const v = parseFloat(slider.value);
      nudgeVal.textContent = `${v >= 0 ? '+' : ''}${v.toFixed(1)}°`;
      onAzimuthLive?.(v);
    }
  };

  const onInput = () => updateReadout();
  const onReset = () => {
    if (slider) slider.value = '0';
    resetOrientationFilter();
    setCalibrationAlignHint('Filters reset. Hold a bright star in the reticle to align.');
    updateReadout();
  };

  slider?.addEventListener('input', onInput);
  resetBtn?.addEventListener('click', onReset);
  updateReadout();

  const cleanup = () => {
    slider?.removeEventListener('input', onInput);
    resetBtn?.removeEventListener('click', onReset);
    liveNudge = null;
    el.classList.add('hidden');
    modalOpen = false;
  };

  const finish = (skipped: boolean) => {
    cleanup();
    onComplete({ azimuthNudge: parseFloat(slider?.value ?? '0'), skipped });
  };

  continueBtn?.addEventListener('click', () => finish(false), { once: true });
  skipBtn?.addEventListener('click', () => finish(true), { once: true });
}
