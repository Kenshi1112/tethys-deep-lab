import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { resetDb, closeDb, db, post, checkin, lookup, checkout, board, BASE } from "./helpers.mjs";

beforeEach(resetDb);
after(closeDb);

const activeCount = async (where = "TRUE", params = []) =>
  Number((await db.query(`SELECT count(*) FROM bookings WHERE checked_out_at IS NULL AND ${where}`, params)).rows[0].count);

// ---------- board ----------
test("GET /rooms returns 12 rooms, the 3 demo bookings and topic floors", async () => {
  const res = await fetch(BASE + "/api/public/rooms");
  const body = await res.json();
  assert.equal(res.status, 200);
  assert.deepEqual(Object.keys(body).sort(), ["code", "data", "message_th", "ok"]);
  const d = body.data;
  assert.equal(d.rooms.length, 12);
  assert.deepEqual(d.summary, { total: 12, free: 9, occupied: 3 });
  const occupied = Object.fromEntries(d.rooms.filter((r) => r.status === "occupied").map((r) => [r.code, [r.occupant_name, r.topic_code]]));
  assert.deepEqual(occupied, { 102: ["Aalto", "A"], 203: ["Encore", "B"], 301: ["Camellya", "C"] });
  assert.ok(d.rooms.find((r) => r.code === "102").checked_in_at);
  const floors = Object.fromEntries(d.topics.map((t) => [t.code, t.floors]));
  assert.deepEqual(floors, { A: [1, 2], B: [2, 3], C: [3] });
});

// ---------- check-in: success ----------
test("check-in succeeds and the room shows as occupied on the board", async () => {
  const r = await checkin({ name: "Rover", topic: "A", floor: 1, room: "101" });
  assert.equal(r.status, 200);
  assert.equal(r.json.ok, true);
  assert.equal(r.json.code, "OK");
  assert.equal(r.json.data.room, "101");
  assert.equal(r.json.data.floor, 1);
  assert.equal(r.json.data.topic.code, "A");
  const room = (await board()).rooms.find((x) => x.code === "101");
  assert.equal(room.status, "occupied");
  assert.equal(room.occupant_name, "Rover");
});

test("topic can be given as a code in any case, or as the full name in any case", async () => {
  assert.equal((await checkin({ name: "P1", topic: "b", floor: 2, room: "201" })).json.code, "OK");
  assert.equal((await checkin({ name: "P2", topic: "remnant energy STUDY", floor: 3, room: "302" })).json.data.topic.code, "B");
  assert.equal((await checkin({ name: "P3", topic: "  Reverberation Modeling ", floor: 3, room: "303" })).json.data.topic.code, "C");
});

test("floor may be sent as a string, and the name is trimmed", async () => {
  const r = await checkin({ name: "  Spacey  ", topic: "A", floor: "1", room: "103" });
  assert.equal(r.json.code, "OK");
  assert.equal(r.json.data.name, "Spacey");
});

// ---------- check-in: errors ----------
test("topic A on floor 3 -> TOPIC_NOT_ALLOWED_ON_FLOOR with allowed floors", async () => {
  const r = await checkin({ name: "Rover", topic: "A", floor: 3, room: "302" });
  assert.equal(r.status, 422);
  assert.equal(r.json.ok, false);
  assert.equal(r.json.code, "TOPIC_NOT_ALLOWED_ON_FLOOR");
  assert.equal(r.json.message_th, "หัวข้อ A ทำได้เฉพาะชั้น 1, 2 จองชั้น 3 ไม่ได้");
  assert.deepEqual(r.json.data.allowed_floors, [1, 2]);
  assert.equal(await activeCount(), 3); // nothing was booked
});

test("occupied room -> ROOM_OCCUPIED with suggestions on allowed floors only", async () => {
  const r = await checkin({ name: "Rover", topic: "A", floor: 1, room: "102" });
  assert.equal(r.status, 409);
  assert.equal(r.json.code, "ROOM_OCCUPIED");
  assert.equal(r.json.message_th, "ห้อง 102 มีคนใช้อยู่");
  const rooms = r.json.data.suggestions.map((s) => s.room);
  assert.deepEqual(rooms, ["101", "103", "104", "201", "202", "204"]); // free rooms on floors 1,2 (203 is taken)
  assert.ok(r.json.data.suggestions.every((s) => [1, 2].includes(s.floor)));
});

