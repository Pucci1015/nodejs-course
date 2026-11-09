// 練習問題3: タスクの決まりを、HTTP からもデータの置き場所からも切り離して書く
// 要件は exercises/README.md の問題3です。確かめ方:
//   $ node --test task-service.test.mjs
// 今のひな形は、create と get だけが、決まりを確かめずに動きます。
import { ConflictError, NotFoundError, ValidationError } from './errors.mjs';

export function createTaskService({ repo, clock, maxDoing = 3, timeZone = 'Asia/Tokyo' }) {
  return {
    async list({ status } = {}) {
      return repo.list(); // ここを書く: status で絞り込み、id の順に並べる
    },

    async get(id) {
      return repo.get(id); // ここを書く: 無ければ NotFoundError
    },

    async create({ title, dueDate } = {}) {
      // ここを書く: title・dueDate の確かめ、同じ題名、時刻は clock() から
      const now = new Date().toISOString();
      return repo.insert({ title, status: 'todo', dueDate: dueDate ?? null, createdAt: now, updatedAt: now, completedAt: null, version: 1 });
    },

    async update(id, changes = {}) {
      // ここを書く
      throw new Error('まだ作っていません');
    },

    async remove(id) {
      // ここを書く
      throw new Error('まだ作っていません');
    },
  };
}

export { ConflictError, NotFoundError, ValidationError };
