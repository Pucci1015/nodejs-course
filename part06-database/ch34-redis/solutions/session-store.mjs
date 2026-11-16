// 練習問題5 の模範解答
import crypto from 'node:crypto';

export function createSessionStore(redis, { ttlSec = 1800, prefix = 'sess:' } = {}) {
  const key = (id) => prefix + id;
  const isId = (id) => typeof id === 'string' && id !== '';
  return {
    async create(data) {
      const id = crypto.randomBytes(32).toString('base64url');
      await redis.setEx(key(id), ttlSec, JSON.stringify(data));
      return id;
    },
    async get(id) {
      if (!isId(id)) return null;
      // GET と EXPIRE を続けて送る。無いキーへの EXPIRE は何もしない（0 を返す）
      const [json] = await redis.multi().get(key(id)).expire(key(id), ttlSec).exec();
      return json === null ? null : JSON.parse(json);
    },
    async save(id, data) {
      if (!isId(id)) return false;
      // condition: 'XX' は「もうあるときだけ」。消えた（ログアウトした）セッションを、うっかり作り直さない
      const result = await redis.set(key(id), JSON.stringify(data), { condition: 'XX', expiration: { type: 'EX', value: ttlSec } });
      return result === 'OK';
    },
    async destroy(id) {
      if (isId(id)) await redis.del(key(id));
    },
    async regenerate(id) {
      const data = await this.get(id);
      if (data === null) return null;
      const newId = await this.create(data);
      await this.destroy(id);
      return newId;
    },
  };
}
