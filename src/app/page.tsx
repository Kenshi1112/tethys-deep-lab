import Link from "next/link";
import { ArrowRight, MessageCircle, MousePointerClick, RefreshCw, Terminal, FlaskConical } from "lucide-react";
import { LiveStats, TopicCards } from "@/components/HomeLive";

const HOW = [
  { icon: MessageCircle, title: "คุยกับ Shorekeeper", text: "กดปุ่มแชทมุมขวาล่าง พิมพ์ \"ชอร์\" แล้วบอกชื่อ หัวข้อ ชั้น และห้องที่ต้องการ" },
  { icon: MousePointerClick, title: "หรือกดที่ห้องเอง", text: "ไปที่หน้าศูนย์วิจัย กดห้องว่างเพื่อใส่ชื่อและเลือกหัวข้อ กดห้องที่มีคนใช้เพื่อลงชื่อออก" },
  { icon: RefreshCw, title: "บอร์ดอัปเดตทันที", text: "สถานะห้องรีเฟรชเองทุกไม่กี่วินาที ไม่ต้องกดโหลดหน้าใหม่" },
];

export default function Home() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-10 sm:px-6">
      {/* Hero */}
      <section className="grid items-center gap-8 lg:grid-cols-[1.2fr_1fr]">
        <div>
          <div className="mb-3 inline-flex items-center gap-2 rounded-full border border-glow/30 bg-glow/10 px-3 py-1 text-xs text-glow">
            <span className="h-1.5 w-1.5 animate-pulse rounded-full bg-glow" /> ระบบลงชื่อเข้า-ออกห้องวิจัย
          </div>
          <h1 className="text-4xl font-bold leading-tight text-white drop-shadow-[0_0_24px_rgba(79,195,247,0.5)] sm:text-5xl">
            Tethys&apos; Deep
            <span className="block text-2xl font-medium text-slate-300 sm:text-3xl">ศูนย์วิจัยใต้ดิน</span>
          </h1>
          <p className="mt-4 max-w-xl text-slate-400">
            12 ห้อง 3 ชั้น 3 หัวข้อวิจัย จองห้องผ่านแชทบอท Shorekeeper หรือกดที่ห้องบนเว็บได้เลย และดูสถานะห้องแบบเรียลไทม์
          </p>
          <div className="mt-6 flex flex-wrap gap-3">
            <Link href="/lab" className="inline-flex items-center gap-2 rounded-xl bg-glow px-5 py-2.5 font-medium text-abyss shadow-[0_0_24px_-4px_rgba(79,195,247,0.8)] transition hover:brightness-110">
              ดูบอร์ดห้อง <ArrowRight size={16} />
            </Link>
            <Link href="/api-docs" className="inline-flex items-center gap-2 rounded-xl border border-white/15 px-5 py-2.5 text-slate-200 transition hover:border-glow/50 hover:bg-white/5">
              <Terminal size={16} /> เอกสาร API
            </Link>
          </div>
        </div>
        <LiveStats />
      </section>

      {/* How to use */}
      <section className="mt-16">
        <h2 className="mb-4 text-xl font-semibold text-white">วิธีใช้งาน</h2>
        <ol className="grid gap-3 md:grid-cols-3">
          {HOW.map((h, i) => (
            <li key={h.title} className="rounded-2xl border border-white/10 bg-deep/70 p-5">
              <div className="mb-3 flex items-center gap-2 text-glow">
                <span className="flex h-7 w-7 items-center justify-center rounded-full bg-glow/20 text-sm font-semibold">{i + 1}</span>
                <h.icon size={18} />
              </div>
              <div className="font-medium text-slate-100">{h.title}</div>
              <p className="mt-1 text-sm text-slate-400">{h.text}</p>
            </li>
          ))}
        </ol>
      </section>

      {/* Topics */}
      <section className="mt-16">
        <h2 className="mb-4 flex items-center gap-2 text-xl font-semibold text-white">
          <FlaskConical size={20} className="text-glow" /> หัวข้อวิจัย
        </h2>
        <TopicCards />
      </section>

      {/* Developers */}
      <section className="mt-16 rounded-2xl border border-glow/20 bg-gradient-to-br from-glow/10 to-transparent p-6">
        <h2 className="flex items-center gap-2 text-xl font-semibold text-white">
          <Terminal size={20} className="text-glow" /> สำหรับนักพัฒนา
        </h2>
        <p className="mt-2 max-w-2xl text-slate-400">API สาธารณะ 5 ตัว ดูห้อง ดูห้องว่าง เช็คอิน หาห้องก่อนเช็คเอาท์ และเช็คเอาท์ ตอบเป็น JSON ภาษาไทยพร้อมใช้กับแชทบอท มีฟอร์มลองยิงและตัวอย่าง curl ในหน้าเอกสาร</p>
        <Link href="/api-docs" className="mt-4 inline-flex items-center gap-2 text-glow hover:underline">
          เปิดเอกสาร API <ArrowRight size={16} />
        </Link>
      </section>
    </main>
  );
}
