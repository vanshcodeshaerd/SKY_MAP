import type { SkySceneData } from './render/types.ts';
import type { IRenderer } from './render/IRenderer.ts';

let dragYaw = 0; // compass heading in degrees [0, 360)
let dragPitch = 115; // beta in degrees (90 = horizon, 115 = 25° up, 180 = zenith)
let dragging = false;
let lastX = 0;
let lastY = 0;

export interface PlanetariumControls {
  yaw: () => number;
  pitch: () => number;
  lookAt: (azDeg: number, altDeg: number) => void;
}

export function initPlanetariumControls(
  canvas: HTMLElement,
  onZoomDelta?: (deltaFov: number) => void
): PlanetariumControls {
  canvas.addEventListener('pointerdown', (e) => {
    dragging = true;
    lastX = e.clientX;
    lastY = e.clientY;
  });
  window.addEventListener('pointerup', () => {
    dragging = false;
  });
  window.addEventListener('pointermove', (e) => {
    if (!dragging) return;
    dragYaw = (((dragYaw - (e.clientX - lastX) * 0.25) % 360) + 360) % 360;
    dragPitch += (e.clientY - lastY) * 0.2;
    dragPitch = Math.max(10, Math.min(175, dragPitch));
    lastX = e.clientX;
    lastY = e.clientY;
  });

  if (onZoomDelta) {
    canvas.addEventListener(
      'wheel',
      (e) => {
        e.preventDefault();
        onZoomDelta(e.deltaY > 0 ? 4 : -4);
      },
      { passive: false }
    );
  }

  return {
    yaw: () => dragYaw,
    pitch: () => dragPitch,
    lookAt: (azDeg: number, altDeg: number) => {
      dragYaw = ((azDeg % 360) + 360) % 360;
      dragPitch = Math.max(10, Math.min(175, 90 + altDeg));
    },
  };
}

export function drawPlanetariumDome(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bortle: number
): void {
  const urban = bortle >= 7;
  const grad = ctx.createRadialGradient(w / 2, h * 0.6, 0, w / 2, h / 2, Math.max(w, h));
  grad.addColorStop(0, urban ? '#1e293b' : '#090d1a');
  grad.addColorStop(1, urban ? '#0f172a' : '#020308');
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, w, h);
}

export function renderPlanetariumFrame(
  renderer: IRenderer,
  scene: SkySceneData,
  R: number[][],
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bortle: number
): void {
  drawPlanetariumDome(ctx, w, h, bortle);
  renderer.render(scene, R);
}
