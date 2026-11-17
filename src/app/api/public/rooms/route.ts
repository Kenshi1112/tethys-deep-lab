import { getBoard } from "@/lib/rooms";
import { reply } from "@/lib/http";

export const dynamic = "force-dynamic";

// Public read-only board data (no API key needed: the browser polls this).
export async function GET() {
  try {
    return reply("OK", "ดึงข้อมูลห้องสำเร็จ", await getBoard());
  } catch (e) {
    console.error(e);
    return reply("INTERNAL_ERROR", "ระบบขัดข้อง กรุณาลองใหม่");
  }
}
