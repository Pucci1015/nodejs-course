// 追加（第6部）: データの層の PostgreSQL 版。第32章 8.2節の pg-task-repo.mjs から始めて、
// 一覧の絞り込み・並べ方・ページ分けを1つの SQL にし（第30章 6節のキーセット）、サービスが使う問い合わせを足した
// 第5部の memory-tasks.mjs と同じく、決まり（題名が重ならない、など）はサービスの層が確かめる
import { ConflictError } from '../errors.mjs';

const COLUMNS = {
  title: 'title',
  status: 'status',
  dueDate: 'due_date',
  createdAt: 'created_at',
  updatedAt: 'updated_at',
  completedAt: 'completed_at',
  version: 'version',
};

function column(key) {
  if (!Object.hasOwn(COLUMNS, key)) throw new Error(`知らない項目です: ${key}`);
  return COLUMNS[key];
}

// 並べ方（?sort=）ごとの、ORDER BY に書く列。title は COLLATE "C"（文字の番号の順）にして、
// 第5部の JavaScript の並べ方（< で比べる）と、同じ順にする
const SORT_COLUMNS = {
  createdAt: 'created_at',
  dueDate: 'due_date',
  title: 'title COLLATE "C"',
};

// timestamptz は Date で来るので、第5部と同じ ISO 8601 の文字列にする。date は pool.mjs の設定で文字列のまま来る
const iso = (d) => (d === null ? null : d.toISOString());

function toTask(row) {
  if (!row) return null;
  return {
    id: row.id,
    title: row.title,
    status: row.status,
    dueDate: row.due_date,
    createdAt: iso(row.created_at),
    updatedAt: iso(row.updated_at),
    completedAt: iso(row.completed_at),
    version: row.version,
  };
}

/** 終わっていないタスクの題名が重なった（tasks_open_title）なら、サービスの言葉の ConflictError にする */
function rethrow(err) {
  if (err.code === '23505' && err.constraint === 'tasks_open_title') {
    throw new ConflictError('同じ題名の、終わっていないタスクがあります', { cause: err });
  }
  throw err;
}

/**
 * @param {import('pg').Pool} db  pool か、トランザクションの client
 */
export function createPgTaskRepo(db) {
  return {
    /**
     * 一覧の1ページ。並べ方の値が同じなら id で並べ、after（前のページの最後の { v, id }）より後ろから limit 件
     * NULL（締め切りの無いタスク）は、PostgreSQL の決まりどおり、小さい順では最後、大きい順では最初
     * @param {{ statuses?: string[], dueBefore?: string, sort: string, limit: number, after?: { v: any, id: number } }} q
     * @returns {Promise<{ items: object[], hasMore: boolean }>}
     */
    async listPage({ statuses, dueBefore, sort, limit, after }) {
      const desc = sort.startsWith('-');
      const key = desc ? sort.slice(1) : sort;
      if (!Object.hasOwn(SORT_COLUMNS, key)) throw new Error(`知らない並べ方です: ${sort}`);
      const col = SORT_COLUMNS[key];
      const values = [];
      const $ = (v) => {
        values.push(v);
        return `$${values.length}`; // 値を配列に足して、その番号の $n を返す
      };

      const where = [];
      if (statuses && statuses.length > 0) where.push(`status = ANY(${$(statuses)}::text[])`); // 配列の中のどれか
      if (dueBefore !== undefined) where.push(`due_date < ${$(dueBefore)}`); // NULL は入らない
      if (after !== undefined) {
        // キーセット: 「前のページの最後の (値, id)」より後ろ。NULL の位置も合わせる
        const op = desc ? '<' : '>';
        if (after.v === null) {
          where.push(desc ? `((${col} IS NULL AND id < ${$(after.id)}) OR ${col} IS NOT NULL)` : `(${col} IS NULL AND id > ${$(after.id)})`);
        } else {
          const v = $(after.v);
          const tie = `(${col} = ${v} AND id ${op} ${$(after.id)})`;
          where.push(desc ? `(${col} < ${v} OR ${tie})` : `(${col} > ${v} OR ${tie} OR ${col} IS NULL)`);
        }
      }

      const dir = desc ? 'DESC' : 'ASC';
      // 1件多く読み、あふれたら「次のページがある」（第30章 6節）
      const sql = `SELECT * FROM tasks ${where.length > 0 ? `WHERE ${where.join(' AND ')}` : ''} ORDER BY ${col} ${dir}, id ${dir} LIMIT ${$(limit + 1)}`;
      const { rows } = await db.query(sql, values);
      return { items: rows.slice(0, limit).map(toTask), hasMore: rows.length > limit };
    },

    async get(id) {
      return toTask((await db.query('SELECT * FROM tasks WHERE id = $1', [id])).rows[0]);
    },

    /** 終わっていないタスクのうち、題名が title のもの（exceptId のタスクは除く）。無ければ null */
    async findOpenByTitle(title, exceptId = null) {
      const { rows } = await db.query("SELECT * FROM tasks WHERE status <> 'done' AND title = $1 AND id IS DISTINCT FROM $2 LIMIT 1", [title, exceptId]);
      return toTask(rows[0]);
    },

    /** status のタスクの数 */
    async countByStatus(status) {
      const { rows } = await db.query('SELECT count(*)::int AS n FROM tasks WHERE status = $1', [status]);
      return rows[0].n;
    },

    async insert(fields) {
      const keys = Object.keys(fields).filter((k) => k !== 'id'); // id はデータベースが付ける
      const cols = keys.map(column).join(', ');
      const marks = keys.map((_, i) => `$${i + 1}`).join(', ');
      try {
        const { rows } = await db.query(
          `INSERT INTO tasks (${cols}) VALUES (${marks}) RETURNING *`,
          keys.map((k) => fields[k]),
        );
        return toTask(rows[0]);
      } catch (err) {
        rethrow(err);
      }
    },

    /** expectedVersion を渡されたら、今の version が同じときだけ変える。違えば（か、無ければ）null */
    async update(id, fields, { expectedVersion } = {}) {
      const keys = Object.keys(fields).filter((k) => k !== 'id');
      if (keys.length === 0) return this.get(id);
      const values = keys.map((k) => fields[k]);
      const sets = keys.map((k, i) => `${column(k)} = $${i + 1}`).join(', ');
      values.push(id);
      let sql = `UPDATE tasks SET ${sets} WHERE id = $${values.length}`;
      if (expectedVersion !== undefined) {
        values.push(expectedVersion);
        sql += ` AND version = $${values.length}`;
      }
      try {
        const { rows } = await db.query(`${sql} RETURNING *`, values);
        return toTask(rows[0]);
      } catch (err) {
        rethrow(err);
      }
    },

    async remove(id, { expectedVersion } = {}) {
      const r =
        expectedVersion === undefined
          ? await db.query('DELETE FROM tasks WHERE id = $1', [id])
          : await db.query('DELETE FROM tasks WHERE id = $1 AND version = $2', [id, expectedVersion]);
      return r.rowCount > 0;
    },
  };
}
