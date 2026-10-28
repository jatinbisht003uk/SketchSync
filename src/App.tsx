import { useRef } from "react";
import Canvas, { type CanvasHandle } from "./components/Canvas";
import PropertiesPanel from "./components/PropertiesPanel";
import Toolbar from "./components/Toolbar";
import Topbar from "./components/Topbar";
import { useKeyboardShortcuts } from "./hooks/useKeyboardShortcuts";
import { useCollaboration } from "./hooks/useCollaboration";
import { useCanvasStore } from "./store/canvasStore";
import "./App.css";

export default function App() {
  const canvasRef = useRef<CanvasHandle>(null);
  const { createRoom, sendCursor } = useCollaboration();
  useKeyboardShortcuts();
  const theme = useCanvasStore((state) => state.theme);

  return (
    <main className={`app theme-${theme}`}>
      <Topbar canvasRef={canvasRef} createRoom={createRoom} />
      <section className="workspace">
        <Toolbar />
        <Canvas ref={canvasRef} sendCursor={sendCursor} />
        <PropertiesPanel />
      </section>
    </main>
  );
}
