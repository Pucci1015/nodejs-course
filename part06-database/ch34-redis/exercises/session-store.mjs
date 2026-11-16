// 練習問題5: 本文5.1節の createSessionStore に、使うたびに期限を延ばす仕組みと、save・regenerate を足してください。
// 要件は README にあります。
// 確かめ方: node --test session-store.test.mjs
import crypto from 'node:crypto';

export function createSessionStore(redis, { ttlSec = 1800, prefix = 'sess:' } = {}) {
  const key = (id) => prefix + id;
  const isId = (id) => typeof id === 'string' && id !== '';
  return {
    // 新しいセッションを作り、推測できない ID を返す
    async create(data) {
      // ここを書く
    },
    // 中身を返す。無い・期限切れなら null。あったら、期限を ttlSec 秒に戻す
    async get(id) {
      // ここを書く
    },
    // あるセッションの中身を data に置き換え、期限を ttlSec 秒に戻して true。無ければ何もせず false
    async save(id, data) {
      // ここを書く
    },
    async destroy(id) {
      // ここを書く
    },
    // 中身はそのままで、新しい ID に移す。新しい ID を返す。古い ID は使えなくなる。無ければ null
    async regenerate(id) {
      // ここを書く
    },
  };
}
