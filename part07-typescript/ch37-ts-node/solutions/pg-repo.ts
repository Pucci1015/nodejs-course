// 練習問題6 の模範解答
import type { Status, Task, TaskFilter, TaskRepo } from './task-repo.ts';

/** pg の Pool・PoolClient が満たす形（query だけ） */
export interface Queryable {
  query<R>(text: string, values?: unknown[]): Promise<{ rows: R[]; rowCount: number | null }>;
}

/** tasks の表の1行。列の名前は snake_case。timestamptz は Date で来る。date は文字列のまま来る設定（第32章 4.2節） */
export type TaskRow = {
  id: number;
  title: string;
  status: Status;
  due_date: string | null;
  created_at: Date;
  updated_at: Date;
  version: number;
};

export function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    dueDate: row.due_date,
    createdAt: row.created_at.toISOString(),
    updatedAt: row.updated_at.toISOString(),
    version: row.version,
  };
}

/** 変えてよい項目と、その列の名前（許可リスト。第31章） */
const COLUMNS = { title: 'title', status: 'status', dueDate: 'due_date' } as const;
const PATCH_KEYS = ['title', 'status', 'dueDate'] as const;

export function createPgTaskRepo(db: Queryable): TaskRepo {
  return {
    async list(filter: TaskFilter = {}) {
      const where: string[] = [];
      const values: unknown[] = [];
      if (filter.status !== undefined) {
        values.push(filter.status);
        where.push(`status = $${values.length}`);
      }
      if (filter.dueBefore !== undefined) {
        values.push(filter.dueBefore);
        where.push(`due_date < $${values.length}`);
      }
      const sql = `SELECT * FROM tasks ${where.length > 0 ? `WHERE ${where.join(' AND ')} ` : ''}ORDER BY id`;
      // query<TaskRow> で「行はこの形」と書く。本当にこの形かは確かめていない（第38章）
      const { rows } = await db.query<TaskRow>(sql, values);
      return rows.map(toTask);
    },

    async get(id) {
      const { rows } = await db.query<TaskRow>('SELECT * FROM tasks WHERE id = $1', [id]);
      const row = rows[0];
      return row === undefined ? null : toTask(row);
    },

    async create(input) {
      const { rows } = await db.query<TaskRow>(
        'INSERT INTO tasks (title, status, due_date) VALUES ($1, $2, $3) RETURNING *',
        [input.title, input.status ?? 'todo', input.dueDate ?? null],
      );
      const row = rows[0];
      if (row === undefined) throw new Error('INSERT が行を返しませんでした'); // RETURNING * なので、ふつうは来ない
      return toTask(row);
    },

    async update(id, patch, options = {}) {
      const sets: string[] = [];
      const values: unknown[] = [];
      for (const key of PATCH_KEYS) {
        const value = patch[key];
        if (value === undefined) continue;
        values.push(value);
        sets.push(`${COLUMNS[key]} = $${values.length}`);
      }
      sets.push('version = version + 1', 'updated_at = now()');
      values.push(id);
      let sql = `UPDATE tasks SET ${sets.join(', ')} WHERE id = $${values.length}`;
      if (options.expectedVersion !== undefined) {
        values.push(options.expectedVersion);
        sql += ` AND version = $${values.length}`;
      }
      const { rows } = await db.query<TaskRow>(`${sql} RETURNING *`, values);
      const row = rows[0];
      return row === undefined ? null : toTask(row);
    },

    async remove(id) {
      const { rowCount } = await db.query('DELETE FROM tasks WHERE id = $1', [id]);
      return (rowCount ?? 0) > 0; // pg の型では rowCount は number | null
    },
  };
}
