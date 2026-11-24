export interface QuestHudView {
  name: string;
  english: string;
  done: number;
  total: number;
  message: string;
  hintOn: boolean;
  finished: boolean;
  aboveHorizon: boolean;
}

export function initQuestHud(handlers: {
  onHint: () => void;
  onSkip: () => void;
  onExit: () => void;
}): void {
  document.getElementById('quest-hint')?.addEventListener('click', () => handlers.onHint());
  document.getElementById('quest-skip')?.addEventListener('click', () => handlers.onSkip());
  document.getElementById('quest-exit')?.addEventListener('click', () => handlers.onExit());
}

export function setPlayModeChrome(play: boolean): void {
  document.body.classList.toggle('play-mode', play);
  document.getElementById('quest-hud')?.classList.toggle('hidden', !play);
  document.getElementById('fov-control')?.classList.toggle('!hidden', play);
  const telemetry = document.getElementById('telemetry-bar');
  if (play) telemetry?.classList.add('opacity-0', 'pointer-events-none', 'h-0', 'overflow-hidden', 'p-0', 'm-0', 'border-0');
  else telemetry?.classList.remove('opacity-0', 'pointer-events-none', 'h-0', 'overflow-hidden', 'p-0', 'm-0', 'border-0');
  const measure = document.getElementById('layer-measure') as HTMLInputElement | null;
  if (measure) {
    measure.disabled = play;
    if (play) measure.checked = false;
  }
}

export function updateQuestHud(view: QuestHudView): void {
  const title = document.getElementById('quest-title');
  const progress = document.getElementById('quest-progress');
  const message = document.getElementById('quest-message');
  const hintBtn = document.getElementById('quest-hint');
  if (title) title.textContent = view.english || view.name;
  if (progress) progress.textContent = `${view.done} / ${view.total} lines`;
  if (message) {
    const low = view.aboveHorizon ? '' : ' This figure is low — Sky 360° is easier indoors.';
    message.textContent = view.message + low;
  }
  hintBtn?.classList.toggle('hud-pill-active', view.hintOn);
}

export function showCatalogIncomplete(): void {
  const el = document.getElementById('catalog-error-toast');
  el?.classList.remove('hidden');
  window.setTimeout(() => el?.classList.add('hidden'), 5000);
}
