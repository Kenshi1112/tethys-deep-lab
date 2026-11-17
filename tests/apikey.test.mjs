// Needs a second server started WITH BOT_API_KEY=secret123, e.g. on port 3001.
// Run: TEST_KEY_BASE_URL=http://localhost:3001 TEST_KEY_VALUE=secret123 node --test tests/apikey.test.mjs
import { test, beforeEach, after } from "node:test";
import assert from "node:assert/strict";
import { resetDb, closeDb, checkin, post } from "./helpers.mjs";

const BASE = process.env.TEST_KEY_BASE_URL;
const KEY = process.env.TEST_KEY_VALUE;
const skip = !BASE || !KEY ? "set TEST_KEY_BASE_URL and TEST_KEY_VALUE" : false;
const body = { name: "Rover", topic: "A", floor: 1, room: "101" };

beforeEach(resetDb);
after(closeDb);

test("POST without key -> 401 UNAUTHORIZED", { skip }, async () => {
  const r = await checkin(body, {}, BASE);
  assert.equal(r.status, 401);
  assert.equal(r.json.code, "UNAUTHORIZED");
  for (const p of ["checkout-lookup", "checkout"]) {
    assert.equal((await post(`/api/public/rooms/${p}`, { name: "Aalto" }, {}, BASE)).status, 401);
  }
});

test("POST with a wrong key -> 401, with the right key -> works", { skip }, async () => {
  assert.equal((await checkin(body, { "x-api-key": "wrong" }, BASE)).status, 401);
  assert.equal((await checkin(body, { "x-api-key": KEY }, BASE)).json.code, "OK");
});

test("GET /rooms stays public even when a key is set (the browser needs it)", { skip }, async () => {
  const res = await fetch(BASE + "/api/public/rooms");
  assert.equal(res.status, 200);
});

test("available: POST and GET need the key too (only GET /rooms is public)", { skip }, async () => {
  assert.equal((await post("/api/public/rooms/available", {}, {}, BASE)).status, 401);
  assert.equal((await fetch(BASE + "/api/public/rooms/available")).status, 401);
  assert.equal((await post("/api/public/rooms/available", { topic: "A" }, { "x-api-key": KEY }, BASE)).json.code, "OK");
  const g = await fetch(BASE + "/api/public/rooms/available?floor=1", { headers: { "x-api-key": KEY } });
  assert.equal((await g.json()).code, "OK");
});
