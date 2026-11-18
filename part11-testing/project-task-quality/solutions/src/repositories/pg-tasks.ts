// 追加（第6部）: データの層の PostgreSQL 版。第32章 8.2節の pg-task-repo.mjs から始めて、
// 一覧の絞り込み・並べ方・ページ分けを1つの SQL にし（第30章 6節のキーセット）、サービスが使う問い合わせを足した
// 第5部の memory-tasks.mjs と同じく、決まり（題名が重ならない、など）はサービスの層が確かめる
// 変更（第7部）: TypeScript にした。形は types.ts の TaskRepo。行の型は TaskRow（tsc が信じるだけ。第37章 4.3節）
// 変更（第10部）: 持ち主（ownerId）ごとのリポジトリにした。どの SQL も owner_id で絞るので、ほかの人のタスクには届かない（第55章 7節）
import type { Queryable } from '../db/pool.ts';
import { ConflictError } from '../errors.ts';
import type { Sort, Status, Task, TaskFields, TaskRepo } from '../types.ts';

/** tasks の表の1行。timestamptz は Date で来る。date は pool.ts の設定で文字列のまま来る */
type TaskRow = {
  id: number;
  title: string;
  status: Status;
  due_date: string | null;
  created_at: Date;
  updated_at: Date;
  completed_at: Date | null;
  version: number;
};

// 変更（第7部）: 項目の名前 → 列の名前。satisfies で「TaskFields の項目を全部書いたか」を確かめる（第36章 7節）
const COLUMNS = {
  title: 'title',
  status: 'status',
  dueDate: 'due_date',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  completedAt: 'completed_at',
  version: 'version',
} as const satisfies Record<keyof TaskFields, string>;
const FIELD_KEYS = [
  'title',
  'status',
  'dueDate',
  'createdAt',
  'updatedAt',
  'completedAt',
  'version',
] as const satisfies readonly (keyof TaskFields)[];

/** 追加（第7部）: fields にある項目の名前（Object.keys(fields) は string[] になってしまうので、決まった並びから選ぶ） */
const keysOf = (fields: Partial<TaskFields>) => FIELD_KEYS.filter((k) => fields[k] !== undefined);

// 並べ方（?sort=）ごとの、ORDER BY に書く列と、大きい順か。title は COLLATE "C"（文字の番号の順）にして、
// 第5部の JavaScript の並べ方（< で比べる）と、同じ順にする
// 変更（第7部）: Sort の6つを全部書いたかを、satisfies で確かめる。利用者の文字列は、ここにある列にしかならない
const SORT_SQL = {
  createdAt: ['created_at', false],
  '-createdAt': ['created_at', true],
  dueDate: ['due_date', false],
  '-dueDate': ['due_date', true],
  title: ['title COLLATE "C"', false],
  '-title': ['title COLLATE "C"', true],
} as const satisfies Record<Sort, readonly [string, boolean]>;

// timestamptz は Date で来るので、第5部と同じ ISO 8601 の文字列にする
const iso = (d: Date) => d.toISOString();

function toTask(row: TaskRow): Task {
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    dueDate: row.due_date,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    completedAt: row.completed_at === null ? null : iso(row.completed_at),
    version: row.version,
  };
}

/** 変更（第7部）: 行が無ければ null（rows[0] は TaskRow | undefined） */
const toTaskOrNull = (row: TaskRow | undefined): Task | null => (row === undefined ? null : toTask(row));

/** 終わっていないタスクの題名が重なった（tasks_open_title）なら、サービスの言葉の ConflictError にする */
function rethrow(err: unknown): never {
  // 変更（第7部）: err は unknown。pg のエラーは code と constraint を持つ
  if (
    typeof err === 'object' &&
    err !== null &&
    'code' in err &&
    err.code === '23505' &&
    'constraint' in err &&
    err.constraint === 'tasks_open_title'
  ) {
    throw new ConflictError('同じ題名の、終わっていないタスクがあります', { cause: err });
  }
  throw err;
}

/**
 * @param db       pool か、トランザクションの client
 * @param ownerId  追加（第10部）: このリポジトリが扱うタスクの持ち主（ログインしている人）
 */
