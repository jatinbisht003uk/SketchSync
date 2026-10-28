import { forwardRef, useCallback, useEffect, useImperativeHandle, useRef } from "react";
import { getCanvasPoint } from "../engine/geometry";
import { hitTest, renderStrokes, strokeBounds } from "../engine/renderer";
import { useDrawing } from "../hooks/useDrawing";
import { useCanvasStore } from "../store/canvasStore";
import type { Participant, Stroke } from "../types/drawing";

export type CanvasHandle = { exportImage: () => void };
type Props = { sendCursor: (x: number, y: number) => void };
const Canvas = forwardRef<CanvasHandle, Props>(function Canvas({ sendCursor }, ref) {
  const canvasRef = useRef<HTMLCanvasElement>(null); const containerRef = useRef<HTMLDivElement>(null);
  const panRef = useRef<{ x: number; y: number; offset: { x: number; y: number } } | null>(null);
  const strokes = useCanvasStore((state) => state.strokes); const selection = useCanvasStore((state) => state.selection);
  const zoom = useCanvasStore((state) => state.zoom); const scale = zoom / 100;
  const offset = useCanvasStore((state) => state.offset); const tool = useCanvasStore((state) => state.tool);
  const participants = useCanvasStore((state) => state.participants); const selfId = useCanvasStore((state) => state.selfId);
  const background = useCanvasStore((state) => state.background);
  const { activeStroke, onPointerDown, onPointerMove, onPointerUp } = useDrawing();

  const redraw = useCallback((target: HTMLCanvasElement | null, items: Stroke[], active: Stroke | null) => {
    const context = target?.getContext("2d"); if (!context) return;
    const dpr = window.devicePixelRatio || 1;
    context.setTransform(dpr * scale, 0, 0, dpr * scale, dpr * offset.x, dpr * offset.y);
    renderStrokes(context, items, active, selection);
  }, [offset, scale, selection]);

  useEffect(() => {
    const canvas = canvasRef.current; const container = containerRef.current; if (!canvas || !container) return;
    const resize = () => { const rect = container.getBoundingClientRect(); const dpr = window.devicePixelRatio || 1;
      canvas.width = Math.max(1, Math.round(rect.width * dpr)); canvas.height = Math.max(1, Math.round(rect.height * dpr)); redraw(canvas, useCanvasStore.getState().strokes, activeStroke.current); };
    const observer = new ResizeObserver(resize); observer.observe(container); resize(); return () => observer.disconnect();
  }, [redraw, activeStroke]);
  useEffect(() => redraw(canvasRef.current, strokes, activeStroke.current), [redraw, strokes, activeStroke]);

  const pointFromEvent = (clientX: number, clientY: number, bounds: DOMRect) => {
    const point = getCanvasPoint(clientX, clientY, bounds, scale);
    return { x: point.x - offset.x / scale, y: point.y - offset.y / scale };
  };
  const handlePointerDown = (event: React.PointerEvent<HTMLCanvasElement>) => {
    if (tool === "hand") { event.preventDefault(); event.currentTarget.setPointerCapture(event.pointerId); panRef.current = { x: event.clientX, y: event.clientY, offset }; return; }
    onPointerDown(event, pointFromEvent(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect())); redraw(canvasRef.current, strokes, activeStroke.current);
  };
  const handlePointerMove = (event: React.PointerEvent<HTMLCanvasElement>) => {
    const point = pointFromEvent(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect()); sendCursor(point.x, point.y);
    if (panRef.current) { const pan = panRef.current; useCanvasStore.getState().setOffset({ x: pan.offset.x + event.clientX - pan.x, y: pan.offset.y + event.clientY - pan.y }); return; }
    if (!activeStroke.current && tool !== "select") return;
    onPointerMove(point); redraw(canvasRef.current, strokes, activeStroke.current);
  };
  const handlePointerUp = () => { panRef.current = null; onPointerUp(); redraw(canvasRef.current, useCanvasStore.getState().strokes, null); };
  const handleWheel = (event: React.WheelEvent<HTMLCanvasElement>) => {
    event.preventDefault(); const bounds = event.currentTarget.getBoundingClientRect();
    const px = event.clientX - bounds.left; const py = event.clientY - bounds.top;
    const state = useCanvasStore.getState(); const next = Math.max(25, Math.min(300, state.zoom * (event.deltaY < 0 ? 1.1 : 0.9)));
    const ratio = next / state.zoom; state.setOffset({ x: px - (px - state.offset.x) * ratio, y: py - (py - state.offset.y) * ratio }); state.setZoom(Math.round(next));
  };
  const handleDoubleClick = (event: React.MouseEvent<HTMLCanvasElement>) => {
    const point = pointFromEvent(event.clientX, event.clientY, event.currentTarget.getBoundingClientRect());
    const text = [...useCanvasStore.getState().strokes].reverse().find((stroke) => stroke.kind === "text" && hitTest(stroke, point));
    if (!text) return;
    const value = window.prompt("Edit text", text.text ?? "");
    if (value?.trim()) useCanvasStore.getState().updateStroke({ ...text, text: value.trim() });
  };

  useImperativeHandle(ref, () => ({ exportImage() {
    const canvas = canvasRef.current; if (!canvas) return;
    const ratio = window.devicePixelRatio || 1; const bounds = canvas.getBoundingClientRect();
    const output = document.createElement("canvas"); output.width = Math.max(1, Math.round(bounds.width * ratio)); output.height = Math.max(1, Math.round(bounds.height * ratio));
    const context = output.getContext("2d"); if (!context) return;
    context.fillStyle = background; context.fillRect(0, 0, output.width, output.height); context.setTransform(ratio * scale, 0, 0, ratio * scale, ratio * offset.x, ratio * offset.y);
    renderStrokes(context, useCanvasStore.getState().strokes, null);
    const link = document.createElement("a"); link.download = "sketchsync-board.png"; link.href = output.toDataURL("image/png"); link.click();
  } }), [background, offset, scale]);

  const fitCanvas = () => {
    const bounds = containerRef.current?.getBoundingClientRect(); if (!bounds || !strokes.length) { useCanvasStore.getState().setZoom(100); useCanvasStore.getState().setOffset({ x: 0, y: 0 }); return; }
    const boxes = strokes.map(strokeBounds); const x = Math.min(...boxes.map((box) => box.x)); const y = Math.min(...boxes.map((box) => box.y));
    const width = Math.max(...boxes.map((box) => box.x + box.width)) - x; const height = Math.max(...boxes.map((box) => box.y + box.height)) - y;
    const nextScale = Math.min(2.5, (bounds.width - 48) / Math.max(width, 1), (bounds.height - 48) / Math.max(height, 1));
    useCanvasStore.getState().setZoom(Math.round(nextScale * 100)); useCanvasStore.getState().setOffset({ x: bounds.width / 2 - (x + width / 2) * nextScale, y: bounds.height / 2 - (y + height / 2) * nextScale });
  };

  return <section className="canvas-area">
    <div className="canvas-toolbar"><span className="canvas-title">Whiteboard</span><span className="canvas-hint">{tool === "text" ? "Click anywhere to add text" : "Ideas, sketches, and diagrams"}</span></div>
    <div className={`canvas-placeholder tool-${tool}`} ref={containerRef} style={{ backgroundColor: background }}>
      <canvas ref={canvasRef} className="drawing-canvas" aria-label="Whiteboard drawing area" onPointerDown={handlePointerDown} onPointerMove={handlePointerMove} onPointerUp={handlePointerUp} onPointerCancel={handlePointerUp} onLostPointerCapture={handlePointerUp} onDoubleClick={handleDoubleClick} onWheel={handleWheel} />
      {strokes.length === 0 && !activeStroke.current && <div className="welcome-card"><div className="welcome-icon">✎</div><h2>Your ideas start here.</h2><p>Pick a tool and begin drawing. Your board saves automatically.</p><div className="welcome-shortcut"><kbd>P</kbd><span className="shortcut-description">Pencil · V to select · Space to pan</span></div></div>}
      <div className="remote-cursors">{participants.filter((person: Participant) => person.id !== selfId && person.cursor).map((person) => <div className="remote-cursor" key={person.id} style={{ left: person.cursor!.x * scale + offset.x, top: person.cursor!.y * scale + offset.y, color: person.color }}><span>{person.name}</span></div>)}</div>
    </div>
    <div className="canvas-footer"><div className="zoom-controls"><button type="button" aria-label="Zoom out" onClick={() => useCanvasStore.getState().setZoom(zoom - 10)}>−</button><button type="button" className="zoom-value" onClick={() => { useCanvasStore.getState().setZoom(100); useCanvasStore.getState().setOffset({ x: 0, y: 0 }); }} title="Reset zoom">{zoom}%</button><button type="button" aria-label="Zoom in" onClick={() => useCanvasStore.getState().setZoom(zoom + 10)}>+</button><button type="button" onClick={fitCanvas} title="Fit drawings">Fit</button></div><span className="canvas-status">{strokes.length} {strokes.length === 1 ? "object" : "objects"}</span></div>
  </section>;
});
export default Canvas;
