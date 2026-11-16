// 練習問題1 の模範解答

export async function setJson(redis, key, value, ttlSec) {
  const json = JSON.stringify(value);
  if (ttlSec === undefined) await redis.set(key, json);
  else await redis.setEx(key, ttlSec, json);
}

export async function getJson(redis, key) {
  const json = await redis.get(key);
  // 無いキーは null。null を入れた（"null" という文字列がある）ときと区別するため、無いときは undefined にする
  return json === null ? undefined : JSON.parse(json);
}

export async function countUp(redis, key) {
  // incr は number で返る（get で読むと文字列）
  return redis.incr(key);
}

export async function secondsLeft(redis, key) {
  // TTL は、期限なしなら -1、キーが無ければ -2 を返す
  const ttl = await redis.ttl(key);
  if (ttl === -2) return null;
  if (ttl === -1) return Infinity;
  return ttl;
}
