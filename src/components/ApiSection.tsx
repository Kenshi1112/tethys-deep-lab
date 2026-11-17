"use client";

import { useEffect, useState } from "react";
import { MessageCircle, Bot, RefreshCw, DoorClosed, Play, Terminal } from "lucide-react";

const STEPS = [
  { icon: MessageCircle, title: "คุยกับ Shorekeeper", text: "ผู้ใช้บอกชื่อ หัวข้อ ชั้น และห้องที่ต้องการในแชท" },
  { icon: Bot, title: "บอทขอยืนยันแล้วเรียก API", text: "บอทสรุปข้อมูลให้ยืนยัน จากนั้นเรียก POST /api/public/rooms/checkin" },
  { icon: RefreshCw, title: "บอร์ดอัปเดตภายในไม่กี่วินาที", text: "หน้าเว็บดึงข้อมูลใหม่ทุก 3 วินาที การ์ดห้องจึงเปลี่ยนสีเอง" },
  { icon: DoorClosed, title: "เช็คเอาท์แล้วห้องว่าง", text: "ผู้ใช้บอกบอทให้เช็คเอาท์ ห้องจะกลับมาว่างให้คนอื่นใช้ต่อ" },
];

type Result = { status: number; ms: number; body: string } | null;

export default function ApiSection() {
  const [origin, setOrigin] = useState("https://YOUR-SITE.vercel.app");
  const [name, setName] = useState("ทดสอบ");
  const [topic, setTopic] = useState("A");
  const [floor, setFloor] = useState("1");
  const [room, setRoom] = useState("101");
  const [apiKey, setApiKey] = useState("");
  const [result, setResult] = useState<Result>(null);
  const [busy, setBusy] = useState(false);

  useEffect(() => setOrigin(window.location.origin), []);

  async function call(method: "GET" | "POST", path: string, body?: object) {
    setBusy(true);
    const t0 = performance.now();
    try {
      const res = await fetch(path, {
        method,
        cache: "no-store",
        headers: { "Content-Type": "application/json", ...(apiKey ? { "x-api-key": apiKey } : {}) },
        body: body ? JSON.stringify(body) : undefined,
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

  const checkinBody = { name, topic, floor: Number(floor) || floor, room };
  const btn = "inline-flex items-center gap-1.5 rounded-lg border border-glow/40 bg-glow/10 px-3 py-1.5 text-sm text-glow transition hover:bg-glow/20 disabled:opacity-50";
  const input = "w-full rounded-lg border border-white/10 bg-abyss px-2.5 py-1.5 text-sm text-white placeholder:text-slate-600 focus:border-glow focus:outline-none";
  const code = "overflow-x-auto rounded-xl border border-white/10 bg-black/40 p-3 text-xs leading-relaxed text-slate-300";
  const keyHdr = apiKey ? ` \\\n  -H "x-api-key: <YOUR_KEY>"` : "";

  return (
    <section className="mt-14" id="api">
      <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white">
        <Terminal size={20} className="text-glow" /> การทำงานของระบบ &amp; API
      </h2>

      <ol className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {STEPS.map((s, i) => (
          <li key={s.title} className="rounded-xl border border-white/10 bg-deep/70 p-4">
            <div className="mb-2 flex items-center gap-2 text-glow">
              <span className="flex h-6 w-6 items-center justify-center rounded-full bg-glow/20 text-xs font-semibold">{i + 1}</span>
              <s.icon size={16} />
            </div>
            <div className="font-medium text-slate-100">{s.title}</div>
            <p className="mt-1 text-sm text-slate-400">{s.text}</p>
          </li>
        ))}
      </ol>

      <div className="mt-6 grid gap-6 lg:grid-cols-2">
        <div className="min-w-0">
          <h3 className="mb-2 break-words text-sm font-medium text-slate-300">รูปแบบ body ของการเช็คอิน (POST /api/public/rooms/checkin)</h3>
          <pre className={code}>{`{
  "name": "ชื่อผู้ใช้",
  "topic": "A",      // A / B / C หรือชื่อเต็มของหัวข้อ
  "floor": 1,        // 1 / 2 / 3
  "room": "101"      // เลขห้อง
}`}</pre>
          <p className="mt-2 text-xs text-slate-500">ทุก response เป็น JSON รูปแบบ {`{ ok, code, message_th, data }`}</p>

          <h3 className="mb-2 mt-5 text-sm font-medium text-slate-300">ตัวอย่าง curl (ใช้ URL ของเว็บนี้)</h3>
          <pre className={code}>{`# ดูสถานะห้องทั้งหมด
curl ${origin}/api/public/rooms

# เช็คอิน
curl -X POST ${origin}/api/public/rooms/checkin \\
  -H "Content-Type: application/json"${keyHdr} \\
  -d '${JSON.stringify(checkinBody)}'

# หาห้องของคนที่จะเช็คเอาท์
curl -X POST ${origin}/api/public/rooms/checkout-lookup \\
  -H "Content-Type: application/json"${keyHdr} \\
  -d '${JSON.stringify({ name })}'

# เช็คเอาท์
curl -X POST ${origin}/api/public/rooms/checkout \\
  -H "Content-Type: application/json"${keyHdr} \\
  -d '${JSON.stringify({ name })}'`}</pre>
        </div>

        <div className="min-w-0">
          <h3 className="mb-2 text-sm font-medium text-slate-300">ลองเรียก API จากหน้านี้</h3>
          <div className="rounded-xl border border-white/10 bg-deep/70 p-4">
            <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
              <label className="col-span-2 text-xs text-slate-400 sm:col-span-1">ชื่อ<input className={input} value={name} onChange={(e) => setName(e.target.value)} /></label>
              <label className="text-xs text-slate-400">หัวข้อ<input className={input} value={topic} onChange={(e) => setTopic(e.target.value)} /></label>
              <label className="text-xs text-slate-400">ชั้น<input className={input} value={floor} onChange={(e) => setFloor(e.target.value)} /></label>
              <label className="text-xs text-slate-400">ห้อง<input className={input} value={room} onChange={(e) => setRoom(e.target.value)} /></label>
            </div>
            <label className="mt-3 block text-xs text-slate-400">
              x-api-key (ใส่เฉพาะเมื่อเปิดใช้ BOT_API_KEY)
              <input className={input} type="password" value={apiKey} onChange={(e) => setApiKey(e.target.value)} autoComplete="off" />
            </label>
            <div className="mt-3 flex flex-wrap gap-2">
              <button className={btn} disabled={busy} onClick={() => call("GET", "/api/public/rooms")}><Play size={14} /> GET rooms</button>
              <button className={btn} disabled={busy} onClick={() => call("POST", "/api/public/rooms/checkin", checkinBody)}><Play size={14} /> checkin</button>
              <button className={btn} disabled={busy} onClick={() => call("POST", "/api/public/rooms/checkout-lookup", { name })}><Play size={14} /> checkout-lookup</button>
              <button className={btn} disabled={busy} onClick={() => call("POST", "/api/public/rooms/checkout", { name })}><Play size={14} /> checkout</button>
            </div>
            <p className="mt-2 text-xs text-amber-300/80">ปุ่มเหล่านี้เขียนข้อมูลจริง ห้องบนบอร์ดจะเปลี่ยนตาม</p>
          </div>
          <pre className={`${code} mt-3 max-h-80 min-h-24`} data-testid="api-result">
            {result ? `HTTP ${result.status} · ${result.ms} ms\n${result.body}` : "ผลลัพธ์จะแสดงที่นี่"}
          </pre>
        </div>
      </div>
    </section>
  );
}
