import { nanoid } from "nanoid";
import type { Participant, RoomState, Stroke } from "./types";

const rooms = new Map<string, RoomState>();
export function isValidRoomId(roomId: unknown): roomId is string {
  return typeof roomId === "string" && /^[a-zA-Z0-9_-]{4,64}$/.test(roomId);
}
export function joinRoom(roomId: string, initialBackground = "#ffffff"): RoomState {
  let room = rooms.get(roomId);
  if (!room) { room = { strokes: [], background: /^#[0-9a-f]{6}$/i.test(initialBackground) ? initialBackground : "#ffffff", participants: new Map() }; rooms.set(roomId, room); }
  return room;
}
export function createParticipant(name: string, color: string): Participant {
  return { id: nanoid(12), name: name.trim().slice(0, 28) || "Guest", color: /^#[0-9a-f]{6}$/i.test(color) ? color : "#695cff" };
}
export function validStroke(value: unknown): value is Stroke {
  if (!value || typeof value !== "object") return false;
  const stroke = value as Partial<Stroke>;
  const kinds = ["freehand", "rectangle", "ellipse", "line", "arrow", "diamond", "text"];
  return typeof stroke.id === "string" && stroke.id.length <= 64 && kinds.includes(stroke.kind ?? "") &&
    Array.isArray(stroke.points) && stroke.points.length > 0 && stroke.points.length < 100_000 &&
    stroke.points.every((point) => point && Number.isFinite(point.x) && Number.isFinite(point.y) && Math.abs(point.x) < 10_000_000 && Math.abs(point.y) < 10_000_000) &&
    typeof stroke.color === "string" && /^#[0-9a-f]{6}$/i.test(stroke.color) &&
    (stroke.fill === "transparent" || (typeof stroke.fill === "string" && /^#[0-9a-f]{6}$/i.test(stroke.fill))) &&
    (stroke.dash === "solid" || stroke.dash === "dashed") && (stroke.compositeOperation === undefined || stroke.compositeOperation === "source-over" || stroke.compositeOperation === "destination-out") && Number.isFinite(stroke.width) && stroke.width! > 0 && stroke.width! <= 100 &&
    (stroke.kind !== "text" || (typeof stroke.text === "string" && stroke.text.length <= 2000));
}