test("same name checking in twice -> ALREADY_CHECKED_IN", async () => {
  assert.equal((await checkin({ name: "Rover", topic: "A", floor: 1, room: "101" })).json.code, "OK");
  const r = await checkin({ name: "Rover", topic: "A", floor: 1, room: "103" });
  assert.equal(r.status, 409);
  assert.equal(r.json.code, "ALREADY_CHECKED_IN");
  assert.equal(r.json.data.room, "101");
  assert.equal(await activeCount("lower(person_name) = 'rover'"), 1);
});

test("unknown topic -> TOPIC_NOT_FOUND", async () => {
  const r = await checkin({ name: "Rover", topic: "Z", floor: 1, room: "101" });
  assert.equal(r.status, 404);
  assert.equal(r.json.code, "TOPIC_NOT_FOUND");
});

test("unknown room, or room on the wrong floor -> ROOM_NOT_FOUND", async () => {
  assert.equal((await checkin({ name: "R", topic: "A", floor: 1, room: "105" })).json.code, "ROOM_NOT_FOUND");
  assert.equal((await checkin({ name: "R", topic: "A", floor: 2, room: "101" })).json.code, "ROOM_NOT_FOUND"); // 101 is on floor 1
  assert.equal((await checkin({ name: "R", topic: "A", floor: 9, room: "901" })).json.code, "ROOM_NOT_FOUND");
  assert.equal((await checkin({ name: "R", topic: "A", floor: "abc", room: "101" })).json.code, "ROOM_NOT_FOUND");
  assert.equal((await checkin({ name: "R", topic: "A", floor: 1, room: "101" })).status === 200, true); // earlier calls booked nothing
});

test("missing fields -> MISSING_FIELDS (each field, blank values, empty body, broken JSON)", async () => {
  const full = { name: "Rover", topic: "A", floor: 1, room: "101" };
  for (const k of Object.keys(full)) {
    const body = { ...full };
    delete body[k];
    const r = await checkin(body);
    assert.equal(r.status, 400, `missing ${k}`);
    assert.equal(r.json.code, "MISSING_FIELDS", `missing ${k}`);
    assert.deepEqual(r.json.data.missing_fields, [k]);
  }
  assert.equal((await checkin({ ...full, name: "   " })).json.code, "MISSING_FIELDS");
  assert.equal((await checkin({})).json.code, "MISSING_FIELDS");
  assert.equal((await post("/api/public/rooms/checkin", "{not json")).json.code, "MISSING_FIELDS");
  assert.equal(await activeCount(), 3);
});

test("validation runs in the documented order", async () => {
  // 1 before 2: missing field wins over unknown topic
  assert.equal((await checkin({ name: "R", topic: "Z", floor: 1 })).json.code, "MISSING_FIELDS");
  // 2 before 3: unknown topic wins over unknown room
  assert.equal((await checkin({ name: "R", topic: "Z", floor: 1, room: "999" })).json.code, "TOPIC_NOT_FOUND");
  // 3 before 4: unknown room wins over topic-not-allowed
  assert.equal((await checkin({ name: "R", topic: "A", floor: 3, room: "399" })).json.code, "ROOM_NOT_FOUND");
  // 4 before 5: topic not allowed wins over occupied (301 is occupied, topic A not allowed on floor 3)
  assert.equal((await checkin({ name: "R", topic: "A", floor: 3, room: "301" })).json.code, "TOPIC_NOT_ALLOWED_ON_FLOOR");
  // 5 before 6: occupied wins over already-checked-in (Encore already has 203, asks for occupied 102)
  assert.equal((await checkin({ name: "Encore", topic: "A", floor: 1, room: "102" })).json.code, "ROOM_OCCUPIED");
  // 6: Encore asks for a free valid room
  assert.equal((await checkin({ name: "Encore", topic: "A", floor: 1, room: "101" })).json.code, "ALREADY_CHECKED_IN");
});

// ---------- concurrency ----------
test("two simultaneous check-ins for the same room: only one succeeds", async () => {
  for (let round = 0; round < 5; round++) {
    await resetDb();
    const [a, b] = await Promise.all([
      checkin({ name: "Racer-A", topic: "A", floor: 1, room: "101" }),
      checkin({ name: "Racer-B", topic: "A", floor: 1, room: "101" }),
    ]);
    const codes = [a.json.code, b.json.code].sort();
    assert.deepEqual(codes, ["OK", "ROOM_OCCUPIED"], `round ${round}`);
    assert.equal(await activeCount("room_id = (SELECT id FROM rooms WHERE code = '101')"), 1);
  }
});

