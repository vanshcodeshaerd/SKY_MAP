export function getCalibratedFOV(): number {
  const stored = localStorage.getItem("skymap_fov");
  return stored ? parseFloat(stored) : 65; // default to 65
}

export function setCalibratedFOV(fov: number) {
  localStorage.setItem("skymap_fov", fov.toString());
}

export function initCalibrationUI(
  sliderElement: HTMLInputElement, 
  displayElement: HTMLElement,
  onFOVChange: (fov: number) => void
) {
  const initialFov = getCalibratedFOV();
  sliderElement.value = initialFov.toString();
  displayElement.textContent = initialFov.toString();
  
  sliderElement.addEventListener("input", (e) => {
    const val = parseFloat((e.target as HTMLInputElement).value);
    displayElement.textContent = val.toString();
    setCalibratedFOV(val);
    onFOVChange(val);
  });
}
