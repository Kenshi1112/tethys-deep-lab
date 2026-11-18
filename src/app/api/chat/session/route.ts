import { NextResponse } from "next/server";
import { BOTNOI } from "@/config";
import { readJson } from "@/lib/http";

// Botnoi stopped allowing its chat page to be shown inside an <iframe> on other sites
// (frame-ancestors 'none'), so the site now draws its own chat box (BotnoiChat.tsx).
// That box talks to the same bot through Botnoi's web-chat API:
//   1) this route asks Botnoi for a guest session (browsers cannot call that endpoint: no CORS),
//   2) the browser then opens a WebSocket to Botnoi with the returned token (WebSockets ignore CORS).
export const dynamic = "force-dynamic";
export const maxDuration = 15;

const UID_PATTERN = /^[A-Za-z0-9_-]{8,64}$/;

export async function POST(req: Request) {
  const body = await readJson(req);
  const uid = typeof body.uid === "string" && UID_PATTERN.test(body.uid) ? body.uid : `web-${crypto.randomUUID()}`;

  try {
    const res = await fetch(`${BOTNOI.apiBase}/webchat/user`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ bot_id: BOTNOI.botId, uid, display_name: "ผู้เยี่ยมชมเว็บ" }),
      signal: AbortSignal.timeout(10_000),
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`Botnoi answered ${res.status}`);
    const data = (await res.json()) as { access_token?: string };
    if (!data.access_token) throw new Error("Botnoi sent no access_token");
    return NextResponse.json(
      { ok: true, uid, access_token: data.access_token, ws_url: `${BOTNOI.wsBase}/webchat/connect` },
      { headers: { "Cache-Control": "no-store" } },
    );
  } catch {
    return NextResponse.json(
      { ok: false, message_th: "เชื่อมต่อแชทบอทไม่ได้ในตอนนี้ ลองใหม่อีกครั้งค่ะ" },
      { status: 502, headers: { "Cache-Control": "no-store" } },
    );
  }
}
