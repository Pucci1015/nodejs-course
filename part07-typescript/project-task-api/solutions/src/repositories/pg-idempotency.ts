// 追加（第6部）: Idempotency-Key で覚えた応答を、データベースの表 idempotency_keys に置く
// middleware/idempotency.ts の createIdempotencyStore（メモリ）と同じ形。サーバを再起動しても、2台にしても、送り直しを見分けられる
// 変更（第7部）: TypeScript にした。表から読んだ行は Zod で確かめてから返す（response は jsonb で、中の形は tsc には分からない。第38章 3節）
import { z } from 'zod';
import type { Queryable } from '../db/pool.ts';
import type { IdempotencyRecord, IdempotencyStore } from '../types.ts';

// 1行の形。z.discriminatedUnion('status', […]) は、status の値で形を選ぶスキーマ（第36章 2節の判別できるユニオンの Zod 版）
const Row = z.discriminatedUnion('status', [
  z.object({ fingerprint: z.string(), status: z.literal('running'), response: z.null() }),
  z.object({
    fingerprint: z.string(),
    status: z.literal('done'),
    response: z.object({ status: z.number().int(), headers: z.record(z.string(), z.string()), body: z.unknown() }),
  }),
]);

/**
 * @param options.ttlMs  覚えておく時間（決まりは 24 時間）
 */
export function createPgIdempotencyStore(db: Queryable, { ttlMs = 24 * 60 * 60 * 1000 }: { ttlMs?: number } = {}): IdempotencyStore {
  return {
    async claim(key, fingerprint): Promise<IdempotencyRecord | null> {
      // 期限の切れたものは、無いのと同じにする
      await db.query('DELETE FROM idempotency_keys WHERE key = $1 AND expires_at <= now()', [key]);
      for (let i = 0; i < 3; i++) {
        // INSERT … ON CONFLICT DO NOTHING は「無ければ入れる」を1つの SQL でする。2台が同時に来ても、入れられるのは1台だけ
        const inserted = await db.query(
          `INSERT INTO idempotency_keys (key, fingerprint, status, expires_at)
           VALUES ($1, $2, 'running', now() + $3 * interval '1 millisecond')
           ON CONFLICT (key) DO NOTHING
           RETURNING key`,
          [key, fingerprint, ttlMs],
        );
        if (inserted.rowCount === 1) return null; // 自分のものにできた
        const { rows } = await db.query('SELECT fingerprint, status, response FROM idempotency_keys WHERE key = $1', [key]);
        // 変更（第7部）: 行の形を確かめる。合わなければ、表かコードのバグなので、ZodError を投げて 500 にする
        if (rows.length === 1) return Row.parse(rows[0]);
        // 入れられなかったのに、読むと無い = その間に消された。もう一度入れてみる
      }
      throw new Error('Idempotency-Key を覚えられませんでした');
    },

    /** 応答を覚えて「済み（done）」にする。response は jsonb の列に、JSON のまま入る */
    async complete(key, response) {
      await db.query(
        "UPDATE idempotency_keys SET status = 'done', response = $2, expires_at = now() + $3 * interval '1 millisecond' WHERE key = $1",
        [key, JSON.stringify(response), ttlMs],
      );
    },

    async delete(key) {
      await db.query('DELETE FROM idempotency_keys WHERE key = $1', [key]);
    },

    /** 期限の切れたものを、まとめて消す。消した数を返す（server.ts が、ときどき呼ぶ） */
    async purgeExpired() {
      return (await db.query('DELETE FROM idempotency_keys WHERE expires_at <= now()')).rowCount ?? 0;
    },
  };
}
