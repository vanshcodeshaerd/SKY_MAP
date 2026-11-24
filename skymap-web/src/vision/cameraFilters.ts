let contrast = 1;
let brightness = 1;
let sobelEnabled = false;
let sobelCanvas: HTMLCanvasElement | null = null;

export function setContrast(v: number) {
  contrast = v;
  applyCssFilter();
}
export function setBrightness(v: number) {
  brightness = v;
  applyCssFilter();
}
export function setSobelEnabled(v: boolean) {
  sobelEnabled = v;
}

function applyCssFilter() {
  const video = document.getElementById('camera-feed') as HTMLVideoElement | null;
  if (video) {
    video.style.filter = `contrast(${contrast}) brightness(${brightness})`;
  }
}

export function processSobelFrame(video: HTMLVideoElement): void {
  if (!sobelEnabled || video.videoWidth === 0) return;
  if (!sobelCanvas) {
    sobelCanvas = document.getElementById('sobel-overlay') as HTMLCanvasElement;
    if (!sobelCanvas) return;
  }
  const w = Math.floor(video.videoWidth / 4);
  const h = Math.floor(video.videoHeight / 4);
  sobelCanvas.width = w;
  sobelCanvas.height = h;
  const ctx = sobelCanvas.getContext('2d', { willReadFrequently: true });
  if (!ctx) return;
  ctx.drawImage(video, 0, 0, w, h);
  const img = ctx.getImageData(0, 0, w, h);
  const out = ctx.createImageData(w, h);
  const gx = [-1, 0, 1, -2, 0, 2, -1, 0, 1];
  const gy = [-1, -2, -1, 0, 0, 0, 1, 2, 1];
  for (let y = 1; y < h - 1; y++) {
    for (let x = 1; x < w - 1; x++) {
      let sx = 0;
      let sy = 0;
      let k = 0;
      for (let j = -1; j <= 1; j++) {
        for (let i = -1; i <= 1; i++) {
          const idx = ((y + j) * w + (x + i)) * 4;
          const gray = (img.data[idx] + img.data[idx + 1] + img.data[idx + 2]) / 3;
          sx += gray * gx[k];
          sy += gray * gy[k];
          k++;
        }
      }
      const mag = Math.min(255, Math.sqrt(sx * sx + sy * sy));
      const o = (y * w + x) * 4;
      out.data[o] = mag;
      out.data[o + 1] = mag;
      out.data[o + 2] = 0;
      out.data[o + 3] = 180;
    }
  }
  ctx.putImageData(out, 0, 0);
}