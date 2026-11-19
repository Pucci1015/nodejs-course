-- 前日のリマインドを送った記録（第69章 4節）。1人に1日1通だけ送るため
-- 仕事が2回動いても（再試行・2台のワーカー）、ここに行を入れられた方だけが送る
CREATE TABLE reminder_log (
  user_id integer     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  day     date        NOT NULL, -- 予約の日（日本の日付）
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);
