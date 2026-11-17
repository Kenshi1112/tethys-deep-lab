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

## 2) เช็คอิน

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

## 3) หาห้องของผู้ที่จะเช็คเอาท์ (ใช้ยืนยันก่อนเช็คเอาท์)

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

## 4) เช็คเอาท์

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
3. อยากรู้ว่าห้องไหนว่าง: เรียก `GET /api/public/rooms`

## ทดสอบ endpoint ด้วย curl ก่อนตั้งใน Botnoi

```bash
curl https://YOUR-SITE.vercel.app/api/public/rooms

curl -X POST https://YOUR-SITE.vercel.app/api/public/rooms/checkin \
  -H "Content-Type: application/json" \
  -d '{"name":"Rover","topic":"A","floor":1,"room":"101"}'

curl -X POST https://YOUR-SITE.vercel.app/api/public/rooms/checkout \
  -H "Content-Type: application/json" \
  -d '{"name":"Rover"}'
```
(ถ้าเปิด `BOT_API_KEY` เพิ่ม `-H "x-api-key: <ค่า>"` ใน POST ทุกคำสั่ง)
