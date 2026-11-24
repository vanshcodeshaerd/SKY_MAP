export interface LayerSettings {
  showStars: boolean;
  showLines: boolean;
  showLabels: boolean;
  bortle: number;
  contrast: number;
  brightness: number;
  sobel: boolean;
  nightRed: boolean;
  measureMode: boolean;
  useWebGL: boolean;
}

export function initLayerDrawer(onChange: (s: LayerSettings) => void): LayerSettings {
  const settings: LayerSettings = {
    showStars: true,
    showLines: true,
    showLabels: true,
    bortle: 5,
    contrast: 1,
    brightness: 1,
    sobel: false,
    nightRed: false,
    measureMode: false,
    useWebGL: false,
  };

  const drawer = document.getElementById('layer-drawer');
  const settingsBtn = document.getElementById('btn-settings');
  const closeBtn = document.getElementById('layer-drawer-close');

  settingsBtn?.addEventListener('click', () => {
    document.getElementById('search-panel')?.classList.add('hidden');
    drawer?.classList.toggle('hidden');
  });
  closeBtn?.addEventListener('click', () => {
    drawer?.classList.add('hidden');
  });

  const emit = () => onChange({ ...settings });

  const checks: [string, keyof LayerSettings][] = [
    ['layer-stars', 'showStars'],
    ['layer-lines', 'showLines'],
    ['layer-labels', 'showLabels'],
    ['layer-sobel', 'sobel'],
    ['layer-measure', 'measureMode'],
    ['layer-webgl', 'useWebGL'],
    ['layer-night-red', 'nightRed'],
  ];

  for (const [id, key] of checks) {
    const el = document.getElementById(id) as HTMLInputElement | null;
    el?.addEventListener('change', () => {
      settings[key] = el.checked as never;
      emit();
    });
  }

  const bortle = document.getElementById('bortle-slider') as HTMLInputElement | null;
  const bortleVal = document.getElementById('bortle-val');
  bortle?.addEventListener('input', () => {
    settings.bortle = parseInt(bortle.value, 10);
    if (bortleVal) bortleVal.textContent = `${settings.bortle}`;
    emit();
  });

  const contrast = document.getElementById('contrast-slider') as HTMLInputElement | null;
  contrast?.addEventListener('input', () => {
    settings.contrast = parseFloat(contrast.value);
    emit();
  });

  const bright = document.getElementById('brightness-slider') as HTMLInputElement | null;
  bright?.addEventListener('input', () => {
    settings.brightness = parseFloat(bright.value);
    emit();
  });

  return settings;
}
