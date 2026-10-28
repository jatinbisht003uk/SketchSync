import { useEffect } from "react";
import { useCanvasStore } from "../store/canvasStore";
import type { DrawingTool } from "../types/drawing";

const shortcuts: Record<string, DrawingTool> = { v: "select", h: "hand", p: "draw", r: "rectangle", o: "ellipse", l: "line", a: "arrow", t: "text", e: "eraser" };
export function useKeyboardShortcuts() {
  useEffect(() => {
    let previousTool: DrawingTool | null = null;
    const handleKeyDown = (event: KeyboardEvent) => {
      const target = event.target;
      if (target instanceof HTMLElement && (target.isContentEditable || ["INPUT", "SELECT", "TEXTAREA"].includes(target.tagName))) return;
      const store = useCanvasStore.getState(); const key = event.key.toLowerCase();
      if ((event.metaKey || event.ctrlKey) && key === "s") { event.preventDefault(); store.setStatusMessage("Saved locally"); return; }
      if ((event.metaKey || event.ctrlKey) && key === "z") { event.preventDefault(); if (event.shiftKey) store.redo(); else store.undo(); return; }
      if ((event.metaKey || event.ctrlKey) && key === "y") { event.preventDefault(); store.redo(); return; }
      if (["Delete", "Backspace"].includes(event.key) && store.selection.length) { event.preventDefault(); store.deleteSelected(); return; }
      if (event.code === "Space" && !event.repeat) { event.preventDefault(); previousTool = store.tool; store.setTool("hand"); return; }
      if (!event.metaKey && !event.ctrlKey && !event.altKey) { const tool = shortcuts[key]; if (tool) store.setTool(tool); }
    };
    const handleKeyUp = (event: KeyboardEvent) => {
      if (event.code === "Space" && previousTool) { event.preventDefault(); useCanvasStore.getState().setTool(previousTool); previousTool = null; }
    };
    const preventSpaceScroll = (event: KeyboardEvent) => { if (event.code === "Space" && !(event.target instanceof HTMLButtonElement)) event.preventDefault(); };
    window.addEventListener("keydown", handleKeyDown); window.addEventListener("keyup", handleKeyUp); window.addEventListener("keydown", preventSpaceScroll, { passive: false });
    return () => { window.removeEventListener("keydown", handleKeyDown); window.removeEventListener("keyup", handleKeyUp); window.removeEventListener("keydown", preventSpaceScroll); };
  }, []);
}
