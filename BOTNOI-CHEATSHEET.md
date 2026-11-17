# Cheat sheet: ตั้งค่า Tool ของ Botnoi Agent (Shorekeeper)

แทน `https://YOUR-SITE.vercel.app` ด้วย URL จริงของเว็บที่ deploy แล้ว

## ค่าที่ใช้ร่วมกันทุก endpoint

| รายการ | ค่า |
|---|---|
| Base URL | `https://YOUR-SITE.vercel.app` |
| Header | `Content-Type: application/json` (เฉพาะ POST) |
| Header (ถ้าเปิด `BOT_API_KEY`) | `x-api-key: <ค่าที่ตั้งใน Vercel>` |
| รูปแบบ response | `{ "ok": boolean, "code": string, "message_th": string, "data": ... }` |

ให้ agent ตัดสินจาก `ok` และ `code` แล้วตอบผู้ใช้ด้วย `message_th` ได้เลย (เป็นภาษาไทยพร้อมใช้)

> **ถ้า Botnoi อ่านเนื้อหาไม่ได้เมื่อได้ HTTP 4xx:** ตั้ง `RESPONSE_ALWAYS_200=true` ใน Vercel แล้ว Redeploy ทุก response จะเป็น HTTP 200 และผลจริงยังอยู่ใน `ok` / `code`

---

## 1) ดูสถานะห้องทั้งหมด

- **URL:** `https://YOUR-SITE.vercel.app/api/public/rooms`
- **Method:** `GET`
- **Headers:** ไม่ต้องใช้ (เปิดสาธารณะ แม้ตั้ง `BOT_API_KEY`)
- **Body:** ไม่มี

ตัวอย่าง response (ย่อ):
```json
{
  "ok": true,
  "code": "OK",
  "message_th": "ดึงข้อมูลห้องสำเร็จ",
  "data": {
    "rooms": [
      { "code": "101", "floor": 1, "status": "free", "occupant_name": null, "topic_code": null, "topic_name": null, "checked_in_at": null },
      { "code": "102", "floor": 1, "status": "occupied", "occupant_name": "Aalto", "topic_code": "A", "topic_name": "Lament Frequency Analysis", "checked_in_at": "2026-11-17T06:06:22.300Z" }
    ],
    "topics": [
      { "code": "A", "name": "Lament Frequency Analysis", "floors": [1, 2] },
      { "code": "B", "name": "Remnant Energy Study", "floors": [2, 3] },
      { "code": "C", "name": "Reverberation Modeling", "floors": [3] }
    ],
    "summary": { "total": 12, "free": 9, "occupied": 3 },
    "server_time": "2026-11-17T06:10:00.000Z"
  }
}
```

---

## 2) ดูห้องว่าง (ให้บอทใช้ตอบ "ตอนนี้ห้องไหนว่าง")

- **URL:** `https://YOUR-SITE.vercel.app/api/public/rooms/available`
- **Method:** `POST` (หรือ `GET` พร้อม query string ชื่อเดียวกัน)
- **Headers:** `Content-Type: application/json` สำหรับ POST (+ `x-api-key` ถ้าเปิดใช้ **ทั้ง POST และ GET ของ endpoint นี้ต้องใช้ key**)
- **Body / query (ใส่หรือไม่ใส่ก็ได้ทั้งคู่):**

| field | ชนิด | ตัวอย่าง | หมายเหตุ |
|---|---|---|---|
| `topic` | string | `"A"` | `A` / `B` / `C` หรือชื่อเต็ม ถ้าใส่ จะแสดงเฉพาะชั้นที่หัวข้อนั้นทำได้ |
| `floor` | number | `2` | 1, 2 หรือ 3 ถ้าใส่ จะแสดงเฉพาะชั้นนั้น |

ตัวอย่าง:
```json
{}                                // ห้องว่างทุกชั้น
{ "topic": "B" }                  // ห้องว่างเฉพาะชั้นที่ทำหัวข้อ B ได้ (ชั้น 2, 3)
{ "floor": 2 }                    // ห้องว่างชั้น 2
{ "topic": "B", "floor": 3 }      // หัวข้อ B ที่ชั้น 3
```
แบบ GET: `GET /api/public/rooms/available?topic=B&floor=3`

