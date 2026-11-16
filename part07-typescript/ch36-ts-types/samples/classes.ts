// 8節: クラスと型。#private・implements・エラーのクラス
interface Counter {
  increment(): number;
  readonly value: number;
}

class MemoryCounter implements Counter {
  #count = 0; // # で始まる項目は、クラスの外から読めない（JavaScript の機能）

  increment(): number {
    this.#count += 1;
    return this.#count;
  }

  get value(): number {
    return this.#count;
  }
}

const c = new MemoryCounter();
c.increment();
c.increment();
console.log(c.value);

// エラーのクラス。項目の型を書き、constructor で入れる
class NotFoundError extends Error {
  readonly status = 404;
  readonly resource: string;

  constructor(resource: string, options?: ErrorOptions) {
    super(`${resource} が見つかりません`, options);
    this.name = 'NotFoundError';
    this.resource = resource;
  }
}

try {
  throw new NotFoundError('タスク 9', { cause: new Error('行がありません') });
} catch (err) {
  // catch の err は unknown。instanceof で絞り込んでから使う
  if (err instanceof NotFoundError) console.log(err.status, err.message, err.resource, err.cause instanceof Error);
}
