// 追加（第6部）: PostgreSQL の接続のプールを作る（第32章 4・5節の db.mjs と同じ考え方）
import pg from 'pg';

// date の列（due_date）は、'2026-11-12' の文字列のまま受け取る（Date にすると、日本では1日ずれる。第32章 4.2節）
pg.types.setTypeParser(pg.types.builtins.DATE, (value) => value);

/**
 * @param {{ url: string, schema?: string, max?: number }} options
 *   schema: テーブルを置くスキーマ。渡すと、このプールの SQL は、まずそのスキーマのテーブルを使う（テスト用）
 */
export function createPool({ url, schema, max = 10 }) {
  return new pg.Pool({
    connectionString: url,
    max,
    connectionTimeoutMillis: 5000, // 空きの接続を 5 秒待っても来なければ、あきらめて例外（第32章 5.2節）
    // schema は config.mjs で英小文字・数字・_ だけに確かめてあるので、そのまま書ける
    ...(schema ? { options: `-c search_path=${schema}` } : {}),
  });
}

/** ログに書くときのために、URL のパスワードを隠す */
export function redactUrl(url) {
  return url.replace(/:[^:@/]*@/, ':***@');
}