**สำเร็จ** (HTTP 200) ตัวอย่างจาก `{ "topic": "B" }`:
```json
{
  "ok": true, "code": "OK",
  "message_th": "ชั้น 2 ว่าง 201, 202, 204 (ทำหัวข้อ A, B ได้); ชั้น 3 ว่าง 302, 303, 304 (ทำหัวข้อ B, C ได้)",
  "data": {
    "total_free": 6,
    "floors": [
      { "floor": 2, "allowed_topics": ["A", "B"], "free_rooms": ["201", "202", "204"], "occupied_count": 1 },
      { "floor": 3, "allowed_topics": ["B", "C"], "free_rooms": ["302", "303", "304"], "occupied_count": 1 }
    ]
  }
}
```
`message_th` เป็นสรุปสั้นๆ ที่บอทอ่านให้ผู้ใช้ได้ทันที ชั้นที่ไม่มีห้องว่างจะเขียนว่า "ชั้น N ไม่มีห้องว่าง"

**ไม่มีห้องว่างตามเงื่อนไข** ยังเป็น HTTP 200 และ `ok: true` (ไม่ใช่ error): `message_th = "ตอนนี้ไม่มีห้องว่างตามเงื่อนไขนี้"`, `data.total_free = 0` และทุกชั้นมี `free_rooms: []` (ยังบอก `occupied_count` ให้)

**รหัสผิดพลาด:**

| `code` | HTTP | เมื่อไร | `data` |
|---|---|---|---|
| `TOPIC_NOT_FOUND` | 404 | หัวข้อไม่มี เช่น `"Z"` | `{ "valid_topics": ["A","B","C"] }` |
| `ROOM_NOT_FOUND` | 404 | ชั้นไม่มี เช่น `9` หรือ `"abc"` | `{ "valid_floors": [1,2,3] }` |
| `TOPIC_NOT_ALLOWED_ON_FLOOR` | 422 | หัวข้อกับชั้นไม่เข้ากัน เช่น A + ชั้น 3 (ข้อความเดียวกับตอนเช็คอิน: "หัวข้อ A ทำได้เฉพาะชั้น 1, 2 จองชั้น 3 ไม่ได้") | `{ "allowed_floors": [1,2] }` |
| `UNAUTHORIZED` | 401 | ตั้ง `BOT_API_KEY` แต่ไม่ได้ส่ง `x-api-key` | `null` |

ลำดับตรวจ: หัวข้อ → ชั้น → ความเข้ากันของหัวข้อกับชั้น

---

## 3) เช็คอิน

- **URL:** `https://YOUR-SITE.vercel.app/api/public/rooms/checkin`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json` (+ `x-api-key` ถ้าเปิดใช้)
- **Body:**

| field | ชนิด | ตัวอย่าง | หมายเหตุ |
|---|---|---|---|
| `name` | string | `"Rover"` | ชื่อผู้ใช้ (ตัดช่องว่างหัวท้าย ไม่สนตัวพิมพ์เล็กใหญ่) |
| `topic` | string | `"A"` | `A` / `B` / `C` หรือชื่อเต็ม เช่น `"Remnant Energy Study"` |
| `floor` | number | `1` | 1, 2 หรือ 3 (ส่งเป็น string `"1"` ก็ได้) |
| `room` | string | `"101"` | เลขห้อง |

```json
{ "name": "Rover", "topic": "A", "floor": 1, "room": "101" }
```

**สำเร็จ** (HTTP 200):
```json
{
  "ok": true, "code": "OK",
  "message_th": "เช็คอินสำเร็จ: Rover ห้อง 101 ชั้น 1 หัวข้อ A",
  "data": { "name": "Rover", "floor": 1, "room": "101",
            "topic": { "code": "A", "name": "Lament Frequency Analysis" },
            "checked_in_at": "2026-11-17T06:06:28.648Z" }
}
```

**รหัสผิดพลาด** (ตรวจตามลำดับนี้):

| ลำดับ | `code` | HTTP | ข้อความตัวอย่าง | `data` |
|---|---|---|---|---|
| 1 | `MISSING_FIELDS` | 400 | ข้อมูลไม่ครบ: ต้องระบุ topic, floor, room | `{ "missing_fields": ["topic","floor","room"] }` |
| 2 | `TOPIC_NOT_FOUND` | 404 | ไม่พบหัวข้อ "Z" (ใช้ได้: A, B, C) | `{ "valid_topics": ["A","B","C"] }` |
| 3 | `ROOM_NOT_FOUND` | 404 | ไม่พบห้อง 105 ในชั้น 1 | `null` |
| 4 | `TOPIC_NOT_ALLOWED_ON_FLOOR` | 422 | หัวข้อ A ทำได้เฉพาะชั้น 1, 2 จองชั้น 3 ไม่ได้ | `{ "allowed_floors": [1,2] }` |
| 5 | `ROOM_OCCUPIED` | 409 | ห้อง 102 มีคนใช้อยู่ | `{ "suggestions": [{ "room": "101", "floor": 1 }, ...] }` ห้องว่างในชั้นที่หัวข้อนั้นทำได้ |
| 6 | `ALREADY_CHECKED_IN` | 409 | aalto มีห้องที่ใช้อยู่แล้ว (ห้อง 102 ชั้น 1) กรุณาเช็คเอาท์ก่อน | `{ "floor": 1, "room": "102" }` |
| – | `UNAUTHORIZED` | 401 | API key ไม่ถูกต้อง | `null` |
| – | `INTERNAL_ERROR` | 500 | ระบบขัดข้อง กรุณาลองใหม่ | `null` |

คำแนะนำ prompt ให้บอท: เมื่อได้ `ROOM_OCCUPIED` ให้เสนอห้องจาก `data.suggestions`, เมื่อได้ `TOPIC_NOT_ALLOWED_ON_FLOOR` ให้เสนอชั้นจาก `data.allowed_floors`

---

## 4) หาห้องของผู้ที่จะเช็คเอาท์ (ใช้ยืนยันก่อนเช็คเอาท์)

- **URL:** `https://YOUR-SITE.vercel.app/api/public/rooms/checkout-lookup`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json` (+ `x-api-key` ถ้าเปิดใช้)
- **Body:** `{ "name": "Rover" }`

