// 練習問題5 の解答: LRU（Least Recently Used）キャッシュ
// 確かめ方: cd ../exercises && MODULE=../solutions/lru.mjs node --test lru.test.mjs

export class LRUCache {
  // Map は「入れた順」を覚えている。使ったものを消して入れ直すと最後尾に移るので、
  // 先頭がいちばん長く使われていないもの、最後尾が最近使ったものになる
  #map = new Map();
  #capacity;
  #onEvict;

  constructor(capacity, { onEvict = () => {} } = {}) {
    // Number.isInteger は文字列の '2' や 1.5 で false。Infinity も false なので別に許す
    if (!(Number.isInteger(capacity) || capacity === Infinity) || capacity < 1) {
      throw new RangeError(`容量は1以上の整数にしてください: ${String(capacity)}`);
    }
    this.#capacity = capacity;
    this.#onEvict = onEvict;
  }

  get size() {
    return this.#map.size;
  }

  has(key) {
    return this.#map.has(key); // 値が undefined のときも正しく答えるため、get ではなく has を使う
  }

  peek(key) {
    return this.#map.get(key);
  }

  get(key) {
    if (!this.#map.has(key)) return undefined;
    const value = this.#map.get(key);
    this.#touch(key, value);
    return value;
  }

  set(key, value) {
    this.#touch(key, value);
    if (this.#map.size > this.#capacity) {
      const [oldestKey, oldestValue] = this.#map.entries().next().value;
      this.#map.delete(oldestKey);
      this.#onEvict(oldestKey, oldestValue);
    }
    return this;
  }

  delete(key) {
    return this.#map.delete(key);
  }

  clear() {
    this.#map.clear();
  }

  /** 最近使った順に [キー, 値] を返す */
  *[Symbol.iterator]() {
    // ジェネレータ（function*）で、値を1つずつ返す。Python の yield と同じ
    yield* [...this.#map].reverse();
  }

  *keys() {
    for (const [key] of this) yield key;
  }

  #touch(key, value) {
    this.#map.delete(key); // 消してから入れ直すと、最後尾（最近使った）に移る
    this.#map.set(key, value);
  }
}
