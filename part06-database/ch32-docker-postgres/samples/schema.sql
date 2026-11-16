-- 第32章 3節で、psql に流し込んで、タスクのテーブルを作り直す SQL
-- 使い方（~/dev/part06 で）: docker compose exec -T postgres psql -U app -d app < ch32-docker-postgres/samples/schema.sql
-- 注意: tasks を消してから作るので、tasks に入れたデータは消える

DROP TABLE IF EXISTS tasks;

CREATE TABLE tasks (
  id           integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  title        text        NOT NULL CHECK (length(title) BETWEEN 1 AND 100),
  status       text        NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done')),
  due_date     date,
  created_at   timestamptz NOT NULL DEFAULT now(),
  updated_at   timestamptz NOT NULL DEFAULT now(),
  completed_at timestamptz,
  version      integer     NOT NULL DEFAULT 1
);
CREATE UNIQUE INDEX tasks_open_title ON tasks (title) WHERE status <> 'done';

INSERT INTO tasks (title, status, due_date, created_at, updated_at, completed_at, version) VALUES
  ('牛乳を買う',       'done',  '2026-11-01', '2026-11-01T00:00:00Z', '2026-11-01T03:00:00Z', '2026-11-01T03:00:00Z', 2),
  ('本を返す',         'todo',  '2026-11-12', '2026-11-02T00:00:00Z', '2026-11-02T00:00:00Z', NULL, 1),
  ('部屋の掃除',       'doing', '2026-11-15', '2026-11-03T00:00:00Z', '2026-11-04T00:00:00Z', NULL, 2),
  ('Let''s ストレッチ', 'todo', NULL,         '2026-11-05T00:00:00Z', '2026-11-05T00:00:00Z', NULL, 1),
  ('報告書を書く',     'todo',  '2026-11-10', '2026-11-06T00:00:00Z', '2026-11-06T00:00:00Z', NULL, 1);
