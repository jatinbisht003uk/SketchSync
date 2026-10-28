export type Point = { x: number; y: number };
export type Stroke = {
  id: string;
  kind: "freehand" | "rectangle" | "ellipse" | "line" | "arrow" | "diamond" | "text";
  points: Point[];
  color: string;
  width: number;
  fill: string;
  dash: "solid" | "dashed";
  text?: string;
  compositeOperation?: "source-over" | "destination-out";
};
export type Participant = { id: string; name: string; color: string; cursor?: Point };
export type ClientToServerEvents = {
  "room:join": (payload: { roomId: string; participant: Participant; background: string }) => void;
  "room:leave": (payload: { roomId: string }) => void;
  "board:add": (payload: { roomId: string; stroke: Stroke }) => void;
  "board:update": (payload: { roomId: string; stroke: Stroke }) => void;
  "board:delete": (payload: { roomId: string; ids: string[] }) => void;
  "board:clear": (payload: { roomId: string }) => void;
  "board:background": (payload: { roomId: string; background: string }) => void;
  "cursor:move": (payload: { roomId: string; cursor: Point }) => void;
};
export type ServerToClientEvents = {
  "room:state": (payload: { roomId: string; strokes: Stroke[]; background: string; participants: Participant[]; selfId: string }) => void;
  "board:add": (payload: { stroke: Stroke }) => void;
  "board:update": (payload: { stroke: Stroke }) => void;
  "board:delete": (payload: { ids: string[] }) => void;
  "board:clear": () => void;
  "board:background": (payload: { background: string }) => void;
  "participants:update": (payload: { participants: Participant[] }) => void;
  "cursor:move": (payload: { participantId: string; cursor: Point }) => void;
  "room:error": (payload: { message: string }) => void;
};
export type RoomState = { strokes: Stroke[]; background: string; participants: Map<string, Participant> };
