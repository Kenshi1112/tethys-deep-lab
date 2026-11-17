// All database logic lives here. API routes only call these functions.
import { getPool } from "./db";

export type Topic = { code: string; name: string; floors: number[] };

export type RoomRow = {
  code: string;
  floor: number;
  status: "free" | "occupied";
  occupant_name: string | null;
  topic_code: string | null;
  topic_name: string | null;
  checked_in_at: string | null;
};

// Result of a business operation: a code + Thai message + optional data.
export type Result = { code: string; message_th: string; data?: unknown };

const pool = () => getPool();
const s = (v: unknown) => (typeof v === "string" ? v.trim() : typeof v === "number" ? String(v) : "");

export async function getTopics(): Promise<Topic[]> {
  const { rows } = await pool().query(
    `SELECT t.code, t.name, COALESCE(array_agg(tf.floor ORDER BY tf.floor), '{}') AS floors
       FROM topics t LEFT JOIN topic_floors tf ON tf.topic_id = t.id
      GROUP BY t.id ORDER BY t.code`
  );
  return rows;
}

export async function getBoard() {
  const { rows } = await pool().query(
    `SELECT r.code, r.floor,
            CASE WHEN b.id IS NULL THEN 'free' ELSE 'occupied' END AS status,
            b.person_name AS occupant_name, t.code AS topic_code, t.name AS topic_name,
            b.checked_in_at
       FROM rooms r
       LEFT JOIN bookings b ON b.room_id = r.id AND b.checked_out_at IS NULL
       LEFT JOIN topics t ON t.id = b.topic_id
      ORDER BY r.code`
  );
  const rooms: RoomRow[] = rows.map((r) => ({
    ...r,
    checked_in_at: r.checked_in_at ? new Date(r.checked_in_at).toISOString() : null,
  }));
  const occupied = rooms.filter((r) => r.status === "occupied").length;
  return {
    rooms,
    topics: await getTopics(),
    summary: { total: rooms.length, free: rooms.length - occupied, occupied },
    server_time: new Date().toISOString(),
  };
}

// Free rooms on the floors where this topic is allowed.
async function freeRoomsForTopic(topicId: number) {
  const { rows } = await pool().query(
    `SELECT r.code AS room, r.floor
       FROM rooms r JOIN topic_floors tf ON tf.floor = r.floor AND tf.topic_id = $1
      WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.room_id = r.id AND b.checked_out_at IS NULL)
      ORDER BY r.code`,
    [topicId]
  );
  return rows as { room: string; floor: number }[];
}

