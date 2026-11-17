import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { resetDb, closeDb, post, checkin, checkout, BASE } from "./helpers.mjs";

beforeEach(resetDb);
after(closeDb);

const avail = (b) => post("/api/public/rooms/available", b ?? {});
const availGet = async (qs = "") => {
  const res = await fetch(`${BASE}/api/public/rooms/available${qs}`);
  return { status: res.status, json: await res.json() };
};
const byFloor = (r) => Object.fromEntries(r.json.data.floors.map((f) => [f.floor, f.free_rooms]));
const NOTHING = "ตอนนี้ไม่มีห้องว่างตามเงื่อนไขนี้";

// Fill every free room (9 of them) through the real check-in API.
async function fillEverything() {
  const plan = [["A", 1, ["101", "103", "104"]], ["B", 2, ["201", "202", "204"]], ["B", 3, ["302", "303", "304"]]];
  for (const [topic, floor, rooms] of plan)
    for (const room of rooms) assert.equal((await checkin({ name: `Fill-${room}`, topic, floor, room })).json.code, "OK");
}

test("no filter: all free rooms grouped by floor, with allowed topics and occupied counts", async () => {
  const r = await avail();
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);
  assert.equal(r.json.code, "OK");
  assert.equal(r.json.data.total_free, 9);
  assert.deepEqual(byFloor(r), { 1: ["101", "103", "104"], 2: ["201", "202", "204"], 3: ["302", "303", "304"] });
  assert.deepEqual(r.json.data.floors.map((f) => f.allowed_topics), [["A"], ["A", "B"], ["B", "C"]]);
  assert.deepEqual(r.json.data.floors.map((f) => f.occupied_count), [1, 1, 1]);
  assert.equal(
    r.json.message_th,
    "ชั้น 1 ว่าง 101, 103, 104 (ทำหัวข้อ A ได้); ชั้น 2 ว่าง 201, 202, 204 (ทำหัวข้อ A, B ได้); ชั้น 3 ว่าง 302, 303, 304 (ทำหัวข้อ B, C ได้)"
  );
});

test("empty body and broken JSON behave like no filter", async () => {
  assert.equal((await post("/api/public/rooms/available", "{not json")).json.data.total_free, 9);
  assert.equal((await avail({ topic: "", floor: "  " })).json.data.total_free, 9);
});

test("topic filter returns only the floors that topic is allowed on", async () => {
  assert.deepEqual(byFloor(await avail({ topic: "A" })), { 1: ["101", "103", "104"], 2: ["201", "202", "204"] });
  assert.deepEqual(byFloor(await avail({ topic: "B" })), { 2: ["201", "202", "204"], 3: ["302", "303", "304"] });
  assert.deepEqual(byFloor(await avail({ topic: "C" })), { 3: ["302", "303", "304"] });
  // topic by lowercase code and by full name (any case)
  assert.deepEqual(Object.keys(byFloor(await avail({ topic: "c" }))), ["3"]);
  assert.deepEqual(Object.keys(byFloor(await avail({ topic: "remnant energy STUDY" }))), ["2", "3"]);
});

test("floor filter returns only that floor (number or string)", async () => {
  assert.deepEqual(byFloor(await avail({ floor: 2 })), { 2: ["201", "202", "204"] });
  assert.deepEqual(byFloor(await avail({ floor: "3" })), { 3: ["302", "303", "304"] });
  const r = await avail({ floor: 1 });
  assert.equal(r.json.data.total_free, 3);
  assert.equal(r.json.message_th, "ชั้น 1 ว่าง 101, 103, 104 (ทำหัวข้อ A ได้)");
});

test("topic + floor: valid pair works, invalid pair -> TOPIC_NOT_ALLOWED_ON_FLOOR (same text as check-in)", async () => {
  assert.deepEqual(byFloor(await avail({ topic: "B", floor: 3 })), { 3: ["302", "303", "304"] });
  const r = await avail({ topic: "A", floor: 3 });
  assert.equal(r.status, 422);
  assert.equal(r.json.ok, false);
  assert.equal(r.json.code, "TOPIC_NOT_ALLOWED_ON_FLOOR");
  assert.equal(r.json.message_th, "หัวข้อ A ทำได้เฉพาะชั้น 1, 2 จองชั้น 3 ไม่ได้");
  assert.deepEqual(r.json.data.allowed_floors, [1, 2]);
  const ci = await checkin({ name: "Rover", topic: "A", floor: 3, room: "302" });
  assert.equal(r.json.message_th, ci.json.message_th); // identical to the check-in message
});

