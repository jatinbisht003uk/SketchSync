import { useCallback, useRef } from "react";
import type { PointerEvent } from "react";
import { nanoid } from "nanoid";
import { hitTest, strokeBounds } from "../engine/renderer";
import type { DrawingTool, Point, Stroke, StrokeKind } from "../types/drawing";
import { useCanvasStore } from "../store/canvasStore";

const shapeForTool: Partial<Record<DrawingTool, StrokeKind>> = {
  draw: "freehand", rectangle: "rectangle", ellipse: "ellipse", line: "line", arrow: "arrow", diamond: "diamond", eraser: "freehand",
};

export function useDrawing() {
  const activeStroke = useRef<Stroke | null>(null);
  const manipulation = useRef<{ kind: "move" | "resize"; start: Point; original: Stroke[]; anchor?: Point; bounds?: { x: number; y: number; width: number; height: number } } | null>(null);
  const begin = useCallback((point: Point) => {
    const { tool, color, fill, strokeWidth, dash } = useCanvasStore.getState();
    const kind = shapeForTool[tool];
    if (!kind) return;
    activeStroke.current = {
      id: nanoid(), kind, points: [point], color, fill, dash,
      width: tool === "eraser" ? Math.max(18, strokeWidth * 5) : strokeWidth,
      compositeOperation: tool === "eraser" ? "destination-out" : "source-over",
    };
  }, []);

  const move = useCallback((point: Point) => {
    const stroke = activeStroke.current;
    if (stroke) {
      if (stroke.kind === "freehand") stroke.points.push(point);
      else if (stroke.points.length === 1) stroke.points.push(point);
      else stroke.points[1] = point;
      return;
    }
    const drag = manipulation.current;
    if (!drag) return;
    const sx = drag.kind === "resize" && drag.anchor ? Math.max(0.05, (point.x - drag.anchor.x) / (drag.start.x - drag.anchor.x)) : 1;
    const sy = drag.kind === "resize" && drag.anchor ? Math.max(0.05, (point.y - drag.anchor.y) / (drag.start.y - drag.anchor.y)) : 1;
    const dx = point.x - drag.start.x; const dy = point.y - drag.start.y;
    for (const origin of drag.original) {
      const updated = { ...origin, points: origin.points.map((p) => drag.kind === "resize" && drag.anchor
        ? ({ x: drag.anchor!.x + (p.x - drag.anchor!.x) * sx, y: drag.anchor!.y + (p.y - drag.anchor!.y) * sy })
        : ({ x: p.x + dx, y: p.y + dy })) };
      useCanvasStore.getState().updateStroke(updated, false);
    }
  }, []);

  const finish = useCallback(() => {
    const stroke = activeStroke.current;
    if (stroke) { useCanvasStore.getState().addStroke(stroke); activeStroke.current = null; }
    if (manipulation.current) { useCanvasStore.getState().commitMove(manipulation.current.original); manipulation.current = null; }
  }, []);

  const onPointerDown = useCallback((event: PointerEvent<HTMLCanvasElement>, point: Point) => {
    if (event.pointerType === "mouse" && event.button !== 0) return;
    event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId);
    const current = useCanvasStore.getState();
    if (current.tool === "select") {
      const hit = [...current.strokes].reverse().find((stroke) => hitTest(stroke, point));
      if (!hit) { if (!event.shiftKey) current.setSelection([]); return; }
      let selection: string[];
      if (event.shiftKey) {
        selection = current.selection.includes(hit.id) ? current.selection.filter((id) => id !== hit.id) : [...current.selection, hit.id];
        current.setSelection(selection); if (!selection.includes(hit.id)) return;
      } else {
        selection = current.selection.includes(hit.id) ? current.selection : [hit.id];
      }
      current.setSelection(selection);
      const original = current.strokes.filter((stroke) => selection.includes(stroke.id));
      const boxes = original.map(strokeBounds);
      const bounds = { x: Math.min(...boxes.map((box) => box.x)), y: Math.min(...boxes.map((box) => box.y)), width: Math.max(...boxes.map((box) => box.x + box.width)) - Math.min(...boxes.map((box) => box.x)), height: Math.max(...boxes.map((box) => box.y + box.height)) - Math.min(...boxes.map((box) => box.y)) };
      const corners = [
        { point: { x: bounds.x, y: bounds.y }, anchor: { x: bounds.x + bounds.width, y: bounds.y + bounds.height } },
        { point: { x: bounds.x + bounds.width, y: bounds.y }, anchor: { x: bounds.x, y: bounds.y + bounds.height } },
        { point: { x: bounds.x, y: bounds.y + bounds.height }, anchor: { x: bounds.x + bounds.width, y: bounds.y } },
        { point: { x: bounds.x + bounds.width, y: bounds.y + bounds.height }, anchor: { x: bounds.x, y: bounds.y } },
      ];
      const handle = corners.find(({ point: handlePoint }) => Math.abs(point.x - handlePoint.x) <= 9 && Math.abs(point.y - handlePoint.y) <= 9);
      manipulation.current = handle
        ? { kind: "resize", start: handle.point, original, anchor: handle.anchor, bounds }
        : { kind: "move", start: point, original, bounds };
      return;
    }
    if (current.tool === "text") {
      const text = window.prompt("Enter text");
      if (text?.trim()) current.addStroke({ id: nanoid(), kind: "text", points: [point], color: current.color, fill: "transparent", dash: "solid", width: current.strokeWidth, text: text.trim() });
      return;
    }
    if (current.tool !== "hand") begin(point);
  }, [begin]);

  return { activeStroke, onPointerDown, onPointerMove: move, onPointerUp: finish };
}
