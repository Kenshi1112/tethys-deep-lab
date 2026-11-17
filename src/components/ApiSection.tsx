"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Bot, RefreshCw, DoorClosed, Play, Terminal, Info } from "lucide-react";

const STEPS = [
  { icon: MessageCircle, title: "คุยกับ Shorekeeper", text: "ผู้ใช้บอกชื่อ หัวข้อ ชั้น และห้องที่ต้องการในแชท" },
  { icon: Bot, title: "บอทขอยืนยันแล้วเรียก API", text: "บอทสรุปข้อมูลให้ยืนยัน จากนั้นเรียก POST /api/public/rooms/checkin" },
  { icon: RefreshCw, title: "บอร์ดอัปเดตภายในไม่กี่วินาที", text: "หน้าเว็บดึงข้อมูลใหม่ทุก 3 วินาที การ์ดห้องจึงเปลี่ยนสีเอง" },
  { icon: DoorClosed, title: "เช็คเอาท์แล้วห้องว่าง", text: "ผู้ใช้บอกบอทให้เช็คเอาท์ ห้องจะกลับมาว่างให้คนอื่นใช้ต่อ" },
];

type Param = { key: string; type: "string" | "number"; required: boolean; desc: string; example: string };
type Endpoint = {
  id: string;
  title: string;
  method: "GET" | "POST";
  path: string;
  summary: string;
  note?: string;
  writes?: boolean;
  params: Param[];
  codes: [code: string, http: number, meaning: string][];
};

const NAME = (desc: string): Param => ({ key: "name", type: "string", required: true, desc, example: "ทดสอบ" });
const TOPIC_DESC = "A / B / C หรือชื่อเต็ม เช่น Remnant Energy Study (ไม่สนตัวพิมพ์เล็กใหญ่)";

