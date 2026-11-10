// 練習問題7 の解答: EventEmitter で、進み具合を知らせる仕事の列（JobQueue）
// 確かめ方: cd ../exercises && MODULE=../solutions/job-queue.mjs node --test job-queue.test.mjs
import { EventEmitter, once } from 'node:events';

export class JobQueue extends EventEmitter {
  #concurrency;
  #waiting = []; // まだ始めていない仕事
  #running = 0;
  #paused = false;
  #nextId = 1;

  constructor({ concurrency = 2 } = {}) {
    super(); // EventEmitter の準備（これを忘れると on や emit が使えない）
    if (!(Number.isInteger(concurrency) && concurrency >= 1)) {
      throw new RangeError(`concurrency は1以上の整数にしてください: ${concurrency}`);
    }
    this.#concurrency = concurrency;
  }

  /** まだ始めていない仕事の数 */
  get size() {
    return this.#waiting.length;
  }

  /** 動いている仕事の数 */
  get running() {
    return this.#running;
  }

  /** 仕事を足す。仕事の結果で fulfilled（失敗なら rejected）になる Promise を返す */
  add(fn, { name = fn.name || 'job' } = {}) {
    if (typeof fn !== 'function') throw new TypeError('仕事は関数で渡してください');
    return new Promise((resolve, reject) => {
      this.#waiting.push({ id: this.#nextId++, name, fn, resolve, reject });
      // 足した直後に始めず、次のマイクロタスクで始める。
      // こうすると、add した側が on('start') を付ける前に start が emit されることが無い
      queueMicrotask(() => this.#next());
    });
  }

  pause() {
    this.#paused = true;
  }

  resume() {
    this.#paused = false;
    this.#next();
  }

  /** 全部終わる（待ちも動いているものも 0 になる）まで待つ */
  async onIdle() {
    if (this.#waiting.length === 0 && this.#running === 0) return;
    await once(this, 'idle');
  }

  #next() {
    while (!this.#paused && this.#running < this.#concurrency && this.#waiting.length > 0) {
      const job = this.#waiting.shift();
      this.#running++;
      const start = performance.now();
      this.emit('start', { id: job.id, name: job.name });
      // fn が同期で投げても受け取れるように、Promise.resolve().then で包む
      Promise.resolve()
        .then(() => job.fn())
        .then(
          (result) => {
            this.emit('done', { id: job.id, name: job.name, result, ms: Math.round(performance.now() - start) });
            job.resolve(result);
          },
          (error) => {
            // 'error' ではなく 'failed' にする。'error' はリスナーが無いと例外になり、列全体が止まるため
            this.emit('failed', { id: job.id, name: job.name, error });
            job.reject(error);
          },
        )
        .finally(() => {
          this.#running--;
          if (this.#waiting.length === 0 && this.#running === 0) this.emit('idle');
          this.#next();
        });
    }
  }
}
