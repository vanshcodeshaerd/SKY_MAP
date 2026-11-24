import type { SkySceneData } from './render/types.ts';
import type { IRenderer } from './render/IRenderer.ts';

let dragYaw = 0;
let dragPitch = 0;
let dragging = false;
let lastX = 0;
let lastY = 0;

export function initPlanetariumControls(canvas: HTMLElement): { yaw: () => number; pitch: () => number } {
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
    dragYaw += (e.clientX - lastX) * 0.2;
    dragPitch += (e.clientY - lastY) * 0.15;
    dragPitch = Math.max(-85, Math.min(85, dragPitch));
    lastX = e.clientX;
    lastY = e.clientY;
  });
  return { yaw: () => dragYaw, pitch: () => dragPitch };
}

export function drawPlanetariumDome(
  ctx: CanvasRenderingContext2D,
  w: number,
  h: number,
  bortle: number
): void {
  const urban = bortle >= 8;
  const grad = ctx.createRadialGradient(w / 2, h * 0.6, 0, w / 2, h / 2, Math.max(w, h));
  grad.addColorStop(0, urban ? '#2a3548' : '#0a0e1a');
  grad.addColorStop(1, urban ? '#1a2030' : '#000005');
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