import type { Point } from "../types/drawing";

export function getCanvasPoint(
  clientX: number,
  clientY: number,
  bounds: DOMRect,
  zoom: number,
): Point {
  return {
    x: (clientX - bounds.left) / zoom,
    y: (clientY - bounds.top) / zoom,
  };
}

export function getBounds(start: Point, end: Point) {
  return {
    x: Math.min(start.x, end.x),
    y: Math.min(start.y, end.y),
    width: Math.abs(end.x - start.x),
    height: Math.abs(end.y - start.y),
  };
}
