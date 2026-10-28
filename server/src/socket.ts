import type { Server } from "socket.io";
import { createParticipant, isValidRoomId, joinRoom, validStroke } from "./rooms";
import type { ClientToServerEvents, Participant, ServerToClientEvents } from "./types";

export function registerSocketHandlers(io: Server<ClientToServerEvents, ServerToClientEvents>) {
  io.on("connection", (socket) => {
    let activeRoom = "";
    let participant: Participant | null = null;

    socket.on("room:join", ({ roomId, participant: identity, background }) => {
      if (!isValidRoomId(roomId)) { socket.emit("room:error", { message: "Room IDs must be 4–64 letters, numbers, underscores, or hyphens." }); return; }
      if (activeRoom) leave();
      activeRoom = roomId;
      participant = createParticipant(identity?.name ?? "Guest", identity?.color ?? "#695cff");
      const room = joinRoom(roomId, background);
      room.participants.set(socket.id, participant);
      void socket.join(roomId);
      socket.emit("room:state", { roomId, strokes: room.strokes, background: room.background, participants: [...room.participants.values()], selfId: participant.id });
      socket.to(roomId).emit("participants:update", { participants: [...room.participants.values()] });
    });

    socket.on("room:leave", ({ roomId }) => { if (activeRoom === roomId) leave(); });
    socket.on("board:add", ({ roomId, stroke }) => {
      if (!authorized(roomId) || !validStroke(stroke)) return;
      const room = joinRoom(roomId); if (room.strokes.some((item) => item.id === stroke.id)) return;
      room.strokes.push(stroke); socket.to(roomId).emit("board:add", { stroke });
    });
    socket.on("board:update", ({ roomId, stroke }) => {
      if (!authorized(roomId) || !validStroke(stroke)) return;
      const room = joinRoom(roomId); const index = room.strokes.findIndex((item) => item.id === stroke.id);
      if (index === -1) return; room.strokes[index] = stroke; socket.to(roomId).emit("board:update", { stroke });
    });
    socket.on("board:delete", ({ roomId, ids }) => {
      if (!authorized(roomId) || !Array.isArray(ids) || ids.length > 10_000) return;
      const room = joinRoom(roomId); const safeIds = ids.filter((id) => typeof id === "string" && id.length <= 64);
      room.strokes = room.strokes.filter((stroke) => !safeIds.includes(stroke.id)); socket.to(roomId).emit("board:delete", { ids: safeIds });
    });
    socket.on("board:clear", ({ roomId }) => {
      if (!authorized(roomId)) return; joinRoom(roomId).strokes = []; socket.to(roomId).emit("board:clear");
    });
    socket.on("board:background", ({ roomId, background }) => {
      if (!authorized(roomId) || !/^#[0-9a-f]{6}$/i.test(background)) return;
      joinRoom(roomId).background = background; socket.to(roomId).emit("board:background", { background });
    });
    socket.on("cursor:move", ({ roomId, cursor }) => {
      if (!authorized(roomId) || !Number.isFinite(cursor?.x) || !Number.isFinite(cursor?.y) || !participant) return;
      socket.to(roomId).emit("cursor:move", { participantId: participant.id, cursor });
    });
    socket.on("disconnect", leave);

    function authorized(roomId: string) { return roomId === activeRoom && Boolean(participant); }
    function leave() {
      if (!activeRoom) return;
      const room = joinRoom(activeRoom); room.participants.delete(socket.id); void socket.leave(activeRoom);
      io.to(activeRoom).emit("participants:update", { participants: [...room.participants.values()] });
      activeRoom = ""; participant = null;
    }
  });
}