test("unknown topic -> TOPIC_NOT_FOUND, unknown floor -> ROOM_NOT_FOUND", async () => {
  const t = await avail({ topic: "Z" });
  assert.equal(t.status, 404);
  assert.equal(t.json.code, "TOPIC_NOT_FOUND");
  for (const floor of [9, 0, "abc", -1]) {
    const f = await avail({ floor });
    assert.equal(f.json.code, "ROOM_NOT_FOUND", `floor ${floor}`);
    assert.equal(f.json.ok, false);
  }
  // unknown topic wins over unknown floor; unknown floor wins over a topic/floor mismatch
  assert.equal((await avail({ topic: "Z", floor: 9 })).json.code, "TOPIC_NOT_FOUND");
  assert.equal((await avail({ topic: "A", floor: 9 })).json.code, "ROOM_NOT_FOUND");
});

test("nothing free: still ok:true, empty lists, the fixed Thai message", async () => {
  // topic C is only on floor 3: take all three free rooms there
  for (const room of ["302", "303", "304"]) await checkin({ name: `C-${room}`, topic: "C", floor: 3, room });
  const c = await avail({ topic: "C" });
  assert.equal(c.status, 200);
  assert.equal(c.json.ok, true);
  assert.equal(c.json.code, "OK");
  assert.equal(c.json.message_th, NOTHING);
  assert.equal(c.json.data.total_free, 0);
  assert.deepEqual(byFloor(c), { 3: [] });
  assert.equal(c.json.data.floors[0].occupied_count, 4);
  assert.equal((await avail({ floor: 3 })).json.message_th, NOTHING);

  // whole building full
  await resetDb();
  await fillEverything();
  const all = await avail();
  assert.equal(all.json.ok, true);
  assert.equal(all.json.data.total_free, 0);
  assert.equal(all.json.message_th, NOTHING);
  assert.deepEqual(all.json.data.floors.map((f) => f.free_rooms), [[], [], []]);
  assert.deepEqual(all.json.data.floors.map((f) => f.occupied_count), [4, 4, 4]);
});

test("a room that was just checked in disappears from the list, and comes back after checkout", async () => {
  assert.equal((await checkin({ name: "Rover", topic: "A", floor: 1, room: "101" })).json.code, "OK");
  let r = await avail({ topic: "A" });
  assert.deepEqual(byFloor(r)[1], ["103", "104"]);
  assert.equal(r.json.data.total_free, 5);
  assert.equal(r.json.data.floors[0].occupied_count, 2);
  assert.ok(!r.json.message_th.includes("101"));

  assert.equal((await checkout({ name: "rover" })).json.code, "OK");
  r = await avail({ topic: "A" });
  assert.deepEqual(byFloor(r)[1], ["101", "103", "104"]); // back, in order
  assert.equal(r.json.data.total_free, 6);
  assert.equal(r.json.data.floors[0].occupied_count, 1);
  assert.ok(r.json.message_th.includes("101"));
});

test("GET with query params gives the same answer as POST with a body", async () => {
  for (const [qs, body] of [["", {}], ["?topic=A", { topic: "A" }], ["?floor=2", { floor: 2 }], ["?topic=B&floor=3", { topic: "B", floor: 3 }], ["?topic=A&floor=3", { topic: "A", floor: 3 }], ["?topic=Z", { topic: "Z" }], ["?floor=9", { floor: 9 }]]) {
    const g = await availGet(qs);
    const p = await avail(body);
    assert.equal(g.status, p.status, qs);
    assert.deepEqual(g.json, p.json, qs);
  }
});

test("response shape: { ok, code, message_th, data } and data = { total_free, floors[] }", async () => {
  const r = await avail({ topic: "B" });
  assert.deepEqual(Object.keys(r.json).sort(), ["code", "data", "message_th", "ok"]);
  assert.match(r.json.message_th, /[฀-๿]/);
  assert.deepEqual(Object.keys(r.json.data).sort(), ["floors", "total_free"]);
  for (const f of r.json.data.floors) assert.deepEqual(Object.keys(f).sort(), ["allowed_topics", "floor", "free_rooms", "occupied_count"]);
  assert.equal(r.json.data.total_free, r.json.data.floors.reduce((n, f) => n + f.free_rooms.length, 0));
});
