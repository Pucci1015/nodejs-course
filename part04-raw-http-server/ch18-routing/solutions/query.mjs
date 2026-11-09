// 練習問題5 解答例: クエリ文字列を、決めた形（スキーマ）に合わせて読む
import { HttpError } from '../../ch17-minimal-server/solutions/app.mjs';

/** クエリの間違い。400 番台の HttpError なので、createApp がメッセージを客に返す */
export class QueryError extends HttpError {
  constructor(errors) {
    super(400, errors.map((e) => e.message).join('、'));
    this.name = 'QueryError';
    this.errors = errors;
  }
}

const INT_RE = /^-?\d+$/; // Number() だと ''・' 3'・'1e3'・'0x10' も数になってしまう

function convert(key, raw, rule) {
  switch (rule.type) {
    case 'int': {
      if (!INT_RE.test(raw)) return { error: `${key} は整数で指定してください` };
      const n = Number(raw);
      if (!Number.isSafeInteger(n)) return { error: `${key} が大きすぎます` };
      if (rule.min !== undefined && n < rule.min) return { error: `${key} は ${rule.min} 以上にしてください` };
      if (rule.max !== undefined && n > rule.max) return { error: `${key} は ${rule.max} 以下にしてください` };
      return { value: n };
    }
    case 'bool':
      if (raw === 'true' || raw === '1') return { value: true };
      if (raw === 'false' || raw === '0') return { value: false };
      return { error: `${key} は true か false で指定してください` };
    case 'enum':
      if (!rule.values.includes(raw)) return { error: `${key} は ${rule.values.join('・')} のどれかにしてください` };
      return { value: raw };
    case 'string':
      // 文字の数は、絵文字なども1文字と数える
      if (rule.maxLength !== undefined && [...raw].length > rule.maxLength) {
        return { error: `${key} は ${rule.maxLength} 文字以内にしてください` };
      }
      return { value: raw };
    default:
      throw new TypeError(`知らない type です: ${rule.type}`);
  }
}

/**
 * @param {URLSearchParams} searchParams
 * @param {Record<string, object>} schema
 * @param {{ strict?: boolean }} [options]
 */
export function parseQuery(searchParams, schema, { strict = false } = {}) {
  const result = {};
  const errors = [];
  const fail = (key, message) => errors.push({ key, message });

  for (const [key, rule] of Object.entries(schema)) {
    const raws = searchParams.getAll(key);
    if (rule.multiple) {
      const values = [];
      for (const raw of raws) {
        const r = convert(key, raw, rule);
        if (r.error) fail(key, r.error);
        else values.push(r.value);
      }
      if (raws.length === 0 && rule.required) fail(key, `${key} を指定してください`);
      result[key] = raws.length === 0 && rule.default !== undefined ? rule.default : values;
      continue;
    }
    if (raws.length > 1) {
      fail(key, `${key} は1つだけ指定してください`);
      continue;
    }
    if (raws.length === 0) {
      if (rule.required) fail(key, `${key} を指定してください`);
      else if (rule.default !== undefined) result[key] = rule.default;
      continue;
    }
    const r = convert(key, raws[0], rule);
    if (r.error) fail(key, r.error);
    else result[key] = r.value;
  }

  if (strict) {
    for (const key of new Set(searchParams.keys())) {
      if (!Object.hasOwn(schema, key)) fail(key, `知らないパラメータです: ${key}`);
    }
  }
  if (errors.length > 0) throw new QueryError(errors);
  return result;
}
