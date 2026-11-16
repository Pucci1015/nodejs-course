// 練習問題2 の模範解答

export async function cached(redis, key, ttlSec, loader) {
  const hit = await redis.get(key);
  if (hit !== null) return JSON.parse(hit);
  // loader が例外を投げたら、そのまま呼んだ側へ（キャッシュには何も入れない）
  const value = await loader();
  // undefined は JSON にできない（JSON.stringify(undefined) は undefined）ので、入れずに返す
  if (value !== undefined) await redis.setEx(key, ttlSec, JSON.stringify(value));
  return value;
}
