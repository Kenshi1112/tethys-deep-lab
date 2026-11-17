"use client";

import { useEffect, useRef, useState } from "react";
import { Waves, Layers, DoorOpen, Activity, TriangleAlert } from "lucide-react";
import RoomCard from "./RoomCard";
import { POLL_INTERVAL_MS } from "@/config";
import type { RoomRow, Topic } from "@/lib/rooms";

type BoardData = {
  rooms: RoomRow[];
  topics: Topic[];
  summary: { total: number; free: number; occupied: number };
  server_time: string;
};

const FLOORS = [1, 2, 3];

export default function Board() {
  const [data, setData] = useState<BoardData | null>(null);
  const [failed, setFailed] = useState(false);
  const [selected, setSelected] = useState<string | null>(null); // selected topic code
  const skew = useRef(0); // server clock minus browser clock, so "time in use" is right

  // Poll the public read-only endpoint every few seconds.
  useEffect(() => {
    let stop = false;
    async function load() {
      try {
        const res = await fetch("/api/public/rooms", { cache: "no-store" });
        const json = await res.json();
        if (stop) return;
        if (json.ok) {
          skew.current = new Date(json.data.server_time).getTime() - Date.now();
          setData(json.data);
          setFailed(false);
        } else setFailed(true);
      } catch {
        if (!stop) setFailed(true);
      }
    }
    load();
    const id = setInterval(load, POLL_INTERVAL_MS);
    return () => {
      stop = true;
      clearInterval(id);
    };
  }, []);

  const nowMs = Date.now() + skew.current;
  const topics = data?.topics ?? [];
  const selectedTopic = topics.find((t) => t.code === selected) ?? null;

  return (
    <div>
      {/* 1. Header */}
      <header className="mb-8 flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-glow/30 bg-glow/10 px-3 py-1 text-xs text-glow">
            <Waves size={14} /> บอร์ดสถานะห้องแบบเรียลไทม์
          </div>
          <h1 className="text-3xl font-bold text-white drop-shadow-[0_0_18px_rgba(79,195,247,0.45)] sm:text-4xl">
            Tethys&apos; Deep
          </h1>
          <p className="mt-1 text-slate-400">ศูนย์วิจัยใต้ดิน · จองห้องผ่านแชทบอท Shorekeeper</p>
        </div>
        <div className="flex gap-3">
          <div className="rounded-xl border border-emerald-400/30 bg-emerald-400/5 px-4 py-2 text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-emerald-300">
              <DoorOpen size={14} /> ห้องว่าง
            </div>
            <div className="text-2xl font-semibold text-white" data-testid="free-count">
              {data ? data.summary.free : "–"} <span className="text-base text-slate-400">/ {data ? data.summary.total : 12}</span>
            </div>
          </div>
          <div className="rounded-xl border border-rose-400/30 bg-rose-400/5 px-4 py-2 text-center">
            <div className="flex items-center justify-center gap-1 text-xs text-rose-300">
              <Activity size={14} /> กำลังใช้งาน
            </div>
            <div className="text-2xl font-semibold text-white" data-testid="busy-count">
              {data ? data.summary.occupied : "–"}
            </div>
          </div>
        </div>
      </header>

      {failed && (
        <div className="mb-4 flex items-center gap-2 rounded-lg border border-amber-400/30 bg-amber-400/10 px-3 py-2 text-sm text-amber-200">
          <TriangleAlert size={16} /> เชื่อมต่อเซิร์ฟเวอร์ไม่ได้ กำลังลองใหม่อัตโนมัติ…
        </div>
      )}

      {/* 2. Topic panel */}
      <section className="mb-6 rounded-2xl border border-white/10 bg-deep/70 p-4 backdrop-blur">
        <h2 className="mb-3 flex items-center gap-2 text-sm font-medium text-slate-300">
          <Layers size={16} className="text-glow" /> หัวข้อวิจัย <span className="text-xs text-slate-500">(กดเพื่อดูชั้นที่ทำได้)</span>
        </h2>
        <div className="grid gap-3 sm:grid-cols-3">
          {topics.map((t) => {
            const active = selected === t.code;
            return (
              <button
                key={t.code}
                onClick={() => setSelected(active ? null : t.code)}
                aria-pressed={active}
                className={`rounded-xl border p-3 text-left transition ${
                  active
                    ? "border-glow bg-glow/10 shadow-[0_0_20px_-4px_rgba(79,195,247,0.6)]"
                    : "border-white/10 bg-white/[0.02] hover:border-glow/40"
                }`}
              >
                <div className="flex items-center gap-2">
                  <span className="flex h-7 w-7 items-center justify-center rounded-lg bg-glow/20 font-semibold text-glow">{t.code}</span>
                  <span className="text-sm font-medium text-slate-100">{t.name}</span>
                </div>
                <div className="mt-2 text-xs text-slate-400">ทำได้ที่ชั้น {t.floors.join(", ")}</div>
              </button>
            );
          })}
          {!data && [0, 1, 2].map((i) => <div key={i} className="h-[76px] animate-pulse rounded-xl bg-white/5" />)}
        </div>
      </section>

      {/* 3. Floor zones */}
      <section className="grid gap-4 lg:grid-cols-3">
        {FLOORS.map((floor) => {
          const floorTopics = topics.filter((t) => t.floors.includes(floor));
          const dimmed = selectedTopic ? !selectedTopic.floors.includes(floor) : false;
          const highlighted = selectedTopic ? selectedTopic.floors.includes(floor) : false;
          const rooms = data?.rooms.filter((r) => r.floor === floor) ?? [];
          return (
            <div
              key={floor}
              data-testid={`floor-${floor}`}
              data-dimmed={dimmed}
              className={`rounded-2xl border p-4 transition ${
                highlighted ? "border-glow/70 bg-deep shadow-[0_0_30px_-6px_rgba(79,195,247,0.55)]" : "border-white/10 bg-deep/70"
              } ${dimmed ? "opacity-35" : ""}`}
            >
              <div className="mb-2 flex items-center justify-between">
                <h3 className="text-lg font-semibold text-white">ชั้น {floor}</h3>
                <span className="text-xs text-slate-500">ใต้ดิน</span>
              </div>
              <div className="mb-3 flex flex-wrap gap-1.5">
                {floorTopics.map((t) => (
                  <span
                    key={t.code}
                    className={`rounded-full border px-2 py-0.5 text-xs ${
                      selected === t.code ? "border-glow bg-glow/20 text-glow" : "border-white/10 text-slate-400"
                    }`}
                  >
                    หัวข้อ {t.code}
                  </span>
                ))}
              </div>
              <div className="grid grid-cols-2 gap-3">
                {data
                  ? rooms.map((r) => <RoomCard key={r.code} room={r} nowMs={nowMs} />)
                  : [0, 1, 2, 3].map((i) => <div key={i} className="h-[72px] animate-pulse rounded-xl bg-white/5" />)}
              </div>
            </div>
          );
        })}
      </section>

      {/* 7. Legend */}
      <div className="mt-4 flex flex-wrap items-center gap-4 text-xs text-slate-400">
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-emerald-400" /> ว่าง
        </span>
        <span className="flex items-center gap-1.5">
          <span className="h-3 w-3 rounded-full bg-rose-400" /> มีคนใช้อยู่
        </span>
        <span className="text-slate-500">· อัปเดตอัตโนมัติทุก {POLL_INTERVAL_MS / 1000} วินาที</span>
      </div>
    </div>
  );
}
