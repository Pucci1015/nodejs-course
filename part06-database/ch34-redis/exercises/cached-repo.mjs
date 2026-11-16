// 練習問題6: タスクのリポジトリ（第31〜33章の形）に、Redis のキャッシュをかぶせてください。
// 要件は README にあります。repo は、list・get・insert・update・remove を持つオブジェクトです（中身はテストが用意します）。
// 確かめ方: node --test cached-repo.test.mjs

export function createCachedRepo(repo, redis, { prefix = 'cache:', ttlSec = 60 } = {}) {
  const LIST_KEY = `${prefix}tasks`;
  const taskKey = (id) => `${prefix}task:${id}`;
  return {
    async list() {
      // ここを書く
    },
    async get(id) {
      // ここを書く
    },
    async insert(fields) {
      // ここを書く
    },
    async update(id, fields, options) {
      // ここを書く
    },
    async remove(id, options) {
      // ここを書く
    },
  };
}