export function createPgTaskRepo(db: Queryable, ownerId: number): TaskRepo {
  async function get(id: number): Promise<Task | null> {
    const { rows } = await db.query<TaskRow>('SELECT * FROM tasks WHERE id = $1 AND owner_id = $2', [id, ownerId]); // 変更（第10部）
    return toTaskOrNull(rows[0]);
  }

  return {
    /**
     * 一覧の1ページ。並べ方の値が同じなら id で並べ、after（前のページの最後の { v, id }）より後ろから limit 件
     * NULL（締め切りの無いタスク）は、PostgreSQL の決まりどおり、小さい順では最後、大きい順では最初
     */
    async listPage({ statuses, dueBefore, sort, limit, after }) {
      const [col, desc] = SORT_SQL[sort];
      const values: unknown[] = [];
      const $ = (v: unknown) => {
        values.push(v);
        return `$${values.length}`; // 値を配列に足して、その番号の $n を返す
      };

      const where: string[] = [`owner_id = ${$(ownerId)}`]; // 変更（第10部）: いつも持ち主で絞る
      if (statuses && statuses.length > 0) where.push(`status = ANY(${$(statuses)}::text[])`); // 配列の中のどれか
      if (dueBefore !== undefined) where.push(`due_date < ${$(dueBefore)}`); // NULL は入らない
      if (after !== undefined) {
        // キーセット: 「前のページの最後の (値, id)」より後ろ。NULL の位置も合わせる
        const op = desc ? '<' : '>';
        if (after.v === null) {
          where.push(
            desc
              ? `((${col} IS NULL AND id < ${$(after.id)}) OR ${col} IS NOT NULL)`
              : `(${col} IS NULL AND id > ${$(after.id)})`,
          );
        } else {
          const v = $(after.v);
          const tie = `(${col} = ${v} AND id ${op} ${$(after.id)})`;
          where.push(desc ? `(${col} < ${v} OR ${tie})` : `(${col} > ${v} OR ${tie} OR ${col} IS NULL)`);
        }
      }

      const dir = desc ? 'DESC' : 'ASC';
      // 1件多く読み、あふれたら「次のページがある」（第30章 6節）
      const sql = `SELECT * FROM tasks WHERE ${where.join(' AND ')} ORDER BY ${col} ${dir}, id ${dir} LIMIT ${$(limit + 1)}`;
      const { rows } = await db.query<TaskRow>(sql, values);
      return { items: rows.slice(0, limit).map(toTask), hasMore: rows.length > limit };
    },

    get,

    async findOpenByTitle(title, exceptId = null) {
      const { rows } = await db.query<TaskRow>(
        "SELECT * FROM tasks WHERE owner_id = $3 AND status <> 'done' AND title = $1 AND id IS DISTINCT FROM $2 LIMIT 1",
        [title, exceptId, ownerId],
      );
      return toTaskOrNull(rows[0]);
    },

    async countByStatus(status) {
      const { rows } = await db.query<{ n: number }>(
        'SELECT count(*)::int AS n FROM tasks WHERE owner_id = $2 AND status = $1',
        [status, ownerId],
      );
      return rows[0]?.n ?? 0;
    },

    async insert(fields) {
      const keys = keysOf(fields); // id はデータベースが付ける
      const cols = keys.map((k) => COLUMNS[k]).join(', ');
      const marks = keys.map((_, i) => `$${i + 1}`).join(', ');
      try {
        // 変更（第10部）: 持ち主は、いつもこのリポジトリの ownerId（入力から決めない）
        const { rows } = await db.query<TaskRow>(
          `INSERT INTO tasks (${cols}, owner_id) VALUES (${marks}, $${keys.length + 1}) RETURNING *`,
          [...keys.map((k) => fields[k]), ownerId],
        );
        const task = toTaskOrNull(rows[0]);
        if (task === null) throw new Error('INSERT が行を返しませんでした'); // RETURNING * なので、ふつうは来ない
        return task;
      } catch (err) {
        return rethrow(err);
      }
    },

    async update(id, fields, { expectedVersion } = {}) {
      const keys = keysOf(fields);
      if (keys.length === 0) return get(id);
      const values: unknown[] = keys.map((k) => fields[k]);
      const sets = keys.map((k, i) => `${COLUMNS[k]} = $${i + 1}`).join(', ');
      values.push(id, ownerId);
      let sql = `UPDATE tasks SET ${sets} WHERE id = $${values.length - 1} AND owner_id = $${values.length}`; // 変更（第10部）
      if (expectedVersion !== undefined) {
        values.push(expectedVersion);
        sql += ` AND version = $${values.length}`;
      }
      try {
        const { rows } = await db.query<TaskRow>(`${sql} RETURNING *`, values);
        return toTaskOrNull(rows[0]);
      } catch (err) {
        return rethrow(err);
      }
    },

    async remove(id, { expectedVersion } = {}) {
      const r =
        expectedVersion === undefined
          ? await db.query('DELETE FROM tasks WHERE id = $1 AND owner_id = $2', [id, ownerId]) // 変更（第10部）
          : await db.query('DELETE FROM tasks WHERE id = $1 AND owner_id = $2 AND version = $3', [
              id,
              ownerId,
              expectedVersion,
            ]);
      return (r.rowCount ?? 0) > 0;
    },
  };
}
