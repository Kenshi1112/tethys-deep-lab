# Tethys' Deep — ศูนย์วิจัยใต้ดิน

เว็บบอร์ดแสดงสถานะห้อง 12 ห้อง (ชั้น 1–3) ที่ให้แชทบอท **Shorekeeper** ของ Botnoi เช็คอิน/เช็คเอาท์แทนผู้ใช้ผ่าน REST API
หน้าเว็บอ่านข้อมูลอย่างเดียว (ดึงใหม่ทุก 3 วินาที) ส่วนการเขียนข้อมูลทำที่ฝั่งเซิร์ฟเวอร์เท่านั้น

- **Stack:** Next.js (App Router) + TypeScript + Tailwind + Postgres (Neon) — deploy บน Vercel
- **ไม่มี:** ระบบล็อกอิน, LINE, realtime subscription (ใช้ polling แทน)
- โปรเจกต์ฝึกงาน ไม่เกี่ยวข้องกับ Kuro Games (ไม่ได้ใช้ภาพ/อาร์ตจากเกมเลย)

---

## โครงสร้างโปรเจกต์

```
db/schema.sql                      สร้างตาราง + unique index + ข้อมูลตั้งต้น (รันซ้ำได้)
src/lib/rooms.ts                   ตรรกะทั้งหมดที่คุยกับฐานข้อมูล (เช็คอิน/เอาท์/บอร์ด)
src/lib/http.ts                    รูปแบบ response { ok, code, message_th, data } + เช็ค x-api-key
src/app/api/public/rooms/...       5 endpoints (rooms, available, checkin, checkout-lookup, checkout)
src/components/                    หน้าเว็บ (Board, RoomCard, RoomDialog, BotnoiChat, ApiSection)
src/config.ts                      ตั้งค่าวิดเจ็ตแชทบอท Botnoi (bot_id โลโก้ ชื่อ สี ข้อความต้อนรับ) และความถี่ polling
tests/                             เทสต์อัตโนมัติ
BOTNOI-CHEATSHEET.md               ข้อมูลสำหรับตั้งค่า tool ใน Botnoi
```

---

## ส่วนที่ 1 — รันในเครื่อง (ลองก่อน deploy)

ต้องมี Node.js 20 ขึ้นไป และฐานข้อมูล Postgres หนึ่งตัว (ใช้ฐานข้อมูล Neon ตัวเดียวกับที่จะใช้บน Vercel ก็ได้ ดูส่วนที่ 2)

1. ติดตั้งแพ็กเกจ
   ```bash
   npm install
   ```
2. คัดลอกไฟล์ตัวอย่าง env แล้วใส่ค่า (ไฟล์ `.env.local` ห้าม commit และห้ามส่งให้ใคร)
   ```bash
   cp .env.example .env.local      # Windows PowerShell: copy .env.example .env.local
   ```
   แก้ `DATABASE_URL` ใน `.env.local` เป็น connection string ของฐานข้อมูลคุณ
3. สร้างตารางและข้อมูลตั้งต้น (เลือกอย่างใดอย่างหนึ่ง)
   - วางเนื้อหาไฟล์ `db/schema.sql` ใน SQL Editor ของ Neon แล้วกด Run **หรือ**
   - `npm run db:setup` (ต้องตั้ง `DATABASE_URL` ใน environment ของ terminal ก่อน)
4. เปิดเว็บ
   ```bash
   npm run dev
   ```
   เปิด http://localhost:3000

> หมายเหตุ: `npm run dev` อ่าน `.env.local` ให้อัตโนมัติ แต่คำสั่ง `npm run db:setup` และ `npm test` เป็นสคริปต์ Node ธรรมดา จึงไม่อ่านไฟล์ `.env.local` ให้ ต้อง export ตัวแปรเองก่อน
> (macOS/Linux: `export DATABASE_URL="..."`, PowerShell: `$env:DATABASE_URL="..."`)

---

## ส่วนที่ 2 — Deploy ขึ้น GitHub + Vercel (ทีละขั้น)

### 2.1 ส่งโค้ดขึ้น GitHub
```bash
git init
git add .
git commit -m "Tethys Deep room board"
git branch -M main
# สร้าง repository ว่างบน github.com ก่อน แล้วคัดลอก URL มาใส่
git remote add origin https://github.com/<ชื่อคุณ>/tethys-deep-lab.git
git push -u origin main
```

### 2.2 Import เข้า Vercel
1. เข้า vercel.com → **Add New… → Project** → เลือก repository `tethys-deep-lab` → **Import**
2. Framework จะถูกตรวจเป็น Next.js อัตโนมัติ ยังไม่ต้องแก้อะไร กด **Deploy** ได้เลย
   (ครั้งแรกหน้าเว็บจะขึ้น error เพราะยังไม่มีฐานข้อมูล ปกติ ทำขั้นต่อไป)

