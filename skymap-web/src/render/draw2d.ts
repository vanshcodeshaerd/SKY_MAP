import type { Point2D } from '../projection.ts';

export function clearCanvas(ctx: CanvasRenderingContext2D, width: number, height: number) {
  ctx.clearRect(0, 0, width, height);
}

export function magnitudeRadius(mag: number): number {
  return Math.max(0.8, 4.5 - mag * 0.6);
}

export function magnitudeColor(colorIndex: number): string {
  if (colorIndex < 0) return '#aabfff';
  if (colorIndex < 0.4) return '#ffffff';
  if (colorIndex < 1.0) return '#ffeeaa';
  return '#ffaa88';
}

export function drawIcon(ctx: CanvasRenderingContext2D, pt: Point2D, label: string, color: string) {
  ctx.save();
  ctx.translate(pt.x, pt.y);
  ctx.beginPath();
  ctx.arc(0, 0, 15, 0, 2 * Math.PI);
  ctx.fillStyle = color;
  ctx.fill();
  ctx.strokeStyle = 'rgba(255, 255, 255, 0.8)';
  ctx.lineWidth = 2;
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = "bold 14px 'Inter', sans-serif";
  ctx.textAlign = 'center';
  ctx.shadowColor = 'rgba(0,0,0,0.8)';
  ctx.shadowBlur = 4;
  ctx.fillText(label, 0, 35);
  ctx.restore();
}

export function drawDirectionalArrow(
  ctx: CanvasRenderingContext2D,
  width: number,
  height: number,
  currentHeading: number,
  targetAzimuth: number,
  color: string
) {
  let diff = targetAzimuth - currentHeading;
  while (diff < -180) diff += 360;
  while (diff > 180) diff -= 360;
  const cx = width / 2;
  const cy = height / 2;
  const radius = Math.min(cx, cy) - 40;
  const angleOnScreen = (diff * Math.PI) / 180 - Math.PI / 2;
  const arrowX = cx + Math.cos(angleOnScreen) * radius;
  const arrowY = cy + Math.sin(angleOnScreen) * radius;
  ctx.save();
  ctx.translate(arrowX, arrowY);
  ctx.rotate(angleOnScreen + Math.PI / 2);
  ctx.beginPath();
  ctx.moveTo(0, -15);
  ctx.lineTo(10, 10);
  ctx.lineTo(0, 5);
  ctx.lineTo(-10, 10);
  ctx.closePath();
  ctx.fillStyle = color;
  ctx.fill();
  ctx.restore();
}

export function drawGeodesicArc(ctx: CanvasRenderingContext2D, points: Point2D[], label: string) {
  if (points.length < 2) return;
  ctx.save();
  ctx.strokeStyle = '#00f2ff';
  ctx.lineWidth = 2;
  ctx.shadowColor = '#00f2ff';
  ctx.shadowBlur = 8;
  ctx.beginPath();
  ctx.moveTo(points[0].x, points[0].y);
  for (let i = 1; i < points.length; i++) ctx.lineTo(points[i].x, points[i].y);
  ctx.stroke();
  const mid = points[Math.floor(points.length / 2)];
  ctx.fillStyle = '#fff';
  ctx.font = '12px Space Mono, monospace';
  ctx.fillText(label, mid.x + 8, mid.y - 8);
  ctx.restore();
}