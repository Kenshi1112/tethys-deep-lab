import { available } from "@/lib/rooms";
import { reply, checkApiKey, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

async function run(input: Record<string, unknown>) {
  try {
    const r = await available(input);
    return reply(r.code, r.message_th, r.data ?? null);
  } catch (e) {
    console.error(e);
    return reply("INTERNAL_ERROR", "ระบบขัดข้อง กรุณาลองใหม่");
  }
}

// POST body: { topic?, floor? }
export async function POST(req: Request) {
  const denied = checkApiKey(req);
  if (denied) return denied;
  return run(await readJson(req));
}

// GET ?topic=A&floor=1  (same fields as query params)
export async function GET(req: Request) {
  const denied = checkApiKey(req);
  if (denied) return denied;
  const q = new URL(req.url).searchParams;
  return run({ topic: q.get("topic") ?? undefined, floor: q.get("floor") ?? undefined });
}
