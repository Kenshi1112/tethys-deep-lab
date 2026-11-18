import type { ReactNode } from "react";

// Title block used at the top of the inner pages.
export default function PageHeader({ icon, badge, title, children }: { icon: ReactNode; badge: string; title: string; children?: ReactNode }) {
  return (
    <header className="mb-8">
      <div className="mb-2 inline-flex items-center gap-2 rounded-full border border-glow/30 bg-glow/10 px-3 py-1 text-xs text-glow">
        {icon} {badge}
      </div>
      <h1 className="text-3xl font-bold text-white drop-shadow-[0_0_18px_rgba(79,195,247,0.45)] sm:text-4xl">{title}</h1>
      {children && <p className="mt-1 max-w-2xl text-slate-400">{children}</p>}
    </header>
  );
}