const ENDPOINTS: Endpoint[] = [
  {
    id: "rooms",
    title: "ดูห้องทั้งหมด",
    method: "GET",
    path: "/api/public/rooms",
    summary: "คืนสถานะทั้ง 12 ห้อง (ว่าง/มีคนใช้, ชื่อผู้ใช้, หัวข้อ, เวลาเช็คอิน) พร้อมหัวข้อกับชั้นที่ทำได้ หน้าเว็บนี้เรียกตัวนี้ทุก 3 วินาที",
    note: "ไม่ต้องส่งอะไรเลย และไม่ต้องใช้ x-api-key (เปิดสาธารณะ)",
    params: [],
    codes: [["OK", 200, "ดึงข้อมูลสำเร็จ"], ["INTERNAL_ERROR", 500, "ระบบขัดข้อง (เช่น ต่อฐานข้อมูลไม่ได้)"]],
  },
  {
    id: "available",
    title: "ดูห้องว่าง",
    method: "POST",
    path: "/api/public/rooms/available",
    summary: "คืนห้องว่างแยกตามชั้น ใส่ topic และ/หรือ floor เพื่อกรอง ถ้าไม่ใส่อะไรเลยจะได้ห้องว่างทุกชั้น",
    note: "ใช้แบบ GET ก็ได้ ส่งเป็น query เช่น /api/public/rooms/available?topic=A&floor=1",
    params: [
      { key: "topic", type: "string", required: false, desc: TOPIC_DESC + " ใส่แล้วจะเห็นเฉพาะชั้นที่หัวข้อนั้นทำได้", example: "A" },
      { key: "floor", type: "number", required: false, desc: "1 / 2 / 3 ใส่แล้วจะเห็นเฉพาะชั้นนั้น", example: "1" },
    ],
    codes: [
      ["OK", 200, "สำเร็จ (ถ้าไม่มีห้องว่างก็ยังเป็น OK: total_free = 0 และข้อความ \"ตอนนี้ไม่มีห้องว่างตามเงื่อนไขนี้\")"],
      ["TOPIC_NOT_FOUND", 404, "ไม่มีหัวข้อนี้"],
      ["ROOM_NOT_FOUND", 404, "ไม่มีชั้นนี้"],
      ["TOPIC_NOT_ALLOWED_ON_FLOOR", 422, "หัวข้อกับชั้นไม่เข้ากัน เช่น A กับชั้น 3 (data.allowed_floors บอกชั้นที่ทำได้)"],
    ],
  },
  {
    id: "checkin",
    title: "เช็คอิน",
    method: "POST",
    path: "/api/public/rooms/checkin",
    summary: "จองห้องให้ผู้ใช้หนึ่งคน ต้องส่งครบทั้ง 4 ช่อง ระบบตรวจตามลำดับด้านล่าง และกันการจองซ้ำห้องเดียวกันแม้ส่งพร้อมกัน",
    writes: true,
    params: [
      NAME("ชื่อผู้ใช้ (ไม่สนตัวพิมพ์เล็กใหญ่ ตัดช่องว่างหัวท้าย) หนึ่งชื่อมีห้องได้ทีละห้องเดียว"),
      { key: "topic", type: "string", required: true, desc: TOPIC_DESC, example: "A" },
      { key: "floor", type: "number", required: true, desc: "1 / 2 / 3 ต้องเป็นชั้นที่หัวข้อนั้นทำได้", example: "1" },
      { key: "room", type: "string", required: true, desc: "เลขห้องในชั้นนั้น เช่น 101 (ชั้น 1 = 101–104, ชั้น 2 = 201–204, ชั้น 3 = 301–304)", example: "101" },
    ],
    codes: [
      ["MISSING_FIELDS", 400, "1. ส่งไม่ครบ (data.missing_fields บอกช่องที่ขาด)"],
      ["TOPIC_NOT_FOUND", 404, "2. ไม่มีหัวข้อนี้"],
      ["ROOM_NOT_FOUND", 404, "3. ไม่มีห้องนี้ในชั้นนั้น"],
      ["TOPIC_NOT_ALLOWED_ON_FLOOR", 422, "4. หัวข้อทำชั้นนี้ไม่ได้ (data.allowed_floors)"],
      ["ROOM_OCCUPIED", 409, "5. ห้องมีคนใช้อยู่ (data.suggestions = ห้องว่างที่หัวข้อนี้ทำได้)"],
      ["ALREADY_CHECKED_IN", 409, "6. ชื่อนี้มีห้องที่ใช้อยู่แล้ว ต้องเช็คเอาท์ก่อน"],
      ["OK", 200, "เช็คอินสำเร็จ"],
    ],
  },
  {
    id: "lookup",
    title: "หาห้องก่อนเช็คเอาท์",
    method: "POST",
    path: "/api/public/rooms/checkout-lookup",
    summary: "ค้นหาว่าชื่อนี้ใช้ห้องไหนอยู่ ไม่แก้ข้อมูล ใช้ให้บอทถามยืนยันก่อนเช็คเอาท์",
    params: [NAME("ชื่อผู้ใช้ (ไม่สนตัวพิมพ์เล็กใหญ่)")],
    codes: [
      ["OK", 200, "พบ: data มี name, floor, room, topic, checked_in_at"],
      ["NOT_FOUND", 404, "ชื่อนี้ไม่ได้ใช้ห้องอยู่"],
      ["MISSING_FIELDS", 400, "ไม่ได้ส่ง name"],
    ],
  },
  {
    id: "checkout",
    title: "เช็คเอาท์",
    method: "POST",
    path: "/api/public/rooms/checkout",
    summary: "คืนห้องของชื่อนี้ ห้องจะกลับมาว่างทันที",
    writes: true,
    params: [NAME("ชื่อผู้ใช้ (ไม่สนตัวพิมพ์เล็กใหญ่)")],
    codes: [
      ["OK", 200, "เช็คเอาท์สำเร็จ"],
      ["NOT_FOUND", 404, "ชื่อนี้ไม่ได้ใช้ห้องอยู่"],
      ["MISSING_FIELDS", 400, "ไม่ได้ส่ง name"],
    ],
  },
];

type Result = { status: number; ms: number; body: string } | null;

