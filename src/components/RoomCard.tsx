import { Lock, DoorOpen, Clock, FlaskConical } from "lucide-react";
import { usedFor } from "@/lib/format";
import type { RoomRow } from "@/lib/rooms";

// Click a free room to check in, click an occupied room to check out.
export default function RoomCard({ room, nowMs, onSelect }: { room: RoomRow; nowMs: number; onSelect: (room: RoomRow) => void }) {
  const occupied = room.status === "occupied";
  return (
    <button
      type="button"
      onClick={() => onSelect(room)}
      title={occupied ? "กดเพื่อลงชื่อออก" : "กดเพื่อลงชื่อเข้า"}
      data-testid={`room-${room.code}`}
      data-status={room.status}
      className={`w-full rounded-xl border p-3 text-left transition focus:outline-none focus-visible:ring-2 focus-visible:ring-glow ${
        occupied
          ? "border-rose-400/30 bg-rose-950/20 hover:border-rose-300/60 hover:bg-rose-950/40"
          : "border-emerald-400/30 bg-emerald-400/5 shadow-[0_0_18px_-6px_rgba(52,211,153,0.5)] hover:border-emerald-300/70 hover:bg-emerald-400/10"
      }`}
    >
      <div className="flex flex-col items-start gap-1">
        <span className="text-xl font-semibold tracking-wide text-white">{room.code}</span>
        <span
          className={`inline-flex items-center gap-1 whitespace-nowrap rounded-full px-2 py-0.5 text-xs font-medium ${
            occupied ? "bg-rose-500/20 text-rose-300" : "bg-emerald-500/20 text-emerald-300"
          }`}
        >
          {occupied ? <Lock size={12} /> : <DoorOpen size={12} />}
          {occupied ? "มีคนใช้อยู่" : "ว่าง"}
        </span>
      </div>
      {occupied && room.checked_in_at && (
        <div className="mt-2 space-y-1 text-xs text-slate-300">
          <div className="truncate font-medium text-slate-100">{room.occupant_name}</div>
          <div className="flex items-center gap-1 text-slate-400">
            <FlaskConical size={12} /> หัวข้อ {room.topic_code}
          </div>
          <div className="flex items-center gap-1 text-slate-400">
            <Clock size={12} /> {usedFor(room.checked_in_at, nowMs)}
          </div>
        </div>
      )}
    </button>
  );
}
