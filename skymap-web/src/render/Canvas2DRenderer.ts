import type { IRenderer } from './IRenderer.ts';
import type { RenderMode, RenderOptions, SkySceneData } from './types.ts';
import {
  clearCanvas,
  drawDirectionalArrow,
  drawGeodesicArc,
  drawPlanetSprite,
  magnitudeColor,
  magnitudeRadius,
} from './draw2d.ts';

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
      // Keep ar-canvas visible in both AR and VR_PLANETARIUM so stars/planets render over the dome
      this.canvas.style.display = 'block';
      this.canvas.style.zIndex = mode === 'VR_PLANETARIUM' ? '9' : '2';
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
    const ctx = this.ctx;
    clearCanvas(ctx, this.canvas.width, this.canvas.height);

    const vis = sceneData.visibility;
    const limit = sceneData.bortle <= 3 ? 6.5 : sceneData.bortle <= 5 ? 4.8 : 3.2;

    if (vis.constellations && vis.constellationLines && this.options.showLines) {
      for (const seg of sceneData.lines) {
        if (!seg.visible) continue;
        ctx.save();
        if (seg.highlighted) {
          ctx.strokeStyle = 'rgba(0, 242, 255, 0.92)';
          ctx.lineWidth = 2.4;
          ctx.shadowColor = 'rgba(0, 242, 255, 0.6)';
          ctx.shadowBlur = 6;
        } else {
          ctx.strokeStyle = 'rgba(56, 189, 248, 0.34)';
          ctx.lineWidth = 1.25;
        }
        ctx.beginPath();
        ctx.moveTo(seg.x1, seg.y1);
        ctx.lineTo(seg.x2, seg.y2);
        ctx.stroke();
        ctx.restore();
      }
    }

    if (vis.stars && this.options.showStars) {
      for (const star of sceneData.stars) {
        if (!star.onScreen || star.magnitude > Math.min(limit, this.options.magLimit)) continue;
        const r = magnitudeRadius(star.magnitude);
        const color = magnitudeColor(star.colorIndex);
        const inActiveCon =
          sceneData.activeConstellationId &&
          star.constellationId?.toLowerCase() === sceneData.activeConstellationId.toLowerCase();

        if (star.magnitude < 1.5 || inActiveCon) {
          const glow = ctx.createRadialGradient(star.x, star.y, r * 0.2, star.x, star.y, r * 3.5);
          glow.addColorStop(0, color);
          glow.addColorStop(1, 'transparent');
          ctx.fillStyle = glow;
          ctx.beginPath();
          ctx.arc(star.x, star.y, r * 3.5, 0, Math.PI * 2);
          ctx.fill();
        }

        ctx.beginPath();
        ctx.arc(star.x, star.y, r, 0, Math.PI * 2);
        ctx.fillStyle = color;
        ctx.fill();

        if (this.options.showLabels && star.name && (star.magnitude < 2.6 || inActiveCon)) {
          ctx.fillStyle = inActiveCon ? '#00f2ff' : 'rgba(255,255,255,0.88)';
          ctx.font = "10px 'Space Mono', monospace";
          ctx.textAlign = 'center';
          ctx.fillText(star.name, star.x, star.y + r + 12);
        }
      }
    }

    for (const body of sceneData.bodies) {
      if (body.onScreen) {
        drawPlanetSprite(ctx, body);
      }
    }

    if (vis.constellations && vis.constellationLabels && this.options.showLabels) {
      for (const lbl of sceneData.labels) {
        ctx.save();
        ctx.fillStyle = lbl.highlighted ? '#00f2ff' : 'rgba(148, 210, 255, 0.72)';
        ctx.font = lbl.highlighted ? "bold 12px 'Space Mono', monospace" : "10px 'Space Mono', monospace";
        ctx.textAlign = 'center';
        ctx.shadowColor = 'rgba(0,0,0,0.9)';
        ctx.shadowBlur = 4;
        ctx.fillText(lbl.text, lbl.x, lbl.y);
        ctx.restore();
      }
    }

    for (const arc of sceneData.overlays) {
      drawGeodesicArc(ctx, arc.points, arc.label);
    }
  }

  drawOffscreenArrow(
    ctx: CanvasRenderingContext2D,
    w: number,
    h: number,
    heading: number,
    az: number,
    color: string,
    label?: string
  ) {
    drawDirectionalArrow(ctx, w, h, heading, az, color, label);
  }

  dispose(): void {}
}
