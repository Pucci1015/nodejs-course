// 追加（第12部）: 添付ファイルの行（表 attachments）。タスクと同じく、持ち主（ownerId）ごとのリポジトリにする（第55章 7節）
import type { Queryable } from '../db/pool.ts';

/** API が返す添付ファイルの形（ストレージのキーは見せない） */
export type Attachment = {
  id: string;
  taskId: number;
  fileName: string;
  contentType: string;
  size: number;
  createdAt: string;
};

type AttachmentRow = {
  id: string;
  task_id: number;
  object_key: string;
  file_name: string;
  content_type: string;
  size: number;
  created_at: Date;
};

const toAttachment = (r: AttachmentRow): Attachment => ({
  id: r.id,
  taskId: r.task_id,
  fileName: r.file_name,
  contentType: r.content_type,
  size: r.size,
  createdAt: r.created_at.toISOString(),
});

export type NewAttachment = Omit<Attachment, 'createdAt'> & { objectKey: string };

export function createPgAttachmentRepo(db: Queryable, ownerId: number) {
  return {
    async list(taskId: number): Promise<Attachment[]> {
      const { rows } = await db.query<AttachmentRow>(
        'SELECT * FROM attachments WHERE owner_id = $1 AND task_id = $2 ORDER BY created_at, id',
        [ownerId, taskId],
      );
      return rows.map(toAttachment);
    },

    async count(taskId: number): Promise<number> {
      const { rows } = await db.query<{ n: number }>(
        'SELECT count(*)::int AS n FROM attachments WHERE owner_id = $1 AND task_id = $2',
        [ownerId, taskId],
      );
      return rows[0]?.n ?? 0;
    },

    /** 無ければ null。ストレージのキーも返す（中身を取り出す URL を作るため） */
    async get(taskId: number, id: string): Promise<(Attachment & { objectKey: string }) | null> {
      const { rows } = await db.query<AttachmentRow>(
        'SELECT * FROM attachments WHERE owner_id = $1 AND task_id = $2 AND id = $3',
        [ownerId, taskId, id],
      );
      const r = rows[0];
      return r === undefined ? null : { ...toAttachment(r), objectKey: r.object_key };
    },

    /** 持ち主は、いつもこのリポジトリの ownerId（入力から決めない） */
    async insert(a: NewAttachment): Promise<Attachment> {
      const { rows } = await db.query<AttachmentRow>(
        `INSERT INTO attachments (id, task_id, owner_id, object_key, file_name, content_type, size)
         VALUES ($1, $2, $3, $4, $5, $6, $7) RETURNING *`,
        [a.id, a.taskId, ownerId, a.objectKey, a.fileName, a.contentType, a.size],
      );
      const r = rows[0];
      if (r === undefined) throw new Error('INSERT が行を返しませんでした');
      return toAttachment(r);
    },

    /** 消したら、そのストレージのキーを返す（無ければ null） */
    async remove(taskId: number, id: string): Promise<string | null> {
      const { rows } = await db.query<{ object_key: string }>(
        'DELETE FROM attachments WHERE owner_id = $1 AND task_id = $2 AND id = $3 RETURNING object_key',
        [ownerId, taskId, id],
      );
      return rows[0]?.object_key ?? null;
    },
  };
}

export type AttachmentRepo = ReturnType<typeof createPgAttachmentRepo>;

/** 孤児の掃除が使う: どの行かがこのキーを使っているか（持ち主を問わない） */
export async function isObjectKeyUsed(db: Queryable, key: string): Promise<boolean> {
  const { rows } = await db.query('SELECT 1 FROM attachments WHERE object_key = $1', [key]);
  return rows.length > 0;
}
