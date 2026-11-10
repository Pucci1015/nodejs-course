// 練習問題2 の模範解答
import { EventEmitter } from 'node:events';

export class StepCounter extends EventEmitter {
  #value = 0;
  #limit;

  constructor(limit) {
    super(); // 継承元（EventEmitter）の constructor を先に呼ぶ
    this.#limit = limit;
  }

  get value() {
    return this.#value;
  }

  increment() {
    this.#value++;
    this.emit('change', this.#value);
    if (this.#value === this.#limit) {
      this.emit('limit', this.#value);
    }
    return this.#value;
  }

  reset() {
    const before = this.#value;
    this.#value = 0;
    this.emit('reset', before);
  }
}
