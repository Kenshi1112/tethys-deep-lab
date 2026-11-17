-- Tethys' Deep: schema + seed data (safe to run more than once).
-- Run this in the Neon SQL editor (Vercel > Storage > your database > Open in Neon).

CREATE TABLE IF NOT EXISTS topics (
  id   SERIAL PRIMARY KEY,
  code TEXT NOT NULL UNIQUE,   -- 'A', 'B', 'C'
  name TEXT NOT NULL UNIQUE    -- e.g. 'Lament Frequency Analysis'
);

CREATE TABLE IF NOT EXISTS topic_floors (
  topic_id INT NOT NULL REFERENCES topics(id),
  floor    INT NOT NULL,
  PRIMARY KEY (topic_id, floor)
);

CREATE TABLE IF NOT EXISTS rooms (
  id    SERIAL PRIMARY KEY,
  code  TEXT NOT NULL UNIQUE,  -- '101'
  floor INT  NOT NULL
);

CREATE TABLE IF NOT EXISTS bookings (
  id             SERIAL PRIMARY KEY,
  room_id        INT  NOT NULL REFERENCES rooms(id),
  person_name    TEXT NOT NULL,
  topic_id       INT  NOT NULL REFERENCES topics(id),
  checked_in_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  checked_out_at TIMESTAMPTZ            -- NULL = still active
);

-- A room has at most ONE active booking.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_active_per_room
  ON bookings (room_id) WHERE checked_out_at IS NULL;

-- A person (case-insensitive) has at most ONE active booking.
CREATE UNIQUE INDEX IF NOT EXISTS bookings_one_active_per_person
  ON bookings (lower(person_name)) WHERE checked_out_at IS NULL;

-- ---------- Seed: topics ----------
INSERT INTO topics (code, name) VALUES
  ('A', 'Lament Frequency Analysis'),
  ('B', 'Remnant Energy Study'),
  ('C', 'Reverberation Modeling')
ON CONFLICT DO NOTHING;

-- ---------- Seed: allowed floors per topic ----------
INSERT INTO topic_floors (topic_id, floor)
SELECT t.id, f.floor
FROM (VALUES ('A',1),('A',2),('B',2),('B',3),('C',3)) AS f(code, floor)
JOIN topics t ON t.code = f.code
ON CONFLICT DO NOTHING;

-- ---------- Seed: 12 rooms ----------
INSERT INTO rooms (code, floor) VALUES
  ('101',1),('102',1),('103',1),('104',1),
  ('201',2),('202',2),('203',2),('204',2),
  ('301',3),('302',3),('303',3),('304',3)
ON CONFLICT DO NOTHING;

-- ---------- Seed: demo bookings (only inserted if the room and the name are both free) ----------
INSERT INTO bookings (room_id, person_name, topic_id)
SELECT r.id, d.person_name, t.id
FROM (VALUES ('102','Aalto','A'), ('203','Encore','B'), ('301','Camellya','C')) AS d(room_code, person_name, topic_code)
JOIN rooms  r ON r.code = d.room_code
JOIN topics t ON t.code = d.topic_code
WHERE NOT EXISTS (SELECT 1 FROM bookings b WHERE b.room_id = r.id AND b.checked_out_at IS NULL)
  AND NOT EXISTS (SELECT 1 FROM bookings b WHERE lower(b.person_name) = lower(d.person_name) AND b.checked_out_at IS NULL);
