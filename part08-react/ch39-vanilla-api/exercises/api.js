// 第39章 練習問題3: API を呼ぶ関数をまとめる（本文3・5・6節）

export class ApiError extends Error {
  constructor(status, problem) {
    super('まだ書いていません');
  }
}

/**
 * @param {string} base  'http://127.0.0.1:9500' のような、API のオリジン
 * @param {typeof fetch} fetchFn  テストでは偽物を渡す
 */
export function createApi(base, fetchFn = fetch) {
  return {
    async list() {
      throw new Error('まだ書いていません');
    },
    async create(input) {
      throw new Error('まだ書いていません');
    },
    async update(task, changes) {
      throw new Error('まだ書いていません');
    },
    async remove(task) {
      throw new Error('まだ書いていません');
    },
  };
}
