import { checkoutLookup } from "@/lib/rooms";
import { reply, checkApiKey, readJson } from "@/lib/http";

export const dynamic = "force-dynamic";

export async function POST(req: Request) {
  const denied = checkApiKey(req);
  if (denied) return denied;
  try {
    const r = await checkoutLookup(await readJson(req));
    return reply(r.code, r.message_th, r.data ?? null);
  } catch (e) {
    console.error(e);
    return reply("INTERNAL_ERROR", "ระบบขัดข้อง กรุณาลองใหม่");
  }
}