test("20 simultaneous check-ins for one room: exactly one succeeds", async () => {
  const results = await Promise.all(
    Array.from({ length: 20 }, (_, i) => checkin({ name: `Crowd-${i}`, topic: "B", floor: 2, room: "201" }))
  );
  const codes = results.map((r) => r.json.code);
  assert.equal(codes.filter((c) => c === "OK").length, 1);
  assert.equal(codes.filter((c) => c === "ROOM_OCCUPIED").length, 19);
  assert.equal(await activeCount("room_id = (SELECT id FROM rooms WHERE code = '201')"), 1);
});

test("one name checking in to two rooms at the same moment: only one succeeds", async () => {
  const [a, b] = await Promise.all([
    checkin({ name: "Twin", topic: "A", floor: 1, room: "103" }),
    checkin({ name: "TWIN", topic: "A", floor: 1, room: "104" }),
  ]);
  assert.deepEqual([a.json.code, b.json.code].sort(), ["ALREADY_CHECKED_IN", "OK"]);
  assert.equal(await activeCount("lower(person_name) = 'twin'"), 1);
});

// ---------- check-out ----------
test("checkout-lookup finds an existing person (case-insensitive, trimmed)", async () => {
  for (const n of ["Aalto", "aalto", "  AALTO "]) {
    const r = await lookup({ name: n });
    assert.equal(r.json.code, "OK", n);
    assert.equal(r.json.data.name, "Aalto");
    assert.equal(r.json.data.floor, 1);
    assert.equal(r.json.data.room, "102");
    assert.equal(r.json.data.topic.code, "A");
  }
});

test("checkout-lookup for an unknown name -> NOT_FOUND", async () => {
  const r = await lookup({ name: "Nobody" });
  assert.equal(r.status, 404);
  assert.equal(r.json.code, "NOT_FOUND");
  assert.equal((await lookup({})).json.code, "MISSING_FIELDS");
});

test("checkout frees the room and the room can be taken again", async () => {
  const out = await checkout({ name: "Aalto" });
  assert.equal(out.json.code, "OK");
  assert.equal(out.json.data.room, "102");
  assert.equal((await board()).rooms.find((r) => r.code === "102").status, "free");
  assert.equal((await lookup({ name: "Aalto" })).json.code, "NOT_FOUND");
  // someone else takes 102 now
  assert.equal((await checkin({ name: "Rover", topic: "A", floor: 1, room: "102" })).json.code, "OK");
  // and Aalto can check in again somewhere else
  assert.equal((await checkin({ name: "Aalto", topic: "A", floor: 1, room: "101" })).json.code, "OK");
  // history is kept: the old booking row still exists with checked_out_at set
  assert.equal(Number((await db.query("SELECT count(*) FROM bookings WHERE lower(person_name)='aalto'")).rows[0].count), 2);
});

test("checkout for an unknown name, or a second checkout -> NOT_FOUND", async () => {
  assert.equal((await checkout({ name: "Nobody" })).json.code, "NOT_FOUND");
  assert.equal((await checkout({ name: "Aalto" })).json.code, "OK");
  assert.equal((await checkout({ name: "Aalto" })).json.code, "NOT_FOUND");
  assert.equal((await checkout({})).json.code, "MISSING_FIELDS");
});

test("name matching is case-insensitive for check-in and check-out", async () => {
  assert.equal((await checkin({ name: "aalto", topic: "A", floor: 1, room: "101" })).json.code, "ALREADY_CHECKED_IN");
  assert.equal((await checkin({ name: "rover", topic: "A", floor: 1, room: "101" })).json.code, "OK");
  assert.equal((await checkin({ name: "ROVER", topic: "A", floor: 1, room: "103" })).json.code, "ALREADY_CHECKED_IN");
  assert.equal((await checkout({ name: "RoVeR" })).json.code, "OK");
  assert.equal((await board()).rooms.find((r) => r.code === "101").status, "free");
});

test("every response has the { ok, code, message_th, data } shape and Thai text", async () => {
  const calls = [
    checkin({ name: "Rover", topic: "A", floor: 1, room: "101" }),
    checkin({}),
    lookup({ name: "Aalto" }),
    checkout({ name: "Nobody" }),
  ];
  for (const r of await Promise.all(calls)) {
    assert.deepEqual(Object.keys(r.json).sort(), ["code", "data", "message_th", "ok"]);
    assert.match(r.json.message_th, /[฀-๿]/);
    assert.equal(typeof r.json.ok, "boolean");
  }
});
