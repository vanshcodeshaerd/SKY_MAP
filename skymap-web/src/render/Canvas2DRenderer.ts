import type { IRenderer } from './IRenderer.ts';
import type { RenderMode, RenderOptions, SkySceneData } from './types.ts';
import { clearCanvas, drawDirectionalArrow, drawGeodesicArc, drawIcon, magnitudeColor, magnitudeRadius } from './draw2d.ts';

export class Canvas2DRenderer implements IRenderer {
  private canvas: HTMLCanvasElement | null = null;
  private ctx: CanvasRenderingContext2D | null = null;
  private options: RenderOptions = {
    mode: 'AR',
    magLimit: 5.8,
    showStars: true,
    showLines: true,
    showLabels: true,
  };

  async init(container: HTMLElement, options: RenderOptions): Promise<void> {
    this.options = options;
    const existing = document.getElementById('ar-canvas') as HTMLCanvasElement | null;
    this.canvas = existing ?? document.createElement('canvas');
    this.canvas.id = 'ar-canvas';
    if (!existing) container.prepend(this.canvas);
    this.ctx = this.canvas.getContext('2d')!;
  }

  setMode(mode: RenderMode): void {
    this.options.mode = mode;
    if (this.canvas) {
      this.canvas.style.display = mode === 'VR_PLANETARIUM' ? 'none' : 'block';
    }
  }

  resize(width: number, height: number): void {
    if (this.canvas) {
      this.canvas.width = width;
      this.canvas.height = height;
    }
  }

  render(sceneData: SkySceneData, _cameraMatrix: number[][]): void {
    if (!this.ctx || !this.canvas) return;
    clearCanvas(this.ctx, this.canvas.width, this.canvas.height);

    const limit = sceneData.bortle <= 3 ? 6.5 : sceneData.bortle <= 5 ? 4.8 : 3.0;

    if (this.options.showLines) {
      for (const seg of sceneData.lines) {
        if (!seg.visible) continue;
        this.ctx.save();
        this.ctx.strokeStyle = 'rgba(0, 242, 255, 0.35)';
        this.ctx.lineWidth = 1.5;
        this.ctx.beginPath();
        this.ctx.moveTo(seg.x1, seg.y1);
        this.ctx.lineTo(seg.x2, seg.y2);
        this.ctx.stroke();
        this.ctx.restore();
      }
    }

    if (this.options.showStars) {
      for (const star of sceneData.stars) {
        if (!star.onScreen || star.magnitude > Math.min(limit, this.options.magLimit)) continue;
        const r = magnitudeRadius(star.magnitude);
        const color = magnitudeColor(star.colorIndex);
        this.ctx.beginPath();
        this.ctx.arc(star.x, star.y, r, 0, Math.PI * 2);
        this.ctx.fillStyle = color;
        this.ctx.fill();
        if (this.options.showLabels && star.name && star.magnitude < 2.5) {
          this.ctx.fillStyle = 'rgba(255,255,255,0.9)';
          this.ctx.font = '10px Space Mono, monospace';
          this.ctx.textAlign = 'center';
          this.ctx.fillText(star.name, star.x, star.y + r + 12);
        }
      }
    }

    for (const body of sceneData.bodies) {
      if (body.onScreen) {
        drawIcon(this.ctx, { x: body.x, y: body.y }, body.label, body.color);
      }
    }

    for (const arc of sceneData.overlays) {
      drawGeodesicArc(this.ctx, arc.points, arc.label);
    }

    for (const lbl of sceneData.labels) {
      this.ctx.fillStyle = '#00f2ff';
      this.ctx.font = 'bold 12px Space Mono, monospace';
      this.ctx.fillText(lbl.text, lbl.x, lbl.y);
    }
  }

  drawOffscreenArrow(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    heading: number,
    az: number,
    color: string
  ) {
    drawDirectionalArrow(ctx, w, h, heading, az, color);
  }

  dispose(): void {}
}