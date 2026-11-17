import { NextResponse } from "next/server";

// Every endpoint answers with this shape.
export type ApiBody = {
  ok: boolean;
  code: string;
  message_th: string;
  data: unknown;
};

const STATUS: Record<string, number> = {
  OK: 200,
  MISSING_FIELDS: 400,
  TOPIC_NOT_FOUND: 404,
  ROOM_NOT_FOUND: 404,
  NOT_FOUND: 404,
  TOPIC_NOT_ALLOWED_ON_FLOOR: 422,
  ROOM_OCCUPIED: 409,
  ALREADY_CHECKED_IN: 409,
  UNAUTHORIZED: 401,
  INTERNAL_ERROR: 500,
};

export function reply(code: string, message_th: string, data: unknown = null) {
  const ok = code === "OK";
  const body: ApiBody = { ok, code, message_th, data };
  const status = process.env.RESPONSE_ALWAYS_200 === "true" ? 200 : (STATUS[code] ?? 400);
  return NextResponse.json(body, { status, headers: { "Cache-Control": "no-store" } });
}

// Optional API key: only enforced when BOT_API_KEY is set (demo mode otherwise).
export function checkApiKey(req: Request) {
  const required = process.env.BOT_API_KEY;
  if (!required) return null;
  if (req.headers.get("x-api-key") === required) return null;
  return reply("UNAUTHORIZED", "API key ไม่ถูกต้อง (ต้องส่ง header x-api-key)");
}

// Read a JSON body without throwing (a bad body is treated as an empty one).
export async function readJson(req: Request): Promise<Record<string, unknown>> {
  try {
    const v = await req.json();
    return v && typeof v === "object" ? (v as Record<string, unknown>) : {};
  } catch {
    return {};
  }
}
