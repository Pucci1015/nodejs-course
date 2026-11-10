// 練習問題7: クエリ文字列を、決めた形（スキーマ）に合わせて読む
// 仕様は README の練習問題7を見てください。
// 確かめる: node --test query.test.mjs
import { HttpError } from '../../ch17-minimal-server/solutions/app.mjs';

/** クエリの間違い。400 番台の HttpError なので、createApp がメッセージを客に返す */
export class QueryError extends HttpError {
  constructor(errors) {
    super(400, errors.map((e) => e.message).join('、'));
    this.name = 'QueryError';
    this.errors = errors; // [{ key, message }, ...]
  }
}

export function parseQuery(searchParams, schema, { strict = false } = {}) {
  // ここを書く（下は、よく見る書き方です。動きますが、まちがいだらけで、テストは1つも通りません）
  const result = {};
  for (const [key, rule] of Object.entries(schema)) {
    const raw = searchParams.get(key);
    if (raw === null) {
      if (rule.default !== undefined) result[key] = rule.default;
      continue;
    }
    if (rule.type === 'int') result[key] = Number(raw) || rule.default;
    else if (rule.type === 'bool') result[key] = Boolean(raw);
    else result[key] = raw;
  }
  return result;
}
