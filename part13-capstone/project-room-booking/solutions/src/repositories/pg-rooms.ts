// 会議室の、データの層（PostgreSQL）
import type { Queryable } from '../db/pool.ts';
import { ConflictError } from '../errors.ts';

export type Room = { id: number; name: string; capacity: number; active: boolean };
export type RoomFields = Omit<Room, 'id'>;

type RoomRow = { id: number; name: string; capacity: number; active: boolean };
const toRoom = (r: RoomRow): Room => ({ id: r.id, name: r.name, capacity: r.capacity, active: r.active });

/** 名前の一意（rooms_name）の違反を、仕事の言葉に読み替える */
function rethrow(err: unknown): never {
  if (typeof err === 'object' && err !== null && 'code' in err && err.code === '23505')
    throw new ConflictError('同じ名前の会議室があります');
  throw err;
}

// 列の名前は、決めた表から選ぶ（利用者の文字を SQL に入れない。第31章 3節）
const COLUMNS = { name: 'name', capacity: 'capacity', active: 'active' } satisfies Record<keyof RoomFields, string>;

export function createPgRoomRepo(db: Queryable) {
  async function get(id: number): Promise<Room | null> {
    const { rows } = await db.query<RoomRow>('SELECT * FROM rooms WHERE id = $1', [id]);
    return rows[0] === undefined ? null : toRoom(rows[0]);
  }

  return {
    get,

    /** 名前の順。all が false なら、使えるものだけ */
    async list({ all = false }: { all?: boolean } = {}): Promise<Room[]> {
      const { rows } = await db.query<RoomRow>(
        `SELECT * FROM rooms ${all ? '' : 'WHERE active'} ORDER BY name COLLATE "C", id`,
      );
      return rows.map(toRoom);
    },

    async insert(fields: Pick<Room, 'name' | 'capacity'>): Promise<Room> {
      const { rows } = await db
        .query<RoomRow>('INSERT INTO rooms (name, capacity) VALUES ($1, $2) RETURNING *', [
          fields.name,
          fields.capacity,
        ])
        .catch(rethrow);
      const row = rows[0];
      if (row === undefined) throw new Error('INSERT が行を返しませんでした');
      return toRoom(row);
    },

    /** 渡した項目だけを変える。無ければ null */
    async update(id: number, fields: Partial<RoomFields>): Promise<Room | null> {
      const sets: string[] = [];
      const values: unknown[] = [id];
      for (const key of ['name', 'capacity', 'active'] as const) {
        if (fields[key] === undefined) continue;
        values.push(fields[key]);
        sets.push(`${COLUMNS[key]} = $${values.length}`);
      }
      if (sets.length === 0) return get(id);
      const { rows } = await db
        .query<RoomRow>(`UPDATE rooms SET ${sets.join(', ')} WHERE id = $1 RETURNING *`, values)
        .catch(rethrow);
      return rows[0] === undefined ? null : toRoom(rows[0]);
    },
  };
}

export type RoomRepo = ReturnType<typeof createPgRoomRepo>;
