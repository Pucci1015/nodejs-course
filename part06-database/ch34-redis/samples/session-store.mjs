// 第34章 5.1節で書く、セッションを Redis に置く部品の完成形（第22章 4節の Map の代わり）
// 使い方: import { createSessionStore } from './session-store.mjs';  const store = createSessionStore(redis, { ttlSec: 1800 });
import crypto from 'node:crypto';

export function createSessionStore(redis, { ttlSec = 1800, prefix = 'sess:' } = {}) {
  const key = (id) => prefix + id;
  return {
    // 新しいセッションを作り、推測できない ID を返す（第22章 4.1節と同じ作り方）
    async create(data) {
      const id = crypto.randomBytes(32).toString('base64url');
      await redis.setEx(key(id), ttlSec, JSON.stringify(data));
      return id;
    },
    // 無い・期限切れなら null
    async get(id) {
      if (typeof id !== 'string' || id === '') return null;
      const json = await redis.get(key(id));
      return json === null ? null : JSON.parse(json);
    },
    async destroy(id) {
      if (typeof id === 'string' && id !== '') await redis.del(key(id));
    },
  };
}
