import { useCallback, useEffect, useRef } from "react";
import { io, type Socket } from "socket.io-client";
import { nanoid } from "nanoid";
import { useCanvasStore } from "../store/canvasStore";
import type { ClientToServerEvents, ServerToClientEvents, Stroke } from "../types/drawing";

const colors = ["#e85959", "#159b79", "#8a57d1", "#d28a16", "#1681c4", "#d25193"];

export function useCollaboration() {
  const selectedRoom = useCanvasStore((state) => state.roomId);
  const socketRef = useRef<Socket<ServerToClientEvents, ClientToServerEvents> | null>(null);
  const suppress = useRef(false);
  const lastCursorAt = useRef(0);
  const createRoom = useCallback(() => {
    const roomId = nanoid(10);
    suppress.current = true;
    useCanvasStore.setState({ roomId, strokes: [], selection: [], past: [], future: [], background: "#ffffff", offset: { x: 0, y: 0 }, zoom: 100, participants: [], selfId: "" });
    suppress.current = false;
    const url = new URL(window.location.href); url.searchParams.set("room", roomId); window.history.pushState({}, "", url);
  }, []);

  useEffect(() => {
    const store = useCanvasStore.getState();
    const queryRoom = new URLSearchParams(window.location.search).get("room");
    const requestedRoom = queryRoom && /^[\w-]{4,64}$/.test(queryRoom) ? queryRoom : selectedRoom;
    if (!requestedRoom) { useCanvasStore.getState().setRoomId(nanoid(10)); return; }
    if (requestedRoom !== selectedRoom) { useCanvasStore.getState().setRoomId(requestedRoom); return; }
    const roomId = requestedRoom;
    const url = new URL(window.location.href); url.searchParams.set("room", roomId); window.history.replaceState({}, "", url);
    const name = store.participantName;
    const color = colors[Math.floor(Math.random() * colors.length)];
    const socket: Socket<ServerToClientEvents, ClientToServerEvents> = io(import.meta.env.VITE_SERVER_URL ?? "http://localhost:3001", { reconnection: true, timeout: 4000 });
    socketRef.current = socket;
    let previous: Stroke[] = useCanvasStore.getState().strokes;
    let previousBackground = useCanvasStore.getState().background;
    const pendingUpdates = new Map<string, Stroke>();
    let updateTimer: ReturnType<typeof setTimeout> | null = null;
    const flushUpdates = () => {
      if (updateTimer) clearTimeout(updateTimer);
      updateTimer = null;
      for (const stroke of pendingUpdates.values()) socket.emit("board:update", { roomId, stroke });
      pendingUpdates.clear();
    };
    const scheduleUpdate = (stroke: Stroke) => {
      pendingUpdates.set(stroke.id, stroke);
      if (!updateTimer) updateTimer = setTimeout(flushUpdates, 50);
    };
    socket.on("connect", () => {
      useCanvasStore.getState().setStatusMessage("Connecting to room…");
      socket.emit("room:join", { roomId, participant: { id: nanoid(), name, color }, background: useCanvasStore.getState().background });
    });
    socket.on("connect_error", () => useCanvasStore.getState().setStatusMessage("Offline · saved locally"));
    socket.on("disconnect", () => useCanvasStore.getState().setStatusMessage("Reconnecting…"));
    socket.on("room:error", ({ message }) => useCanvasStore.getState().setStatusMessage(message));
    socket.on("room:state", ({ strokes, background, participants, selfId }) => {
      useCanvasStore.getState().setRoomId(roomId);
      useCanvasStore.getState().setStatusMessage("Connected · changes sync live");
      useCanvasStore.setState({ selfId, participants });
      suppress.current = true;
      useCanvasStore.getState().setBackground(background);
      if (strokes.length) useCanvasStore.getState().replaceStrokes(strokes);
      else for (const stroke of useCanvasStore.getState().strokes) socket.emit("board:add", { roomId, stroke });
      previous = useCanvasStore.getState().strokes;
      previousBackground = background;
      queueMicrotask(() => { suppress.current = false; });
    });
    socket.on("board:add", ({ stroke }) => {
      suppress.current = true;
      const existing = useCanvasStore.getState().strokes;
      if (!existing.some((item) => item.id === stroke.id)) useCanvasStore.getState().receiveAdd(stroke);
      queueMicrotask(() => { suppress.current = false; });
    });
    socket.on("board:update", ({ stroke }) => {
      suppress.current = true; useCanvasStore.getState().receiveUpdate(stroke); queueMicrotask(() => { suppress.current = false; });
    });
    socket.on("board:delete", ({ ids }) => {
      suppress.current = true; useCanvasStore.getState().receiveDelete(ids); queueMicrotask(() => { suppress.current = false; });
    });
    socket.on("board:clear", () => {
      suppress.current = true; useCanvasStore.getState().receiveClear(); queueMicrotask(() => { suppress.current = false; });
    });
    socket.on("board:background", ({ background }) => { suppress.current = true; useCanvasStore.getState().setBackground(background); queueMicrotask(() => { suppress.current = false; }); });
    socket.on("participants:update", ({ participants }) => useCanvasStore.getState().setParticipants(participants));
    socket.on("cursor:move", ({ participantId, cursor }) => {
      const current = useCanvasStore.getState().participants;
      useCanvasStore.getState().setParticipants(current.map((person) => person.id === participantId ? { ...person, cursor } : person));
    });

    const unsubscribe = useCanvasStore.subscribe((state) => {
      const next = state.strokes;
      if (suppress.current) return;
      if (next !== previous) {
        const before = new Map(previous.map((stroke) => [stroke.id, stroke]));
        const after = new Map(next.map((stroke) => [stroke.id, stroke]));
        for (const [id, stroke] of after) {
          const old = before.get(id);
          if (!old) socket.emit("board:add", { roomId, stroke });
          else if (old !== stroke) scheduleUpdate(stroke);
        }
        const removed = [...before.keys()].filter((id) => !after.has(id));
        if (removed.length) socket.emit("board:delete", { roomId, ids: removed });
        previous = next;
      }
      if (state.background !== previousBackground) { socket.emit("board:background", { roomId, background: state.background }); previousBackground = state.background; }
    });
    return () => { unsubscribe(); flushUpdates(); socket.emit("room:leave", { roomId }); socket.disconnect(); socketRef.current = null; };
  }, [selectedRoom]);

  const sendCursor = useCallback((x: number, y: number) => {
    const socket = socketRef.current; const now = performance.now();
    if (!socket?.connected || now - lastCursorAt.current < 50) return;
    lastCursorAt.current = now; socket.emit("cursor:move", { roomId: useCanvasStore.getState().roomId, cursor: { x, y } });
  }, []);

  return { createRoom, sendCursor };
}
