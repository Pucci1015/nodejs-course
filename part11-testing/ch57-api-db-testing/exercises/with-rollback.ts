// 練習問題8: テストの中で書いたものを、最後に必ず取り消す部品を書く
import type { Pool, PoolClient } from 'pg';

/**
 * プールから接続を1つ借りて BEGIN し、fn(接続) を動かし、最後に必ず ROLLBACK して接続を返す。
 * fn の戻り値を返す。fn が例外を投げたら、取り消して返した後、その例外をそのまま投げる。
 */
export async function withRollback<T>(pool: Pool, fn: (client: PoolClient) => Promise<T>): Promise<T> {
  // ここを書く
  void pool;
  void fn;
  throw new Error('まだ書いていません');
}
