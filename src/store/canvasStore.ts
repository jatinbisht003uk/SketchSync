import { create } from "zustand";
import { persist } from "zustand/middleware";
import type { DrawingTool, Participant, Point, Stroke } from "../types/drawing";

type Snapshot = { strokes: Stroke[]; selection: string[] };
type CanvasState = {
  tool: DrawingTool; color: string; fill: string; strokeWidth: number; dash: "solid" | "dashed";
  zoom: number; offset: Point; strokes: Stroke[]; selection: string[]; past: Snapshot[]; future: Snapshot[];
  roomId: string; selfId: string; participantName: string; participants: Participant[]; background: string;
  theme: "light" | "dark"; statusMessage: string;
  setTool: (tool: DrawingTool) => void; setColor: (color: string) => void; setFill: (fill: string) => void;
  setStrokeWidth: (width: number) => void; setDash: (dash: "solid" | "dashed") => void;
  setZoom: (zoom: number) => void; setOffset: (offset: Point) => void; setRoomId: (id: string) => void;
  setParticipants: (participants: Participant[]) => void; setTheme: (theme: "light" | "dark") => void;
  setBackground: (background: string) => void;
  setStatusMessage: (message: string) => void; addStroke: (stroke: Stroke) => void; updateStroke: (stroke: Stroke, record?: boolean) => void;
  commitMove: (before: Stroke[]) => void; updateSelectedStyle: (patch: Partial<Pick<Stroke, "color" | "fill" | "width" | "dash">>) => void;
  receiveAdd: (stroke: Stroke) => void; receiveUpdate: (stroke: Stroke) => void; receiveDelete: (ids: string[]) => void; receiveClear: () => void;
  deleteSelected: () => string[]; setSelection: (ids: string[]) => void; replaceStrokes: (strokes: Stroke[]) => void;
  deleteStrokes: (ids: string[]) => void; undo: () => void; redo: () => void; clear: () => void;
};

const snapshot = (state: Pick<CanvasState, "strokes" | "selection">): Snapshot => ({ strokes: state.strokes, selection: state.selection });
const remember = (state: CanvasState) => ({ past: [...state.past.slice(-99), snapshot(state)], future: [] as Snapshot[] });

export const useCanvasStore = create<CanvasState>()(persist((set, get) => ({
  tool: "draw", color: "#202124", fill: "transparent", strokeWidth: 2, dash: "solid", zoom: 100,
  offset: { x: 0, y: 0 }, strokes: [], selection: [], past: [], future: [], roomId: "", selfId: "", background: "#ffffff",
  participantName: `Guest ${Math.floor(100 + Math.random() * 900)}`, participants: [], theme: "light", statusMessage: "Saved locally",
  setTool: (tool) => set({ tool }), setColor: (color) => set({ color }), setFill: (fill) => set({ fill }),
  setStrokeWidth: (strokeWidth) => set({ strokeWidth }), setDash: (dash) => set({ dash }),
  setZoom: (zoom) => set({ zoom: Math.max(25, Math.min(300, zoom)) }), setOffset: (offset) => set({ offset }),
  setRoomId: (roomId) => set({ roomId }), setParticipants: (participants) => set({ participants }),
  setTheme: (theme) => set({ theme }), setStatusMessage: (statusMessage) => set({ statusMessage }),
  setBackground: (background) => set({ background }),
  addStroke: (stroke) => set((state) => ({ ...remember(state), strokes: [...state.strokes, stroke], selection: [] })),
  updateStroke: (stroke, record = true) => set((state) => ({ ...(record ? remember(state) : {}), strokes: state.strokes.map((item) => item.id === stroke.id ? stroke : item) })),
  commitMove: (before) => set((state) => ({ past: [...state.past.slice(-99), { strokes: before, selection: state.selection }], future: [] })),
  updateSelectedStyle: (patch) => set((state) => {
    if (!state.selection.length) return state;
    return { ...remember(state), strokes: state.strokes.map((stroke) => state.selection.includes(stroke.id) ? { ...stroke, ...patch } : stroke) };
  }),
  receiveAdd: (stroke) => set((state) => state.strokes.some((item) => item.id === stroke.id) ? state : ({
    strokes: [...state.strokes, stroke],
    past: state.past.map((entry) => ({ ...entry, strokes: entry.strokes.some((item) => item.id === stroke.id) ? entry.strokes : [...entry.strokes, stroke] })),
    future: state.future.map((entry) => ({ ...entry, strokes: entry.strokes.some((item) => item.id === stroke.id) ? entry.strokes : [...entry.strokes, stroke] })),
  })),
  receiveUpdate: (stroke) => set((state) => ({
    strokes: state.strokes.map((item) => item.id === stroke.id ? stroke : item),
    past: state.past.map((entry) => ({ ...entry, strokes: entry.strokes.map((item) => item.id === stroke.id ? stroke : item) })),
    future: state.future.map((entry) => ({ ...entry, strokes: entry.strokes.map((item) => item.id === stroke.id ? stroke : item) })),
  })),
  receiveDelete: (ids) => set((state) => ({
    strokes: state.strokes.filter((stroke) => !ids.includes(stroke.id)), selection: state.selection.filter((id) => !ids.includes(id)),
    past: state.past.map((entry) => ({ ...entry, strokes: entry.strokes.filter((stroke) => !ids.includes(stroke.id)) })),
    future: state.future.map((entry) => ({ ...entry, strokes: entry.strokes.filter((stroke) => !ids.includes(stroke.id)) })),
  })),
  receiveClear: () => set({ strokes: [], selection: [], past: [], future: [] }),
  setSelection: (selection) => set({ selection }),
  deleteSelected: () => {
    const { selection } = get();
    if (!selection.length) return [];
    set((state) => ({ ...remember(state), strokes: state.strokes.filter((stroke) => !selection.includes(stroke.id)), selection: [] }));
    return selection;
  },
  replaceStrokes: (strokes) => set({ strokes, selection: [], past: [], future: [] }),
  deleteStrokes: (ids) => set((state) => ({ ...remember(state), strokes: state.strokes.filter((stroke) => !ids.includes(stroke.id)), selection: state.selection.filter((id) => !ids.includes(id)) })),
  undo: () => set((state) => {
    const previous = state.past.at(-1); if (!previous) return state;
    return { strokes: previous.strokes, selection: previous.selection, past: state.past.slice(0, -1), future: [snapshot(state), ...state.future] };
  }),
  redo: () => set((state) => {
    const next = state.future[0]; if (!next) return state;
    return { strokes: next.strokes, selection: next.selection, past: [...state.past, snapshot(state)], future: state.future.slice(1) };
  }),
  clear: () => set((state) => state.strokes.length ? ({ ...remember(state), strokes: [], selection: [] }) : state),
}), {
  name: "sketchsync-board-v1",
  partialize: (state) => ({ strokes: state.strokes, roomId: state.roomId, participantName: state.participantName, theme: state.theme, background: state.background }),
}));
