// 問題6 解答例: 受け取った JSON を、安全に混ぜる・選ぶ
import { HttpError } from '../../ch17-minimal-server/solutions/app.mjs';

// オブジェクトの仕組みに関わる名前。受け取ったデータに入っていたら断る
const FORBIDDEN = new Set(['__proto__', 'constructor', 'prototype']);

const isPlainObject = (v) => v !== null && typeof v === 'object' && !Array.isArray(v);

/**
 * JSON Merge Patch（RFC 7396）の決まりで、target に patch を混ぜた「新しい」オブジェクトを返す。
 * - patch の値がオブジェクトなら、中まで混ぜる
 * - null なら、そのキーを消す
 * - それ以外（配列も）は、置き換える
 */
export function safeMerge(target, patch, { maxDepth = 10 } = {}) {
  function merge(t, p, depth) {
    if (!isPlainObject(p)) return structuredClone(p); // 配列や値は、そのまま置き換える（コピーして）
    if (depth > maxDepth) throw new HttpError(400, `入れ子が深すぎます（${maxDepth} 段まで）`);
    const result = {};
    // 元の値をコピーする（target は書き換えない）
    if (isPlainObject(t)) {
      for (const key of Object.keys(t)) result[key] = t[key];
    }
    for (const key of Object.keys(p)) {
      if (FORBIDDEN.has(key)) throw new HttpError(400, `使えないキーです: ${key}`);
      const value = p[key];
      if (value === null) {
        delete result[key];
      } else {
        // Object.hasOwn で、自分のキーだけを見る（プロトタイプの先のものを拾わない）
        const current = Object.hasOwn(result, key) ? result[key] : undefined;
        // defineProperty で入れると、どんな名前でも「ふつうのキー」として入る
        Object.defineProperty(result, key, { value: merge(current, value, depth + 1), enumerable: true, writable: true, configurable: true });
      }
    }
    return result;
  }
  return merge(target, patch, 1);
}

/** 決めたキーだけを取り出す。自分のキー（hasOwn）だけ。受け取ったデータに余計なものが入っていても無視する */
export function pick(obj, keys) {
  const result = {};
  if (!isPlainObject(obj)) return result;
  for (const key of keys) {
    if (Object.hasOwn(obj, key)) result[key] = obj[key];
  }
  return result;
}
