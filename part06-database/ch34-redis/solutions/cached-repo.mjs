// 練習問題6 の模範解答

export function createCachedRepo(repo, redis, { prefix = 'cache:', ttlSec = 60 } = {}) {
  const LIST_KEY = `${prefix}tasks`;
  const taskKey = (id) => `${prefix}task:${id}`;

  // 読む: キャッシュにあればそれ、無ければ load() を呼んで入れる（null は入れない）
  async function read(key, load) {
    const hit = await redis.get(key);
    if (hit !== null) return JSON.parse(hit);
    const value = await load();
    if (value !== null) await redis.setEx(key, ttlSec, JSON.stringify(value));
    return value;
  }

  return {
    list: () => read(LIST_KEY, () => repo.list()),
    get: (id) => read(taskKey(id), () => repo.get(id)),

    async insert(fields) {
      const task = await repo.insert(fields);
      // 一覧が変わったので、一覧のキャッシュを消す（次に読んだ人が、新しいもので作り直す）
      await redis.del(LIST_KEY);
      return task;
    },

    async update(id, fields, options) {
      const task = await repo.update(id, fields, options);
      // 変わったときだけ消す。先にデータベースを変え、その後でキャッシュを消す
      if (task !== null) await redis.del([LIST_KEY, taskKey(id)]);
      return task;
    },

    async remove(id, options) {
      const removed = await repo.remove(id, options);
      if (removed) await redis.del([LIST_KEY, taskKey(id)]);
      return removed;
    },
  };
}
