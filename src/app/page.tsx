import Board from "@/components/Board";
import ApiSection from "@/components/ApiSection";
import BotnoiChat from "@/components/BotnoiChat";

export default function Home() {
  return (
    <>
      <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
        <Board />
        <ApiSection />
      </main>
      <footer className="border-t border-white/5 py-6 text-center text-xs text-slate-500">
        โปรเจกต์ฝึกงาน ไม่เกี่ยวข้องกับ Kuro Games
      </footer>
      <BotnoiChat />
    </>
  );
}
