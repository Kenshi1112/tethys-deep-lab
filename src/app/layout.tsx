import type { Metadata } from "next";
import "./globals.css";
import NavBar from "@/components/NavBar";
import BotnoiChat from "@/components/BotnoiChat";

export const metadata: Metadata = {
  title: { default: "Tethys' Deep — ศูนย์วิจัยใต้ดิน", template: "%s" },
  description: "บอร์ดสถานะห้องของศูนย์วิจัยใต้ดิน จองห้องผ่านแชทบอท Shorekeeper",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="th">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="" />
        <link
          href="https://fonts.googleapis.com/css2?family=Prompt:wght@300;400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        <NavBar />
        {children}
        <footer className="border-t border-white/5 py-6 text-center text-xs text-slate-500">
          โปรเจกต์ฝึกงาน ไม่เกี่ยวข้องกับ Kuro Games
        </footer>
        <BotnoiChat />
      </body>
    </html>
  );
}
