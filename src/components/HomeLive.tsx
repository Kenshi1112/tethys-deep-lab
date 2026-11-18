"use client";

import { useEffect, useState } from "react";
import { DoorOpen, Activity, Layers3 } from "lucide-react";
import { POLL_INTERVAL_MS } from "@/config";
import type { Topic } from "@/lib/rooms";

type Data = { topics: Topic[]; summary: { total: number; free: number; occupied: number } };

// Live numbers and topic list for the home page (same public endpoint as the board).
export function useLive() {
  const [data, setData] = useState<Data | null>(null);
  useEffect(() => {
    let stop = false;
    const load = async () => {
      try {
        const json = await (await fetch("/api/public/rooms", { cache: "no-store" })).json();
        if (!stop && json.ok) setData(json.data);
      } catch {
        /* keep the last numbers */
      }
    };
    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);
  return data;
}

export function LiveStats() {
  const data = useLive();
  const tile = "rounded-2xl border px-5 py-4";
  return (
    <div className="grid grid-cols-3 gap-3" data-testid="home-stats">
      <div className={`${tile} border-emerald-400/30 bg-emerald-400/5`}>
        <div className="flex items-center gap-1.5 text-xs text-emerald-300"><DoorOpen size={14} /> ห้องว่าง</div>
        <div className="mt-1 text-3xl font-semibold text-white" data-testid="home-free">{data ? data.summary.free : "–"}</div>
      </div>
      <div className={`${tile} border-rose-400/30 bg-rose-400/5`}>
        <div className="flex items-center gap-1.5 text-xs text-rose-300"><Activity size={14} /> ใช้งานอยู่</div>
        <div className="mt-1 text-3xl font-semibold text-white" data-testid="home-busy">{data ? data.summary.occupied : "–"}</div>
      </div>
      <div className={`${tile} border-glow/30 bg-glow/5`}>
        <div className="flex items-center gap-1.5 text-xs text-glow"><Layers3 size={14} /> ทั้งหมด</div>
        <div className="mt-1 text-3xl font-semibold text-white">{data ? data.summary.total : 12}</div>
      </div>
    </div>
  );
}

export function TopicCards() {
  const data = useLive();
  return (
    <div className="grid gap-3 sm:grid-cols-3">
      {(data?.topics ?? []).map((t) => (
        <div key={t.code} className="rounded-2xl border border-white/10 bg-deep/70 p-4">
          <div className="flex items-center gap-3">
            <span className="flex h-9 w-9 items-center justify-center rounded-xl bg-glow/20 text-lg font-semibold text-glow">{t.code}</span>
            <span className="font-medium text-slate-100">{t.name}</span>
          </div>
          <p className="mt-3 text-sm text-slate-400">ทำได้ที่ชั้น {t.floors.join(", ")}</p>
        </div>
      ))}
      {!data && [0, 1, 2].map((i) => <div key={i} className="h-[92px] animate-pulse rounded-2xl bg-white/5" />)}
    </div>
  );
}
