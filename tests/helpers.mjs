// Shared helpers for the API tests.
import fs from "node:fs";
import pg from "pg";

export const BASE = process.env.TEST_BASE_URL || "http://localhost:3000";
const DB_URL = process.env.DATABASE_URL || process.env.POSTGRES_URL;

export const db = new pg.Client({ connectionString: DB_URL });
let connected = false;
export async function connectDb() {
  if (!connected) {
    await db.connect();
    connected = true;
  }
}

// Put the database back to the demo state (3 occupied rooms) before each test.
export async function resetDb() {
  await connectDb();
  await db.query("DELETE FROM bookings");
  await db.query(fs.readFileSync("db/schema.sql", "utf8")); // idempotent: re-inserts the 3 demo bookings
}

export async function closeDb() {
  if (connected) await db.end();
}

export async function post(path, body, headers = {}, base = BASE) {
  const res = await fetch(base + path, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: typeof body === "string" ? body : JSON.stringify(body),
  });
  return { status: res.status, json: await res.json() };
}

export const checkin = (b, headers, base) => post("/api/public/rooms/checkin", b, headers, base);
export const lookup = (b) => post("/api/public/rooms/checkout-lookup", b);
export const checkout = (b) => post("/api/public/rooms/checkout", b);

export async function board() {
  const res = await fetch(BASE + "/api/public/rooms");
  return (await res.json()).data;
}