export default function ApiSection() {
  const [origin, setOrigin] = useState("https://YOUR-SITE.vercel.app");
  const [selId, setSelId] = useState("checkin");
  const [vals, setVals] = useState<Record<string, string>>(() =>
    Object.fromEntries(ENDPOINTS.flatMap((e) => e.params.map((p) => [`${e.id}.${p.key}`, p.required ? p.example : ""])))
  );
  const [apiKey, setApiKey] = useState("");
  const [result, setResult] = useState<Result>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  const ep = ENDPOINTS.find((e) => e.id === selId)!;
  const val = (p: Param) => vals[`${ep.id}.${p.key}`] ?? "";

  // Only send the fields that have a value. Numbers are sent as numbers.
  const body: Record<string, string | number> = {};
  for (const p of ep.params) {
    const v = val(p).trim();
    if (v !== "") body[p.key] = p.type === "number" && /^\d+$/.test(v) ? Number(v) : v;
  }

  async function run() {
    setBusy(true);
    const t0 = performance.now();
    try {
      const res = await fetch(ep.path, {
        method: ep.method,
        cache: "no-store",
        headers: { "Content-Type": "application/json", ...(apiKey ? { "x-api-key": apiKey } : {}) },
        body: ep.method === "POST" ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      let pretty = text;
      try {
        pretty = JSON.stringify(JSON.parse(text), null, 2);
      } catch {}
      setResult({ status: res.status, ms: Math.round(performance.now() - t0), body: pretty });
    } catch (e) {
      setResult({ status: 0, ms: 0, body: String(e) });
    } finally {
      setBusy(false);
    }
  }

  const keyHdr = apiKey ? ` \\\n  -H "x-api-key: <YOUR_KEY>"` : "";
  const curl =
    ep.method === "GET"
      ? `curl ${origin}${ep.path}`
      : `curl -X POST ${origin}${ep.path} \\\n  -H "Content-Type: application/json"${keyHdr} \\\n  -d '${JSON.stringify(body)}'`;

  const box = "rounded-xl border border-white/10 bg-deep/70";
  const code = "overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-3 text-xs leading-relaxed text-slate-300";
  const input = "w-full rounded-lg border border-white/10 bg-abyss px-2.5 py-1.5 text-sm text-white placeholder:text-slate-600 focus:border-glow focus:outline-none";
  const methodBadge = (m: string) =>
    `rounded px-1.5 py-0.5 text-[11px] font-semibold ${m === "GET" ? "bg-emerald-500/20 text-emerald-300" : "bg-amber-500/20 text-amber-300"}`;

  return (
    <section className="mt-14" id="api">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white">
        <Terminal size={20} className="text-glow" /> การทำงานของระบบ &amp; API
      </h2>

      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className={`${box} p-4`}>
            <div className="mb-2 flex items-center gap-2 text-glow">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-glow/20 text-xs font-semibold">{i + 1}</span>
              <s.icon size={16} />
            </div>
            <div className="font-medium text-slate-100">{s.title}</div>
            <p className="mt-1 text-sm text-slate-400">{s.text}</p>
          </li>
        ))}
      </ol>

      {/* Common rules */}
      <div className={`${box} mt-6 p-4 text-sm text-slate-300`}>
        <div className="mb-2 flex items-center gap-2 font-medium text-slate-100">
          <Info size={16} className="text-glow" /> ใช้เหมือนกันทุก endpoint
        </div>
        <ul className="list-disc space-y-1 pl-5 text-slate-400">
          <li>
            ทุก response เป็น JSON รูปแบบ <code className="text-glow">{`{ ok, code, message_th, data }`}</code> ดู <code className="text-glow">ok</code> กับ <code className="text-glow">code</code> เพื่อรู้ผล ส่วน <code className="text-glow">message_th</code> เป็นข้อความไทยที่บอทอ่านให้ผู้ใช้ได้เลย
          </li>
          <li>
            ทุก POST ต้องมี header <code className="text-glow">Content-Type: application/json</code>
          </li>
          <li>
            ถ้าเว็บเปิดใช้ <code className="text-glow">BOT_API_KEY</code> ต้องส่ง header <code className="text-glow">x-api-key</code> ด้วย (ยกเว้น GET /api/public/rooms)
          </li>
        </ul>
      </div>

      {/* Endpoint tabs */}
      <div className="mt-6 flex flex-wrap gap-2" role="tablist">
        {ENDPOINTS.map((e) => (
          <button
            key={e.id}
            role="tab"
            aria-selected={e.id === selId}
            onClick={() => {
              setSelId(e.id);
              setResult(null);
            }}
            className={`flex items-center gap-2 rounded-lg border px-3 py-1.5 text-sm transition ${
              e.id === selId ? "border-glow bg-glow/10 text-white" : "border-white/10 text-slate-400 hover:border-glow/40"
            }`}
          >
            <span className={methodBadge(e.method)}>{e.method}</span> {e.title}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-6 lg:grid-cols-2" data-testid="api-doc">
        {/* Left: documentation */}
        <div className="min-w-0">
          <div className={`${box} p-4`}>
            <div className="flex flex-wrap items-center gap-2">
              <span className={methodBadge(ep.method)}>{ep.method}</span>
              <code className="break-all text-sm text-glow">{ep.path}</code>
            </div>
            <p className="mt-2 text-sm text-slate-300">{ep.summary}</p>
            {ep.note && <p className="mt-2 text-xs text-slate-500">{ep.note}</p>}
          </div>

          <h3 className="mb-2 mt-5 text-sm font-medium text-slate-300">ข้อมูลที่ต้องส่ง</h3>
          {ep.params.length === 0 ? (
            <p className="text-sm text-slate-500">ไม่ต้องส่งอะไร</p>
          ) : (
            <div className={`${box} divide-y divide-white/5`}>
              {ep.params.map((p) => (
                <div key={p.key} className="p-3 text-sm">
                  <div className="flex flex-wrap items-center gap-2">
                    <code className="font-semibold text-white">{p.key}</code>
                    <span className="text-xs text-slate-500">{p.type === "number" ? "ตัวเลข" : "ข้อความ"}</span>
                    <span
                      className={`rounded-full px-2 py-0.5 text-[11px] font-medium ${
                        p.required ? "bg-rose-500/20 text-rose-300" : "bg-slate-500/20 text-slate-300"
                      }`}
                    >
                      {p.required ? "จำเป็นต้องใส่" : "ไม่บังคับ"}
                    </span>
                    <span className="ml-auto text-xs text-slate-500">
                      เช่น <code className="text-slate-300">{p.example}</code>
                    </span>
                  </div>
                  <p className="mt-1 text-xs text-slate-400">{p.desc}</p>
                </div>
              ))}
            </div>
          )}

          <h3 className="mb-2 mt-5 text-sm font-medium text-slate-300">ผลลัพธ์ที่เป็นไปได้ (code)</h3>
          <div className={`${box} divide-y divide-white/5`}>
            {ep.codes.map(([c, http, meaning]) => (
              <div key={c} className="flex flex-wrap items-start gap-x-3 gap-y-1 p-3 text-xs">
                <code className={`shrink-0 font-semibold ${c === "OK" ? "text-emerald-300" : "text-rose-300"}`}>{c}</code>
                <span className="shrink-0 text-slate-500">HTTP {http}</span>
                <span className="min-w-0 flex-1 basis-48 break-words text-slate-400">{meaning}</span>
              </div>
            ))}
          </div>
        </div>

        {/* Right: try it */}
        <div className="min-w-0">
          <h3 className="mb-2 text-sm font-medium text-slate-300">ลองเรียกเลย</h3>
          <div className={`${box} p-4`}>
            {ep.params.length === 0 ? (
              <p className="text-sm text-slate-400">endpoint นี้ไม่ต้องกรอกอะไร กดปุ่มได้เลย</p>
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {ep.params.map((p) => (
                  <label key={p.key} className="text-xs text-slate-400">
                    <span className="text-slate-200">{p.key}</span>
                    {p.required ? <span className="ml-1 text-rose-300">* จำเป็น</span> : <span className="ml-1 text-slate-500">(ไม่บังคับ เว้นว่างได้)</span>}
                    <input
                      className={`${input} mt-1`}
                      value={val(p)}
                      placeholder={p.required ? "" : `เช่น ${p.example}`}
                      onChange={(e) => setVals((v) => ({ ...v, [`${ep.id}.${p.key}`]: e.target.value }))}
                    />
                  </label>
                ))}
              </div>
            )}
            {ep.params.some((p) => p.required) && <p className="mt-2 text-xs text-slate-500">ลองเว้นช่องจำเป็นให้ว่าง แล้วกดเรียก จะเห็น error MISSING_FIELDS</p>}

            <label className="mt-3 block text-xs text-slate-400">
              x-api-key (ใส่เฉพาะเมื่อเปิดใช้ BOT_API_KEY)
              <input className={`${input} mt-1`} type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} autoComplete="off" />
            </label>

            <button
              onClick={run}
              disabled={busy}
              className="mt-3 inline-flex items-center gap-1.5 rounded-lg border border-glow/40 bg-glow/10 px-3 py-1.5 text-sm text-glow transition hover:bg-glow/20 disabled:opacity-50"
            >
              <Play size={14} /> เรียก {ep.method} {ep.path.replace("/api/public/rooms", "") || "/"}
            </button>
            {ep.writes && <p className="mt-2 text-xs text-amber-300/80">endpoint นี้เขียนข้อมูลจริง ห้องบนบอร์ดจะเปลี่ยนตาม</p>}
          </div>

          <pre className={`${code} mt-3 max-h-80 min-h-24`} data-testid="api-result">
            {result ? `HTTP ${result.status} · ${result.ms} ms\n${result.body}` : "ผลลัพธ์จะแสดงที่นี่"}
          </pre>

          <h3 className="mb-2 mt-5 text-sm font-medium text-slate-300">ตัวอย่าง curl (ใช้ URL ของเว็บนี้ และค่าที่กรอกด้านบน)</h3>
          <pre className={code} data-testid="api-curl">{curl}</pre>
        </div>
      </div>
    </section>
  );
}
