-- 第67章 練習問題7 の模範解答: 会議室を使えない時間（工事・点検など）の表
-- 予約の表（migrations/002）と違い、時間を tstzrange の1つの列で持つ。重なりの制約が短く書ける
CREATE TABLE room_closures (
  id      integer   GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  room_id integer   NOT NULL,
  reason  text      NOT NULL CONSTRAINT room_closures_reason_check CHECK (length(reason) BETWEEN 1 AND 100),
  -- [始まり, 終わり) の範囲。isempty は「始まり = 終わり」の空の範囲で true
  during  tstzrange NOT NULL CONSTRAINT room_closures_during_check CHECK (NOT isempty(during)),
  -- 同じ会議室で、使えない時間が重ならない（btree_gist で integer の = を GiST に入れる）
  CONSTRAINT room_closures_no_overlap EXCLUDE USING gist (room_id WITH =, during WITH &&)
);
