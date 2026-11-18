"use client";

import { useEffect, useRef, useState } from "react";
import { X, LogIn, LogOut, Loader2 } from "lucide-react";
import type { RoomRow, Topic } from "@/lib/rooms";

export type DialogMode = "checkin" | "checkout";

type Props = {
  room: RoomRow;
  mode: DialogMode; // fixed when the dialog opens
  topics: Topic[];
  onClose: () => void;
  onDone: () => void; // refresh the board after a successful call
};

// Same public API the chatbot uses, so the website and the bot follow the same rules.
async function call(path: string, body: unknown) {
  const res = await fetch(`/api/public/rooms/${path}`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  return (await res.json()) as { ok: boolean; message_th: string };
}

export default function RoomDialog({ room, mode, topics, onClose, onDone }: Props) {
  const [name, setName] = useState("");
  const [topic, setTopic] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [success, setSuccess] = useState("");
  const nameRef = useRef<HTMLInputElement>(null);

  // Only topics that are allowed on this room's floor.
  const allowed = topics.filter((t) => t.floors.includes(room.floor));

  useEffect(() => {
    nameRef.current?.focus();
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);

  async function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = name.trim();
    setError("");
    if (!n) return setError("กรุณาใส่ชื่อ");

    if (mode === "checkin") {
      if (!topic) return setError("กรุณาเลือกหัวข้อวิจัย");
    } else if (n.toLowerCase() !== (room.occupant_name ?? "").trim().toLowerCase()) {
      // Check-out is by name, so make sure the person is leaving THIS room.
      return setError("ชื่อไม่ตรงกับผู้ใช้ห้องนี้");
    }

    setBusy(true);
    try {
      const r =
        mode === "checkin"
          ? await call("checkin", { name: n, topic, floor: String(room.floor), room: room.code })
          : await call("checkout", { name: n });
      if (r.ok) {
        setSuccess(r.message_th);
        onDone();
        setTimeout(onClose, 1500);
      } else setError(r.message_th);
    } catch {
      setError("เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ ลองใหม่อีกครั้ง");
    } finally {
      setBusy(false);
    }
  }

  const isIn = mode === "checkin";

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4 backdrop-blur-sm"
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <form
        onSubmit={submit}
        role="dialog"
        aria-modal="true"
        aria-label={isIn ? `ลงชื่อเข้าห้อง ${room.code}` : `ลงชื่อออกจากห้อง ${room.code}`}
        data-testid="room-dialog"
        className="w-full max-w-sm rounded-2xl border border-glow/30 bg-deep p-5 shadow-[0_0_40px_-8px_rgba(79,195,247,0.5)]"
      >
        <div className="mb-4 flex items-start justify-between gap-3">
          <div>
            <h2 className="flex items-center gap-2 text-lg font-semibold text-white">
              {isIn ? <LogIn size={18} className="text-emerald-300" /> : <LogOut size={18} className="text-rose-300" />}
              {isIn ? "ลงชื่อเข้า" : "ลงชื่อออก"} · ห้อง {room.code}
            </h2>
            <p className="text-xs text-slate-400">
              ชั้น {room.floor}
              {!isIn && room.occupant_name ? ` · ใช้โดย ${room.occupant_name}` : ""}
            </p>
          </div>
          <button type="button" onClick={onClose} aria-label="ปิด" className="rounded-lg p-1 text-slate-400 hover:bg-white/10 hover:text-white">
            <X size={18} />
          </button>
        </div>

        <label className="mb-1 block text-sm text-slate-300" htmlFor="dlg-name">
          {isIn ? "ชื่อของคุณ" : "ใส่ชื่อของคุณเพื่อยืนยันการลงชื่อออก"}
        </label>
        <input
          id="dlg-name"
          ref={nameRef}
          value={name}
          onChange={(e) => setName(e.target.value)}
          maxLength={50}
          autoComplete="off"
          disabled={busy || !!success}
          className="mb-4 w-full rounded-lg border border-white/15 bg-abyss px-3 py-2 text-white outline-none focus:border-glow"
          placeholder="เช่น Rover"
        />

        {isIn && (
          <fieldset className="mb-4" disabled={busy || !!success}>
            <legend className="mb-1 text-sm text-slate-300">หัวข้อวิจัย (ชั้น {room.floor} ทำได้เฉพาะหัวข้อเหล่านี้)</legend>
            <div className="space-y-2">
              {allowed.map((t) => (
                <label
                  key={t.code}
                  className={`flex cursor-pointer items-center gap-3 rounded-lg border px-3 py-2 text-sm transition ${
                    topic === t.code ? "border-glow bg-glow/10 text-white" : "border-white/10 text-slate-300 hover:border-glow/40"
                  }`}
                >
                  <input type="radio" name="topic" value={t.code} checked={topic === t.code} onChange={() => setTopic(t.code)} className="accent-sky-400" />
                  <span className="flex h-6 w-6 items-center justify-center rounded bg-glow/20 text-xs font-semibold text-glow">{t.code}</span>
                  {t.name}
                </label>
              ))}
            </div>
          </fieldset>
        )}

        {error && (
          <div role="alert" data-testid="dialog-error" className="mb-3 rounded-lg border border-rose-400/30 bg-rose-400/10 px-3 py-2 text-sm text-rose-200">
            {error}
          </div>
        )}
        {success && (
          <div data-testid="dialog-success" className="mb-3 rounded-lg border border-emerald-400/30 bg-emerald-400/10 px-3 py-2 text-sm text-emerald-200">
            {success}
          </div>
        )}

        <div className="flex gap-2">
          <button type="button" onClick={onClose} className="flex-1 rounded-lg border border-white/15 px-3 py-2 text-sm text-slate-300 hover:bg-white/5">
            ยกเลิก
          </button>
          <button
            type="submit"
            disabled={busy || !!success}
            data-testid="dialog-submit"
            className={`flex flex-1 items-center justify-center gap-2 rounded-lg px-3 py-2 text-sm font-medium text-abyss disabled:opacity-60 ${
              isIn ? "bg-emerald-400 hover:bg-emerald-300" : "bg-rose-300 hover:bg-rose-200"
            }`}
          >
            {busy && <Loader2 size={14} className="animate-spin" />}
            {isIn ? "ลงชื่อเข้า" : "ลงชื่อออก"}
          </button>
        </div>
      </form>
    </div>
  );
}