### 2.3 เพิ่มฐานข้อมูล Neon จากแท็บ Storage
1. ในโปรเจกต์บน Vercel เปิดแท็บ **Storage**
2. เลือก **Neon (Postgres)** → **Create / Connect** → ยอมรับค่าเริ่มต้น → เชื่อมกับโปรเจกต์นี้ (ทุก environment)
3. Vercel จะสร้าง environment variables ให้เอง (เช่น `DATABASE_URL`, `POSTGRES_URL`) **ไม่ต้องคัดลอกหรือวางรหัสผ่านเอง**
   โค้ดนี้อ่าน `DATABASE_URL` (หรือ `POSTGRES_URL` ถ้าไม่มี)

> เมนู/ชื่อปุ่มของ Vercel อาจเปลี่ยนไปตามเวลา ถ้าไม่เจอ Neon ในแท็บ Storage ให้ดูในหมวด Marketplace ของ Vercel
> และถ้าไม่มี Neon จริงๆ ให้บอกผม เพราะต้องปรับโค้ดไปใช้ Upstash Redis ซึ่งต้องแก้ส่วน `src/lib/rooms.ts`

### 2.4 รัน SQL สร้างตาราง
1. ที่แท็บ Storage คลิกฐานข้อมูลของคุณ → **Open in Neon** (หรือปุ่มคล้ายกัน)
2. เปิด **SQL Editor** วางเนื้อหาไฟล์ `db/schema.sql` ทั้งไฟล์ → **Run**
3. ตรวจผล: รัน `select * from rooms;` ต้องได้ 12 แถว และ `select * from bookings;` ต้องมี 3 แถว (Aalto, Encore, Camellya)

ไฟล์นี้รันซ้ำได้อย่างปลอดภัย (ไม่สร้างข้อมูลซ้ำ)

### 2.5 ตั้ง environment variables เพิ่ม (ไม่บังคับ)
ที่ **Settings → Environment Variables**

| ชื่อ | ใช้ทำอะไร |
|---|---|
| `BOT_API_KEY` | ถ้าตั้ง ทุก endpoint ยกเว้น `GET /api/public/rooms` (ที่หน้าเว็บใช้ดึงบอร์ด) ต้องส่ง header `x-api-key` ตรงกับค่านี้ ถ้าไม่ตั้ง = โหมดเดโม ใครก็เรียกได้ |
| `RESPONSE_ALWAYS_200` | ตั้งเป็น `true` ถ้า Botnoi อ่านเนื้อหา response ของ HTTP 4xx ไม่ได้ (ผลจริงยังดูได้จาก `ok` / `code`) |

หลังเพิ่มหรือแก้ตัวแปรต้อง **Redeploy** (Deployments → ⋯ → Redeploy) ตัวแปรจึงมีผล

### 2.6 Deploy และตรวจ
- Push โค้ดใหม่เข้า `main` Vercel จะ deploy ให้เอง
- เปิด URL ของโปรเจกต์ ควรเห็นห้อง 12 ห้อง และ 3 ห้องที่มีคนใช้ (102, 203, 301)
- เลื่อนลงล่างสุด กดปุ่มทดสอบในส่วน "การทำงานของระบบ & API" ได้ (ส่วนนี้ใช้ URL จริงของเว็บให้อัตโนมัติ)
- **ลงชื่อเองบนเว็บ (ไม่ต้องใช้บอท):** กดที่ห้องว่าง → ใส่ชื่อ + เลือกหัวข้อ (ขึ้นให้เลือกเฉพาะหัวข้อที่ทำได้ในชั้นนั้น) → "ลงชื่อเข้า" / กดที่ห้องที่มีคนใช้ → ใส่ชื่อตัวเอง (ต้องตรงกับชื่อที่ลงไว้) → "ลงชื่อออก" หน้านี้เรียก API ชุดเดียวกับบอท จึงใช้กติกาเดียวกันทุกอย่าง
- ถ้าตั้ง `BOT_API_KEY` ไว้ การลงชื่อบนเว็บจะถูกปฏิเสธ (401) เพราะเบราว์เซอร์ไม่มีคีย์ ตอนนี้แนะนำให้ปล่อยว่างไว้

> ข้อควรรู้: ปุ่มทดสอบและ API เขียนข้อมูลจริง ก่อนเดโมให้คนดู อย่าลืมเช็คเอาท์ชื่อทดสอบออก หรือรัน `db/schema.sql` ใหม่หลังลบข้อมูล:
> `DELETE FROM bookings;` แล้วรัน schema.sql อีกครั้งเพื่อคืนค่าเริ่มต้น

---

