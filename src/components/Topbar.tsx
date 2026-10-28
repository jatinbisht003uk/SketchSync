import { useRef, type RefObject } from "react";
import { Download, FileUp, Moon, Plus, Share2, Sun } from "lucide-react";
import type { CanvasHandle } from "./Canvas";
import RoomPanel from "./RoomPanel";
import { useCanvasStore } from "../store/canvasStore";
import type { Stroke } from "../types/drawing";

type Props = { canvasRef: RefObject<CanvasHandle | null>; createRoom: () => void };
export default function Topbar({ canvasRef, createRoom }: Props) {
  const importRef = useRef<HTMLInputElement>(null);
  const strokes = useCanvasStore((state) => state.strokes);
  const theme = useCanvasStore((state) => state.theme);
  const setTheme = useCanvasStore((state) => state.setTheme);
  const exportJson = () => {
    const payload = { format: "sketchsync-board", version: 1, background: useCanvasStore.getState().background, strokes };
    const blob = new Blob([JSON.stringify(payload, null, 2)], { type: "application/json" });
    const link = document.createElement("a"); link.href = URL.createObjectURL(blob); link.download = "sketchsync-board.json"; link.click(); URL.revokeObjectURL(link.href);
  };
  const importJson = async (file?: File) => {
    if (!file) return;
    try {
      if (file.size > 20 * 1024 * 1024) throw new Error("Board files must be smaller than 20 MB.");
      const data: unknown = JSON.parse(await file.text());
      if (!data || typeof data !== "object" || (data as { format?: unknown }).format !== "sketchsync-board" || (data as { version?: unknown }).version !== 1 || !Array.isArray((data as { strokes?: unknown }).strokes)) throw new Error("This file does not contain a supported SketchSync board.");
      const incoming = (data as { strokes: unknown[] }).strokes;
      if (incoming.length > 10_000) throw new Error("This board has too many drawing objects to import.");
      const ids = new Set<string>();
      const valid = incoming.every((stroke) => {
        if (!stroke || typeof stroke !== "object") return false;
        const s = stroke as Partial<Stroke>;
        const validId = typeof s.id === "string" && s.id.length > 0 && s.id.length <= 64 && !ids.has(s.id);
        if (validId) ids.add(s.id!);
        return validId && ["freehand", "rectangle", "ellipse", "line", "arrow", "diamond", "text"].includes(s.kind ?? "") && Array.isArray(s.points) && s.points.length > 0 && s.points.length < 100_000 && s.points.every((p) => p && typeof p === "object" && Number.isFinite((p as { x: number }).x) && Number.isFinite((p as { y: number }).y) && Math.abs((p as { x: number }).x) < 10_000_000 && Math.abs((p as { y: number }).y) < 10_000_000) && typeof s.color === "string" && /^#[0-9a-f]{6}$/i.test(s.color) && (s.fill === "transparent" || (typeof s.fill === "string" && /^#[0-9a-f]{6}$/i.test(s.fill))) && (s.dash === "solid" || s.dash === "dashed") && (s.compositeOperation === undefined || s.compositeOperation === "source-over" || s.compositeOperation === "destination-out") && Number.isFinite(s.width) && (s.width ?? 0) > 0 && s.width! <= 100 && (s.kind !== "text" || (typeof s.text === "string" && s.text.length <= 2000));
      });
      if (!valid) throw new Error("The board contains invalid drawing objects.");
      const background = (data as { background?: unknown }).background;
      if (typeof background !== "string" || !/^#[0-9a-f]{6}$/i.test(background)) throw new Error("This board has an invalid background color.");
      useCanvasStore.getState().replaceStrokes(incoming as Stroke[]);
      useCanvasStore.getState().setBackground(background);
    } catch (error) { window.alert(error instanceof Error ? error.message : "Could not import that board file."); }
  };
  const share = async () => { try { await navigator.clipboard.writeText(window.location.href); useCanvasStore.getState().setStatusMessage("Room link copied"); } catch { window.prompt("Copy this room link", window.location.href); } };
  return <header className="topbar">
    <div className="brand"><div className="brand-icon">S</div><div><h1>SketchSync</h1><span>Collaborative whiteboard</span></div></div>
    <RoomPanel />
    <div className="top-actions">
      <button className="secondary-button icon-button" type="button" title="Create a new room" onClick={createRoom}><Plus size={16} /> New room</button>
      <button className="secondary-button icon-button" type="button" title="Copy room link" onClick={() => void share()}><Share2 size={16} /> Share</button>
      <button className="secondary-button icon-button" type="button" title="Import JSON board" onClick={() => importRef.current?.click()}><FileUp size={16} /> Import</button>
      <input ref={importRef} type="file" accept="application/json,.json" hidden onChange={(event) => { void importJson(event.target.files?.[0]); event.target.value = ""; }} />
      <button className="secondary-button icon-button" type="button" title="Export JSON" onClick={exportJson}><Download size={16} /> JSON</button>
      <button className="secondary-button icon-button" type="button" title="Toggle theme" onClick={() => setTheme(theme === "light" ? "dark" : "light")}>{theme === "light" ? <Moon size={16} /> : <Sun size={16} />}</button>
      <button className="primary-button" type="button" onClick={() => canvasRef.current?.exportImage()}>PNG</button>
    </div>
  </header>;
}
