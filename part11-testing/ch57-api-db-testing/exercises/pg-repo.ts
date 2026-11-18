// 練習問題で使う、本文の samples のコピー（書き換えなくてよい）。第57章 5節: PostgreSQL のリポジトリ（第6部 第32章の pg-task-repo を小さくしたもの）
// db には Pool も、借りた1つの接続（PoolClient）も渡せる（7節の「最後に取り消す」で使う）
import type { Pool, PoolClient } from 'pg';
import { ConflictError, type Status, type Task, type TaskRepo } from './types.ts';

export type Db = Pick<Pool | PoolClient, 'query'>;

/** この章のテーブル。テストでは、テストごとのスキーマの中に作る */
export const SCHEMA_SQL = `
  CREATE TABLE tasks (
    id       integer GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
    title    text NOT NULL CHECK (char_length(title) BETWEEN 1 AND 100),
    status   text NOT NULL DEFAULT 'todo' CHECK (status IN ('todo', 'doing', 'done')),
    due_date date
  );
  -- 終わっていない同じ題名は1つだけ（部分ユニークインデックス、第6部 第30章）
  CREATE UNIQUE INDEX tasks_open_title ON tasks (title) WHERE status <> 'done';
`;

interface Row {
  id: number;
  title: string;
  status: Status;
  due_date: string | null;
}

// date の列は、文字列のまま受け取る（to_char）。Date にすると時間帯で1日ずれる（第6部 第32章 4.2節）
const COLUMNS = `id, title, status, to_char(due_date, 'YYYY-MM-DD') AS due_date`;

const toTask = (row: Row): Task => ({ id: row.id, title: row.title, status: row.status, dueDate: row.due_date });

function isUniqueViolation(err: unknown): boolean {
  return typeof err === 'object' && err !== null && 'code' in err && err.code === '23505';
}

export function createPgRepo(db: Db): TaskRepo {
  return {
    async list() {
      const { rows } = await db.query<Row>(`SELECT ${COLUMNS} FROM tasks ORDER BY id`);
      return rows.map(toTask);
    },
    async get(id) {
      const { rows } = await db.query<Row>(`SELECT ${COLUMNS} FROM tasks WHERE id = $1`, [id]);
      return rows[0] && toTask(rows[0]);
    },
    async insert({ title, dueDate }) {
      try {
        const { rows } = await db.query<Row>(
          `INSERT INTO tasks (title, due_date) VALUES ($1, $2) RETURNING ${COLUMNS}`,
          [title, dueDate],
        );
        return toTask(rows[0]!);
      } catch (err) {
        if (isUniqueViolation(err)) throw new ConflictError(`同じ題名のタスクがあります: ${title}`);
        throw err;
      }
    },
    async setStatus(id, status) {
      const { rows } = await db.query<Row>(`UPDATE tasks SET status = $2 WHERE id = $1 RETURNING ${COLUMNS}`, [id, status]);
      return rows[0] && toTask(rows[0]);
    },
    async remove(id) {
      const { rowCount } = await db.query('DELETE FROM tasks WHERE id = $1', [id]);
      return rowCount === 1;
    },
    async countByStatus(status) {
      const { rows } = await db.query<{ n: number }>('SELECT count(*)::int AS n FROM tasks WHERE status = $1', [status]);
      return rows[0]?.n ?? 0;
    },
  };
}