export async function checkIn(body: Record<string, unknown>): Promise<Result> {
  const name = s(body.name);
  const topicIn = s(body.topic);
  const floorIn = s(body.floor);
  const roomIn = s(body.room);

  // 1. missing fields
  const missing = (["name", "topic", "floor", "room"] as const).filter((k) => !s(body[k]));
  if (missing.length) {
    return { code: "MISSING_FIELDS", message_th: `ข้อมูลไม่ครบ: ต้องระบุ ${missing.join(", ")}`, data: { missing_fields: missing } };
  }

  // 2. topic exists (match by code A/B/C or by full name, case-insensitive)
  const t = await pool().query(
    `SELECT id, code, name FROM topics WHERE lower(code) = lower($1) OR lower(name) = lower($1)`,
    [topicIn]
  );
  if (!t.rows[0]) {
    return { code: "TOPIC_NOT_FOUND", message_th: `ไม่พบหัวข้อ "${topicIn}" (ใช้ได้: A, B, C)`, data: { valid_topics: ["A", "B", "C"] } };
  }
  const topic = t.rows[0] as { id: number; code: string; name: string };

  // 3. room exists on that floor
  const floor = /^\d+$/.test(floorIn) ? Number(floorIn) : NaN;
  const r = Number.isNaN(floor)
    ? { rows: [] }
    : await pool().query(`SELECT id, code, floor FROM rooms WHERE code = $1 AND floor = $2`, [roomIn, floor]);
  if (!r.rows[0]) {
    return { code: "ROOM_NOT_FOUND", message_th: `ไม่พบห้อง ${roomIn} ในชั้น ${floorIn}` };
  }
  const room = r.rows[0] as { id: number; code: string; floor: number };

  // 4. topic allowed on this floor
  const allowed = await pool().query(`SELECT floor FROM topic_floors WHERE topic_id = $1 ORDER BY floor`, [topic.id]);
  const allowedFloors: number[] = allowed.rows.map((x) => x.floor);
  if (!allowedFloors.includes(room.floor)) {
    return {
      code: "TOPIC_NOT_ALLOWED_ON_FLOOR",
      message_th: `หัวข้อ ${topic.code} ทำได้เฉพาะชั้น ${allowedFloors.join(", ")} จองชั้น ${room.floor} ไม่ได้`,
      data: { allowed_floors: allowedFloors },
    };
  }

  const occupiedResult = async (): Promise<Result> => ({
    code: "ROOM_OCCUPIED",
    message_th: `ห้อง ${room.code} มีคนใช้อยู่`,
    data: { suggestions: await freeRoomsForTopic(topic.id) },
  });
  const alreadyResult = async (): Promise<Result> => {
    const cur = await pool().query(
      `SELECT r.code, r.floor FROM bookings b JOIN rooms r ON r.id = b.room_id
        WHERE lower(b.person_name) = lower($1) AND b.checked_out_at IS NULL`,
      [name]
    );
    const c = cur.rows[0];
    return {
      code: "ALREADY_CHECKED_IN",
      message_th: c ? `${name} มีห้องที่ใช้อยู่แล้ว (ห้อง ${c.code} ชั้น ${c.floor}) กรุณาเช็คเอาท์ก่อน` : `${name} มีห้องที่ใช้อยู่แล้ว กรุณาเช็คเอาท์ก่อน`,
      data: c ? { floor: c.floor, room: c.code } : null,
    };
  };

  // 5. room already occupied
  const occ = await pool().query(`SELECT 1 FROM bookings WHERE room_id = $1 AND checked_out_at IS NULL`, [room.id]);
  if (occ.rows[0]) return occupiedResult();

  // 6. this name already has an active room
  const dup = await pool().query(`SELECT 1 FROM bookings WHERE lower(person_name) = lower($1) AND checked_out_at IS NULL`, [name]);
  if (dup.rows[0]) return alreadyResult();

  // Insert. The two partial unique indexes are the real guard against races:
  // if two requests pass the checks above at the same time, only one INSERT wins.
  try {
    const ins = await pool().query(
      `INSERT INTO bookings (room_id, person_name, topic_id) VALUES ($1, $2, $3) RETURNING checked_in_at`,
      [room.id, name, topic.id]
    );
    return {
      code: "OK",
      message_th: `เช็คอินสำเร็จ: ${name} ห้อง ${room.code} ชั้น ${room.floor} หัวข้อ ${topic.code}`,
      data: {
        name,
        floor: room.floor,
        room: room.code,
        topic: { code: topic.code, name: topic.name },
        checked_in_at: new Date(ins.rows[0].checked_in_at).toISOString(),
      },
    };
  } catch (e) {
    const err = e as { code?: string; constraint?: string };
    if (err.code === "23505") {
      if (err.constraint === "bookings_one_active_per_room") return occupiedResult();
      if (err.constraint === "bookings_one_active_per_person") return alreadyResult();
    }
    throw e;
  }
}

export async function checkoutLookup(body: Record<string, unknown>): Promise<Result> {
  const name = s(body.name);
  if (!name) return { code: "MISSING_FIELDS", message_th: "ข้อมูลไม่ครบ: ต้องระบุ name", data: { missing_fields: ["name"] } };
  const { rows } = await pool().query(
    `SELECT b.person_name, r.floor, r.code AS room, t.code AS topic_code, t.name AS topic_name, b.checked_in_at
       FROM bookings b JOIN rooms r ON r.id = b.room_id JOIN topics t ON t.id = b.topic_id
      WHERE lower(b.person_name) = lower($1) AND b.checked_out_at IS NULL`,
    [name]
  );
  const b = rows[0];
  if (!b) return { code: "NOT_FOUND", message_th: `ไม่พบการใช้งานห้องของ ${name}` };
  return {
    code: "OK",
    message_th: `${b.person_name} ใช้ห้อง ${b.room} ชั้น ${b.floor} หัวข้อ ${b.topic_code}`,
    data: {
      name: b.person_name,
      floor: b.floor,
      room: b.room,
      topic: { code: b.topic_code, name: b.topic_name },
      checked_in_at: new Date(b.checked_in_at).toISOString(),
    },
  };
}

export async function checkout(body: Record<string, unknown>): Promise<Result> {
  const name = s(body.name);
  if (!name) return { code: "MISSING_FIELDS", message_th: "ข้อมูลไม่ครบ: ต้องระบุ name", data: { missing_fields: ["name"] } };
  // One atomic UPDATE: finds the active booking and closes it.
  const { rows } = await pool().query(
    `UPDATE bookings b SET checked_out_at = now()
       FROM rooms r
      WHERE r.id = b.room_id AND lower(b.person_name) = lower($1) AND b.checked_out_at IS NULL
      RETURNING b.person_name, r.code AS room, r.floor`,
    [name]
  );
  const b = rows[0];
  if (!b) return { code: "NOT_FOUND", message_th: `ไม่พบการใช้งานห้องของ ${name}` };
  return {
    code: "OK",
    message_th: `เช็คเอาท์สำเร็จ: ${b.person_name} ออกจากห้อง ${b.room} ชั้น ${b.floor} แล้ว ห้องนี้ว่าง`,
    data: { name: b.person_name, floor: b.floor, room: b.room },
  };
}
