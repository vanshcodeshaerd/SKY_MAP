export function initTimeSlider(onDate: (d: Date) => void): void {
  const slider = document.getElementById('time-slider') as HTMLInputElement | null;
  const label = document.getElementById('time-label');
  const resetBtn = document.getElementById('time-reset');
  const toggleBtn = document.getElementById('btn-time-toggle');
  const panel = document.getElementById('time-slider-panel');

  toggleBtn?.addEventListener('click', () => {
    panel?.classList.toggle('hidden');
  });

  if (!slider) return;

  const update = (offsetH: number) => {
    const d = new Date(Date.now() + offsetH * 3600000);
    if (label) {
      label.textContent =
        offsetH === 0
          ? 'Live (Now)'
          : d.toLocaleString([], { month: 'short', day: 'numeric', hour: '2-digit', minute: '2-digit' });
    }
    onDate(d);
  };

  slider.addEventListener('input', () => {
    update(parseFloat(slider.value));
  });

  resetBtn?.addEventListener('click', () => {
    slider.value = '0';
    update(0);
  });
}
