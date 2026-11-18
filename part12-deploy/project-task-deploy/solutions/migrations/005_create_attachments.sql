-- 追加（第12部）: タスクの添付ファイル（第63章）。中身はオブジェクトストレージに置き、ここには「どこに何があるか」だけを書く
CREATE TABLE attachments (
  id           uuid        PRIMARY KEY,                -- randomUUID() で作る。URL に出るので、連番にしない
  task_id      integer     NOT NULL REFERENCES tasks (id) ON DELETE CASCADE, -- タスクを消すと行も消える（中身は孤児の掃除で消す）
  owner_id     integer     NOT NULL REFERENCES users (id) ON DELETE CASCADE,
  object_key   text        NOT NULL UNIQUE,            -- ストレージのキー（users/1/2026/11/<id>.png）
  file_name    text        NOT NULL CHECK (length(file_name) BETWEEN 1 AND 200), -- 利用者が付けた名前（表示とダウンロードだけに使う）
  content_type text        NOT NULL,                   -- 中身から決めた種類（送られた Content-Type ではない）
  size         integer     NOT NULL CHECK (size > 0),
  created_at   timestamptz NOT NULL DEFAULT now()
);
-- 一覧は「持ち主・タスク」で絞って、置いた順に並べる
CREATE INDEX attachments_owner_task ON attachments (owner_id, task_id, created_at, id);
