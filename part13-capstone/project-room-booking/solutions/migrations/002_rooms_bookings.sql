-- 会議室と予約（第67章 5節の data.md）

-- btree_gist: integer の = を、GiST の索引（EXCLUDE 制約）で使えるようにする拡張（PostgreSQL に付いてくる）
-- public に入れる。テストのスキーマに入ると、スキーマを消したときに一緒に消えてしまうため
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;

-- 会議室。消さない（予約が残るので）。使わなくなったら active を false にする
CREATE TABLE rooms (
  id         integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text        NOT NULL CONSTRAINT rooms_name_check CHECK (length(name) BETWEEN 1 AND 50),
  capacity   integer     NOT NULL CONSTRAINT rooms_capacity_check CHECK (capacity BETWEEN 1 AND 100),
  active     boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX rooms_name ON rooms (name);

-- 予約。取り消しても消さず、canceled_at を入れる（だれが・いつ取り消したかが残る）
CREATE TABLE bookings (
  id          integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  room_id     integer     NOT NULL REFERENCES rooms (id),
  user_id     integer     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  title       text        NOT NULL CONSTRAINT bookings_title_check CHECK (length(title) BETWEEN 1 AND 100),
  starts_at   timestamptz NOT NULL,
  ends_at     timestamptz NOT NULL,
  canceled_at timestamptz,
  canceled_by integer     REFERENCES users (id) ON DELETE SET NULL,
  created_at  timestamptz NOT NULL DEFAULT now(),
  CONSTRAINT bookings_time_check CHECK (starts_at < ends_at),
  -- 同じ会議室で、時間が重なる予約を断る（取り消したものは数えない）。2人が同時に予約しても、片方だけが入る
  -- tstzrange(始まり, 終わり) は [始まり, 終わり) の範囲。10:00〜11:00 と 11:00〜12:00 は重ならない
  CONSTRAINT bookings_no_overlap EXCLUDE USING gist (room_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
    WHERE (canceled_at IS NULL)
);
-- 「自分のこれからの予約」を探す
CREATE INDEX bookings_user_starts ON bookings (user_id, starts_at);
