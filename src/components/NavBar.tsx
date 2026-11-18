"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Waves, Home, FlaskConical, Terminal } from "lucide-react";

const LINKS = [
  { href: "/", label: "หน้าแรก", icon: Home },
  { href: "/lab", label: "ศูนย์วิจัย", icon: FlaskConical },
  { href: "/api-docs", label: "เอกสาร API", icon: Terminal },
];

export default function NavBar() {
  const path = usePathname();
  return (
    <header className="sticky top-0 z-30 border-b border-white/10 bg-abyss/80 backdrop-blur">
      <nav aria-label="เมนูหลัก" className="mx-auto flex max-w-6xl items-center justify-between gap-2 px-3 py-2.5 sm:gap-3 sm:px-6">
        <Link href="/" className="flex items-center gap-2.5" aria-label="Tethys' Deep หน้าแรก">
          <span className="flex h-9 w-9 items-center justify-center rounded-xl border border-glow/40 bg-glow/10 text-glow shadow-[0_0_18px_-4px_rgba(79,195,247,0.7)]">
            <Waves size={18} />
          </span>
          <span className="hidden leading-tight min-[460px]:block">
            <span className="block whitespace-nowrap text-sm font-semibold text-white">Tethys&apos; Deep</span>
            <span className="hidden text-[11px] text-slate-400 sm:block">ศูนย์วิจัยใต้ดิน</span>
          </span>
        </Link>

        <ul className="flex items-center gap-1">
          {LINKS.map((l) => {
            const active = l.href === "/" ? path === "/" : path.startsWith(l.href);
            return (
              <li key={l.href}>
                <Link
                  href={l.href}
                  aria-current={active ? "page" : undefined}
                  className={`flex items-center gap-1.5 rounded-lg border px-2.5 py-1.5 text-[13px] transition sm:px-3 sm:text-sm ${
                    active
                      ? "border-glow/50 bg-glow/10 text-white shadow-[0_0_16px_-6px_rgba(79,195,247,0.8)]"
                      : "border-transparent text-slate-400 hover:bg-white/5 hover:text-slate-100"
                  }`}
                >
                  <l.icon size={15} className={active ? "text-glow" : ""} />
                  <span className="whitespace-nowrap">{l.label}</span>
                </Link>
              </li>
            );
          })}
        </ul>
      </nav>
    </header>
  );
}
