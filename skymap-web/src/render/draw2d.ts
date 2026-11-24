import type { Point2D } from '../projection.ts';
import type { CelestialSprite } from './types.ts';

export function clearCanvas(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.clearRect(0, 0, width, height);
}

export function magnitudeColor(bv: number): string {
  if (bv < 0) return '#9bb0ff';
  if (bv < 0.3) return '#cad7ff';
  if (bv < 0.6) return '#f8f7ff';
  if (bv < 1.0) return '#fff4ea';
  return '#ffd2a1';
}

export function magnitudeRadius(mag: number): number {
  return Math.max(1.2, 4.6 - 0.65 * mag);
}

export function drawIcon(ctx: CanvasRenderingContext2D, pt: Point2D, label: string, color: string) {
  ctx.save();
  ctx.translate(pt.x, pt.y);

  ctx.beginPath();
  ctx.arc(0, 0, 12, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.85)';
  ctx.lineWidth = 1.5;
  ctx.stroke();

  ctx.fillStyle = '#ffffff';
  ctx.font = "bold 12px 'Space Mono', monospace";
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 4;
  ctx.fillText(label, 0, 28);

  ctx.restore();
}

export function drawPlanetSprite(ctx: CanvasRenderingContext2D, body: CelestialSprite) {
  ctx.save();
  ctx.translate(body.x, body.y);

  const radius =
    body.kind === 'sun'
      ? 15
      : body.kind === 'moon'
      ? 13
      : body.kind === 'dso'
      ? 7
      : Math.max(6, Math.min(11, 9 - (body.magnitude ?? 0) * 0.6));

  if (body.selected) {
    ctx.beginPath();
    ctx.arc(0, 0, radius + 8, 0, Math.PI * 2);
    ctx.strokeStyle = '#00f2ff';
    ctx.lineWidth = 1.8;
    ctx.setLineDash([4, 3]);
    ctx.stroke();
    ctx.setLineDash([]);
  }

  if (body.kind === 'dso') {
    ctx.beginPath();
    ctx.ellipse(0, 0, radius * 1.4, radius * 0.8, -0.4, 0, Math.PI * 2);
    ctx.strokeStyle = body.color;
    ctx.lineWidth = 1.4;
    ctx.stroke();
  } else {
    // Outer atmospheric glow
    const grad = ctx.createRadialGradient(0, 0, radius * 0.2, 0, 0, radius * 2.2);
    grad.addColorStop(0, body.color);
    grad.addColorStop(1, 'transparent');
    ctx.fillStyle = grad;
    ctx.beginPath();
    ctx.arc(0, 0, radius * 2.2, 0, Math.PI * 2);
    ctx.fill();

    // Planetary disc
    ctx.beginPath();
    ctx.arc(0, 0, radius, 0, Math.PI * 2);
    ctx.fillStyle = body.color;
    ctx.fill();
    ctx.strokeStyle = 'rgba(255,255,255,0.8)';
    ctx.lineWidth = 1.2;
    ctx.stroke();

    // Distinct visual features
    if (body.label === 'Saturn') {
      ctx.beginPath();
      ctx.ellipse(0, 0, radius * 2.1, radius * 0.55, -0.32, 0, Math.PI * 2);
      ctx.strokeStyle = '#fde68a';
      ctx.lineWidth = 2;
      ctx.stroke();
    } else if (body.label === 'Jupiter') {
      ctx.beginPath();
      ctx.moveTo(-radius * 0.85, -radius * 0.25);
      ctx.lineTo(radius * 0.85, -radius * 0.25);
      ctx.moveTo(-radius * 0.9, radius * 0.2);
      ctx.lineTo(radius * 0.9, radius * 0.2);
      ctx.strokeStyle = 'rgba(180, 83, 9, 0.7)';
      ctx.lineWidth = 1.5;
      ctx.stroke();
    }
  }

  // Label
  ctx.fillStyle = body.selected ? '#00f2ff' : '#ffffff';
  ctx.font = "bold 11px 'Space Mono', monospace";
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.9)';
  ctx.shadowBlur = 4;
  const magTag = body.magnitude != null && body.kind === 'planet' ? ` (${body.magnitude.toFixed(1)})` : '';
  ctx.fillText(`${body.label}${magTag}`, 0, radius + 16);

  ctx.restore();
}

export function drawDirectionalArrow(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  currentHeading: number,
  targetAzimuth: number,
  color: string,
  label?: string
) {
  let diff = targetAzimuth - currentHeading;
  while (diff < -180) diff += 360;
  while (diff > 180) diff -= 360;

  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy) - 44;
  const angleOnScreen = (diff * Math.PI) / 180 - Math.PI / 2;
  const arrowX = cx + Math.cos(angleOnScreen) * radius;
  const arrowY = cy + Math.sin(angleOnScreen) * radius;

  ctx.save();
  ctx.translate(arrowX, arrowY);
  ctx.rotate(angleOnScreen + Math.PI / 2);

  ctx.beginPath();
  ctx.moveTo(0, -14);
  ctx.lineTo(9, 9);
  ctx.lineTo(0, 4);
  ctx.lineTo(-9, 9);
  ctx.closePath();

  ctx.fillStyle = color;
  ctx.shadowColor = 'rgba(0,0,0,0.6)';
  ctx.shadowBlur = 4;
  ctx.fill();
  ctx.restore();

  if (label) {
    ctx.save();
    ctx.fillStyle = color;
    ctx.font = "bold 10px 'Space Mono', monospace";
    ctx.textAlign = 'center';
    ctx.fillText(label, arrowX, arrowY + 20);
    ctx.restore();
  }
}

export function drawGeodesicArc(
  ctx: CanvasRenderingContext2D,
  points: Point2D[],
  label: string
) {
  if (points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = '#00f2ff';
  ctx.lineWidth = 2;
  ctx.setLineDash([6, 4]);
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) {
    ctx.lineTo(points[i].x, points[i].y);
  }
  ctx.stroke();
  ctx.setLineDash([]);

  const mid = points[Math.floor(points.length / 2)];
  ctx.fillStyle = '#00f2ff';
  ctx.font = "bold 12px 'Space Mono', monospace";
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.85)';
  ctx.shadowBlur = 4;
  ctx.fillText(label, mid.x, mid.y - 10);
  ctx.restore();
}
