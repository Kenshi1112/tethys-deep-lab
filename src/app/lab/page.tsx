import type { Metadata } from "next";
import Board from "@/components/Board";

export const metadata: Metadata = { title: "ศูนย์วิจัย — Tethys' Deep" };

export default function Lab() {
  return (
    <main className="mx-auto max-w-6xl px-4 pb-24 pt-8 sm:px-6">
      <Board />
    </main>
  );
}
