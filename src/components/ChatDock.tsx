"use client";

import { memo, useState } from "react";
import { X } from "lucide-react";
import Butterfly from "./Butterfly";
import { AVATAR_IMAGE_URL } from "@/config";

function Avatar({ size, id }: { size: number; id: string }) {
  // eslint-disable-next-line @next/next/no-img-element
  if (AVATAR_IMAGE_URL) return <img src={AVATAR_IMAGE_URL} alt="" width={size} height={size} className="rounded-full object-cover" style={{ width: size, height: size }} />;
  return <Butterfly size={size} id={id} />;
}

// The slot has no React children on purpose: Botnoi's embed script can fill it
// without React touching it. memo() keeps React from re-rendering it.
const ChatSlot = memo(function ChatSlot() {
  return <div id="chatbot-slot" className="min-h-full" />;
});

export default function ChatDock() {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button
        onClick={() => setOpen(true)}
        aria-label="เปิดแชทบอท Shorekeeper"
        className={`fixed bottom-5 right-5 z-40 flex h-14 w-14 items-center justify-center rounded-full border border-glow/50 bg-deep shadow-[0_0_24px_rgba(79,195,247,0.55)] transition hover:scale-105 ${
          open ? "pointer-events-none opacity-0" : ""
        }`}
      >
        <Avatar size={34} id="bf-fab" />
      </button>

      {/* Panel stays mounted when closed, so a chat widget inside the slot keeps its state. */}
      <aside
        aria-hidden={!open}
        className={`fixed right-0 top-0 z-50 flex h-full w-full flex-col border-l border-glow/30 bg-abyss shadow-2xl transition-all duration-300 sm:w-[400px] ${
          open ? "translate-x-0 visible" : "translate-x-full invisible"
        }`}
      >
        <div className="flex items-center justify-between border-b border-white/10 px-4 py-3">
          <div className="flex items-center gap-2">
            <Avatar size={28} id="bf-head" />
            <span className="font-semibold text-white">Shorekeeper</span>
          </div>
          <button onClick={() => setOpen(false)} aria-label="ปิดแชท" className="rounded-lg p-1.5 text-slate-400 hover:bg-white/10 hover:text-white">
            <X size={20} />
          </button>
        </div>
        <div className="flex-1 overflow-auto p-4">
          <ChatSlot />
        </div>
      </aside>
    </>
  );
}
