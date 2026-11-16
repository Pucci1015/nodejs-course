// 練習問題6: PostgreSQL のリポジトリを、型を付けて書いてください。要件は README にあります。
// テストは本物のデータベースではなく、Queryable の形をした偽物を使います。
// 確かめ方: node --test pg-repo.test.ts
import type { TaskRepo } from './task-repo.ts';

/** pg の Pool・PoolClient が満たす形（query だけ） */
export interface Queryable {
  query<R>(text: string, values?: unknown[]): Promise<{ rows: R[]; rowCount: number | null }>;
}

// ここに、tasks の表の1行の型 TaskRow と、行をタスクにする toTask を書く

export function createPgTaskRepo(db: Queryable): TaskRepo {
  throw new Error('まだ書いていません');
}