**พบ** (HTTP 200):
```json
{
  "ok": true, "code": "OK",
  "message_th": "Rover ใช้ห้อง 101 ชั้น 1 หัวข้อ A",
  "data": { "name": "Rover", "floor": 1, "room": "101",
            "topic": { "code": "A", "name": "Lament Frequency Analysis" },
            "checked_in_at": "2026-11-17T06:06:28.648Z" }
}
```
**ไม่พบ** (HTTP 404): `{ "ok": false, "code": "NOT_FOUND", "message_th": "ไม่พบการใช้งานห้องของ Nobody", "data": null }`
**ไม่ส่งชื่อ** (HTTP 400): `code = MISSING_FIELDS`

---

## 5) เช็คเอาท์

- **URL:** `https://YOUR-SITE.vercel.app/api/public/rooms/checkout`
- **Method:** `POST`
- **Headers:** `Content-Type: application/json` (+ `x-api-key` ถ้าเปิดใช้)
- **Body:** `{ "name": "Rover" }`

**สำเร็จ** (HTTP 200):
```json
{
  "ok": true, "code": "OK",
  "message_th": "เช็คเอาท์สำเร็จ: Rover ออกจากห้อง 101 ชั้น 1 แล้ว ห้องนี้ว่าง",
  "data": { "name": "Rover", "floor": 1, "room": "101" }
}
```
**ไม่พบ** (HTTP 404): `code = NOT_FOUND` · **ไม่ส่งชื่อ** (HTTP 400): `code = MISSING_FIELDS`

---

## ลำดับการคุยที่แนะนำให้บอททำ

1. เช็คอิน: ถามชื่อ → หัวข้อ (A/B/C) → ชั้น → ห้อง → **สรุปให้ผู้ใช้ยืนยัน** → เรียก `checkin` → ตอบด้วย `message_th`
2. เช็คเอาท์: ถามชื่อ → เรียก `checkout-lookup` เพื่อบอกห้องที่จะคืน → ผู้ใช้ยืนยัน → เรียก `checkout`
3. ผู้ใช้ถามว่าห้องไหนว่าง (หรือก่อนเสนอห้องให้จอง): เรียก `available` ส่ง `topic` / `floor` ตามที่ผู้ใช้บอก แล้วอ่าน `message_th` ให้ฟัง
4. ต้องการข้อมูลทุกห้องแบบละเอียด (ใครใช้อยู่ ใช้มากี่นาที): เรียก `GET /api/public/rooms`

## ทดสอบ endpoint ด้วย curl ก่อนตั้งใน Botnoi

```bash
curl https://YOUR-SITE.vercel.app/api/public/rooms

curl -X POST https://YOUR-SITE.vercel.app/api/public/rooms/available \
  -H "Content-Type: application/json" \
  -d '{"topic":"A"}'

curl "https://YOUR-SITE.vercel.app/api/public/rooms/available?topic=A&floor=1"

curl -X POST https://YOUR-SITE.vercel.app/api/public/rooms/checkin \
  -H "Content-Type: application/json" \
  -d '{"name":"Rover","topic":"A","floor":1,"room":"101"}'

curl -X POST https://YOUR-SITE.vercel.app/api/public/rooms/checkout \
  -H "Content-Type: application/json" \
  -d '{"name":"Rover"}'
```
(ถ้าเปิด `BOT_API_KEY` เพิ่ม `-H "x-api-key: <ค่า>"` ในทุกคำสั่งยกเว้น `GET /api/public/rooms`)
