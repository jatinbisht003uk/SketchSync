import { useCanvasStore } from "../store/canvasStore";
import type { DrawingTool } from "../types/drawing";
import { ArrowDownRight, ArrowRight, Circle, Diamond, Eraser, Hand, MousePointer2, Pencil, RectangleHorizontal, Type, Undo2, Redo2, Trash2 } from "lucide-react";

const tools: { id: DrawingTool; label: string; icon: ReactNode }[] = [
  { id: "select", label: "Select", icon: <MousePointer2 size={19} /> },
  { id: "hand", label: "Hand", icon: <Hand size={19} /> },
  { id: "draw", label: "Pencil", icon: <Pencil size={19} /> },
  { id: "rectangle", label: "Rectangle", icon: <RectangleHorizontal size={19} /> },
  { id: "ellipse", label: "Ellipse", icon: <Circle size={19} /> },
  { id: "line", label: "Line", icon: <ArrowRight size={19} /> },
  { id: "arrow", label: "Arrow", icon: <ArrowDownRight size={19} /> },
  { id: "diamond", label: "Diamond", icon: <Diamond size={19} /> },
  { id: "text", label: "Text", icon: <Type size={19} /> },
  { id: "eraser", label: "Eraser", icon: <Eraser size={19} /> },
];

export default function Toolbar() {
  const tool = useCanvasStore((state) => state.tool);
  const setTool = useCanvasStore((state) => state.setTool);
  const undo = useCanvasStore((state) => state.undo);
  const clear = useCanvasStore((state) => state.clear);
  const redo = useCanvasStore((state) => state.redo);
  const canRedo = useCanvasStore((state) => state.future.length > 0);
  const canUndo = useCanvasStore((state) => state.past.length > 0);
  const hasStrokes = useCanvasStore((state) => state.strokes.length > 0);

  return (
    <aside className="toolbar">
      <div className="toolbar-heading">TOOLS</div>
      <div className="tool-grid">
        {tools.map((item) => (
          <button
            key={item.id}
            type="button"
            title={`${item.label} (${({ select: "V", draw: "P", rectangle: "R", ellipse: "O", line: "L", arrow: "A", text: "T", eraser: "E" } as Partial<Record<DrawingTool, string>>)[item.id] ?? ""})`}
            aria-label={item.label}
            aria-pressed={tool === item.id}
            className={`tool-button ${tool === item.id ? "active" : ""}`}
            onClick={() => setTool(item.id)}
          >
            <span className="tool-icon">{item.icon}</span>
            <span className="tool-label">{item.label}</span>
          </button>
        ))}
      </div>
      <div className="toolbar-divider" />
      <div className="toolbar-heading">ACTIONS</div>
      <button className="action-button" type="button" disabled={!canUndo} onClick={undo}>
        <Undo2 size={16} /> <span>Undo</span>
        <kbd>⌘ Z</kbd>
      </button>
      <button className="action-button" type="button" disabled={!canRedo} onClick={redo}>
        <Redo2 size={16} /> <span>Redo</span>
        <kbd>⇧ ⌘ Z</kbd>
      </button>
      <button className="action-button" type="button" disabled={!hasStrokes} onClick={() => { if (window.confirm("Clear every object from this board?")) clear(); }}>
        <Trash2 size={16} /> <span>Clear canvas</span>
      </button>
      <div className="sidebar-footer">
        <span className="avatar">Y</span>
        <div>
          <strong>Your workspace</strong>
          <span>Local session</span>
        </div>
      </div>
    </aside>
  );
}
import type { ReactNode } from "react";