## ส่วนที่ 3 — ฝังแชทบอท Botnoi

วิดเจ็ตแชทบอทฝังไว้ให้แล้ว (ปุ่มแชทมุมขวาล่างของเว็บ) ไม่ต้องวางสคริปต์เพิ่ม

1. ตั้งค่าหน้าตาที่ `src/config.ts` ในก้อน `BOTNOI`: `botId`, `logo` (URL รูปโปรไฟล์บอท), `name`, `themeColor` (สีธีม เช่น `#0288D1`), `locale` (`th`), `welcome`/`greeting` (ข้อความต้อนรับ) และ `defaultOpen` (`true` = เปิดหน้าต่างแชททันทีที่เข้าเว็บ)
2. โค้ดฝังอยู่ที่ `src/components/BotnoiChat.tsx` (เทียบเท่าโค้ด embed ของ Botnoi แต่เรียก `BN.init` จาก React)
3. ลูกค้าพิมพ์ "ชอร์" ในแชทเพื่อปลุก Shorekeeper ตาม wake word ที่ตั้งไว้ใน Botnoi
4. ตั้งค่า tool ของ agent ตามไฟล์ **BOTNOI-CHEATSHEET.md**

---

## ส่วนที่ 4 — รันเทสต์อัตโนมัติ

เทสต์ยิง API ของแอปที่รันอยู่จริงและตรวจในฐานข้อมูลโดยตรง **เทสต์จะลบข้อมูล `bookings` ทั้งหมดแล้วใส่ข้อมูลตั้งต้นใหม่ก่อนทุกเคส จึงห้ามชี้ไปที่ฐานข้อมูลที่ใช้งานจริง** ให้ใช้ฐานข้อมูลสำหรับเทสต์ (เช่น Neon branch แยก หรือ Postgres ในเครื่อง)

```bash
export DATABASE_URL="postgres://..."      # ฐานข้อมูลเทสต์ (ตัวเดียวกับที่แอปใช้)
npm run build && npm run start            # เปิดแอปที่ http://localhost:3000 (อีก terminal)
npm test                                  # 30 เคสหลัก (api.test 20 + available.test 10)
```

เทสต์ x-api-key (4 เคส) ต้องเปิดแอปอีกตัวที่ตั้ง `BOT_API_KEY`:
```bash
PORT=3001 BOT_API_KEY=secret123 npm run start
TEST_KEY_BASE_URL=http://localhost:3001 TEST_KEY_VALUE=secret123 npm test
```
ถ้าไม่ตั้ง `TEST_KEY_*` 4 เคสนี้จะถูกข้าม (skipped) ไม่ใช่ fail

เทสต์ครอบคลุม: เช็คอินสำเร็จ, หัวข้อ A ชั้น 3, ห้องมีคนใช้ (พร้อม suggestions), ชื่อเดิมเช็คอินซ้ำ, ยิงพร้อมกันห้องเดียวกัน (2 และ 20 request → สำเร็จ 1), ชื่อเดียวกันสองห้องพร้อมกัน, หัวข้อ/ห้องไม่มี, ข้อมูลไม่ครบ, ลำดับการตรวจ 1→6, lookup มี/ไม่มีชื่อ, เช็คเอาท์แล้วห้องว่างและจองใหม่ได้, ชื่อไม่สนตัวพิมพ์เล็กใหญ่, x-api-key, endpoint ห้องว่าง `available` (ไม่มี filter / filter หัวข้อ / filter ชั้น / คู่ที่ไม่เข้ากัน / หัวข้อหรือชั้นไม่มี / ไม่มีห้องว่าง / ห้องที่เพิ่งเช็คอินหายไปและกลับมาหลังเช็คเอาท์ / GET เทียบกับ POST)

---

## แก้ปัญหาที่พบบ่อย

| อาการ | สาเหตุ / วิธีแก้ |
|---|---|
| หน้าเว็บขึ้น "เชื่อมต่อเซิร์ฟเวอร์ไม่ได้" | ยังไม่ได้เชื่อม/สร้างฐานข้อมูล หรือยังไม่ได้รัน `db/schema.sql` ดู Logs ใน Vercel → Deployments |
| API ตอบ `INTERNAL_ERROR` | มักเป็นเพราะ `DATABASE_URL` ไม่มี หรือยังไม่มีตาราง |
| POST ตอบ `UNAUTHORIZED` | ตั้ง `BOT_API_KEY` ไว้ แต่ Botnoi ไม่ได้ส่ง header `x-api-key` |
| ตั้งตัวแปรแล้วไม่เปลี่ยน | ต้อง Redeploy |
| Botnoi ไม่เห็นข้อความ error ที่เป็น 4xx | ตั้ง `RESPONSE_ALWAYS_200=true` แล้ว Redeploy |
