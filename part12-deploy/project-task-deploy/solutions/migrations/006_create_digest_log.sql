-- 追加（第12部）: 毎朝のお知らせを「1人1日1通」にするための記録（第64章 練習問題8）
-- ワーカーが2つ動いても、先にこの行を入れられたほうだけが送る
CREATE TABLE digest_log (
  user_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  day     date    NOT NULL,
  sent_at timestamptz NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, day)
);
