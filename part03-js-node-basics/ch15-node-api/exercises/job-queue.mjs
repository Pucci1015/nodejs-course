// 練習問題7: EventEmitter を継承して、進み具合をイベントで知らせる仕事の列（JobQueue）を作ってください。
// 要件は README と job-queue.test.mjs にあります。
// 確かめ方: node --test job-queue.test.mjs
import { EventEmitter } from 'node:events';

export class JobQueue extends EventEmitter {
  constructor({ concurrency = 2 } = {}) {
    super();
    // ここを書く
  }

  /** まだ始めていない仕事の数 */
  get size() {
    // ここを書く
  }

  /** 動いている仕事の数 */
  get running() {
    // ここを書く
  }

  /** 仕事を足す。仕事の結果で fulfilled（失敗なら rejected）になる Promise を返す */
  add(fn, { name = fn.name || 'job' } = {}) {
    // ここを書く
  }

  pause() {
    // ここを書く
  }

  resume() {
    // ここを書く
  }

  /** 全部終わる（待ちも動いているものも 0 になる）まで待つ */
  async onIdle() {
    // ここを書く
  }
}
