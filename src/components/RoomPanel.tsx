import { useCanvasStore } from "../store/canvasStore";

export default function RoomPanel() {
  const roomId = useCanvasStore((state) => state.roomId);
  const participants = useCanvasStore((state) => state.participants);
  const statusMessage = useCanvasStore((state) => state.statusMessage);
  return (
    <div className="room-panel" aria-label="Board connection status">
      <span className={`status-dot ${statusMessage.startsWith("Connected") ? "online" : "offline"}`} />
      <div>
        <strong>Room {roomId}</strong>
        <span>{participants.length} here · {statusMessage}</span>
      </div>
      <div className="participant-avatars">{participants.slice(0, 4).map((person) => <span key={person.id} title={person.name} style={{ background: person.color }}>{person.name.slice(0, 1).toUpperCase()}</span>)}</div>
    </div>
  );
}
