// 追加（第6部）: PostgreSQL の接続のプールを作る（第32章 4・5節の db.mjs と同じ考え方）
// 変更（第7部）: TypeScript にした
import pg from 'pg';

// date の列（due_date）は、'2026-11-12' の文字列のまま受け取る（Date にすると、日本では1日ずれる。第32章 4.2節）
pg.types.setTypeParser(pg.types.builtins.DATE, (value: string) => value);

/**
 * schema: テーブルを置くスキーマ。渡すと、このプールの SQL は、まずそのスキーマのテーブルを使う（テスト用）
 */
export function createPool({
  url,
  schema,
  max = 10,
}: {
  url: string;
  schema?: string | undefined;
  max?: number;
}): pg.Pool {
  return new pg.Pool({
    connectionString: url,
    max,
    connectionTimeoutMillis: 5000, // 空きの接続を 5 秒待っても来なければ、あきらめて例外（第32章 5.2節）
    // schema は config.ts で英小文字・数字・_ だけに確かめてあるので、そのまま書ける
    ...(schema !== undefined ? { options: `-c search_path=${schema}` } : {}),
  });
}

/** ログに書くときのために、URL のパスワードを隠す */
export function redactUrl(url: string): string {
  return url.replace(/:[^:@/]*@/, ':***@');
}

/**
 * 追加（第7部）: データの層が使う「query を持つもの」の形。pg.Pool も、トランザクションの PoolClient も満たす（第37章 練習問題6）
 */
export interface Queryable {
  query<R extends pg.QueryResultRow = pg.QueryResultRow>(text: string, values?: unknown[]): Promise<pg.QueryResult<R>>;
}
