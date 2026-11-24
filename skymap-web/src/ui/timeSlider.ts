export function initTimeSlider(onDate: (d: Date) => void): void {
  const slider = document.getElementById('time-slider') as HTMLInputElement;
  const label = document.getElementById('time-label');
  if (!slider) return;
  const base = Date.now();
  slider.addEventListener('input', () => {
    const offsetH = parseFloat(slider.value);
    const d = new Date(base + offsetH * 3600000);
    if (label) label.textContent = d.toISOString().slice(0, 16).replace('T', ' ');
    onDate(d);
  });
}