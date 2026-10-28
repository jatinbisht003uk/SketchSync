import type { Point, Stroke } from "../types/drawing";
import { getBounds } from "./geometry";

export function renderStrokes(context: CanvasRenderingContext2D, strokes: Stroke[], activeStroke: Stroke | null, selection: string[] = []) {
  context.save();
  context.setTransform(1, 0, 0, 1, 0, 0);
  context.clearRect(0, 0, context.canvas.width, context.canvas.height);
  context.restore();
  for (const stroke of activeStroke ? [...strokes, activeStroke] : strokes) {
    context.save(); drawStroke(context, stroke); context.restore();
    if (selection.includes(stroke.id)) drawSelection(context, stroke);
  }
}

export function strokeBounds(stroke: Stroke) {
  const [start, end] = stroke.points;
  if (!start) return { x: 0, y: 0, width: 0, height: 0 };
  if (stroke.kind === "freehand") {
    const xs = stroke.points.map((point) => point.x); const ys = stroke.points.map((point) => point.y);
    const minX = Math.min(...xs); const minY = Math.min(...ys);
    return { x: minX, y: minY, width: Math.max(...xs) - minX, height: Math.max(...ys) - minY };
  }
  if (stroke.kind === "text") return { x: start.x, y: start.y - 20, width: Math.max(24, (stroke.text ?? "").length * stroke.width * 5), height: stroke.width * 10 };
  return end ? getBounds(start, end) : { x: start.x, y: start.y, width: 0, height: 0 };
}

export function hitTest(stroke: Stroke, point: Point, tolerance = 8) {
  const bounds = strokeBounds(stroke);
  if (stroke.kind === "ellipse") {
    const rx = Math.max(bounds.width / 2, 1) + tolerance; const ry = Math.max(bounds.height / 2, 1) + tolerance;
    const dx = point.x - (bounds.x + bounds.width / 2); const dy = point.y - (bounds.y + bounds.height / 2);
    const outer = (dx * dx) / (rx * rx) + (dy * dy) / (ry * ry);
    const inner = (dx * dx) / (Math.max(rx - tolerance * 2, 1) ** 2) + (dy * dy) / (Math.max(ry - tolerance * 2, 1) ** 2);
    return outer <= 1 && (stroke.fill !== "transparent" || inner >= 1);
  }
  return point.x >= bounds.x - tolerance && point.x <= bounds.x + bounds.width + tolerance && point.y >= bounds.y - tolerance && point.y <= bounds.y + bounds.height + tolerance;
}

function drawStroke(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  const [start, end] = stroke.points;
  if (!start) return;
  ctx.beginPath(); ctx.strokeStyle = stroke.color; ctx.fillStyle = stroke.fill === "transparent" ? "rgba(0,0,0,0)" : stroke.fill;
  ctx.lineWidth = stroke.width; ctx.lineCap = "round"; ctx.lineJoin = "round";
  ctx.setLineDash(stroke.dash === "dashed" ? [8, 6] : []);
  ctx.globalCompositeOperation = stroke.compositeOperation ?? "source-over";
  if (stroke.kind === "freehand") {
    ctx.moveTo(start.x, start.y);
    if (stroke.points.length === 1) ctx.lineTo(start.x + 0.1, start.y + 0.1);
    else for (const point of stroke.points.slice(1)) ctx.lineTo(point.x, point.y);
    ctx.stroke(); return;
  }
  if (stroke.kind === "text") { ctx.font = `${Math.max(14, stroke.width * 8)}px "DM Sans", sans-serif`; ctx.fillStyle = stroke.color; ctx.fillText(stroke.text ?? "", start.x, start.y); return; }
  if (!end) return;
  if (stroke.kind === "rectangle") {
    const b = getBounds(start, end); if (stroke.fill !== "transparent") ctx.fillRect(b.x, b.y, b.width, b.height); ctx.strokeRect(b.x, b.y, b.width, b.height); return;
  }
  if (stroke.kind === "ellipse") {
    const b = getBounds(start, end); ctx.ellipse(b.x + b.width / 2, b.y + b.height / 2, Math.max(b.width / 2, 0.1), Math.max(b.height / 2, 0.1), 0, 0, Math.PI * 2);
    if (stroke.fill !== "transparent") ctx.fill(); ctx.stroke(); return;
  }
  if (stroke.kind === "diamond") {
    const b = getBounds(start, end); ctx.moveTo(b.x + b.width / 2, b.y); ctx.lineTo(b.x + b.width, b.y + b.height / 2); ctx.lineTo(b.x + b.width / 2, b.y + b.height); ctx.lineTo(b.x, b.y + b.height / 2); ctx.closePath();
    if (stroke.fill !== "transparent") ctx.fill(); ctx.stroke(); return;
  }
  ctx.moveTo(start.x, start.y); ctx.lineTo(end.x, end.y);
  if (stroke.kind === "arrow") {
    const angle = Math.atan2(end.y - start.y, end.x - start.x); const size = Math.max(10, stroke.width * 4);
    ctx.lineTo(end.x - size * Math.cos(angle - Math.PI / 6), end.y - size * Math.sin(angle - Math.PI / 6));
    ctx.moveTo(end.x, end.y); ctx.lineTo(end.x - size * Math.cos(angle + Math.PI / 6), end.y - size * Math.sin(angle + Math.PI / 6));
  }
  ctx.stroke();
}

function drawSelection(ctx: CanvasRenderingContext2D, stroke: Stroke) {
  const b = strokeBounds(stroke); ctx.save(); ctx.setLineDash([4, 4]); ctx.strokeStyle = "#695cff"; ctx.lineWidth = 1;
  ctx.strokeRect(b.x - 5, b.y - 5, b.width + 10, b.height + 10); ctx.setLineDash([]); ctx.fillStyle = "#ffffff"; ctx.strokeStyle = "#695cff";
  for (const [x, y] of [[b.x - 5, b.y - 5], [b.x + b.width + 5, b.y - 5], [b.x - 5, b.y + b.height + 5], [b.x + b.width + 5, b.y + b.height + 5]]) { ctx.fillRect(x - 3, y - 3, 6, 6); ctx.strokeRect(x - 3, y - 3, 6, 6); }
  ctx.restore();
}
