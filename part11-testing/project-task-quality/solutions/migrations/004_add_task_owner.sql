-- 追加（第10部）: タスクに持ち主を付ける（第55章 7節）
-- 第9部までのタスクには持ち主がいないので、消す（開発用のデータ。本番のデータなら、持ち主を決めてから列を足す）
DELETE FROM tasks;
DELETE FROM idempotency_keys;

ALTER TABLE tasks ADD COLUMN owner_id integer NOT NULL REFERENCES users (id) ON DELETE CASCADE;

-- 「終わっていないタスクの題名は重ならない」は、人ごとにする（同じ名前の制約を作り直す）
DROP INDEX tasks_open_title;
CREATE UNIQUE INDEX tasks_open_title ON tasks (owner_id, title) WHERE status <> 'done';

-- 一覧は、いつも owner_id で絞るので、索引の先頭に owner_id を足す
DROP INDEX tasks_created_at_id;
DROP INDEX tasks_due_date_id;
DROP INDEX tasks_title_id;
CREATE INDEX tasks_owner_created_at_id ON tasks (owner_id, created_at, id);
CREATE INDEX tasks_owner_due_date_id ON tasks (owner_id, due_date, id);
CREATE INDEX tasks_owner_title_id ON tasks (owner_id, title COLLATE "C", id);
