// 練習問題3 の解答: this の問題を直したストップウォッチ
// 使い方: node stopwatch.mjs
// 確かめ方: cd ../exercises && MODULE=../solutions/stopwatch.mjs node --test stopwatch.test.mjs
import { EventEmitter } from 'node:events';

export class Stopwatch {
  constructor(label) {
    this.label = label;
    this.elapsed = 0; // ミリ秒
    this.laps = [];
    this.timer = null;
  }

  start() {
    if (this.timer) return;
    this.timer = setInterval(() => this.tick(), 100); // 修正: this.tick を関数として渡すと、this がタイマーのオブジェクトになる
  }

  tick() {
    this.elapsed += 100;
  }

  stop() {
    clearInterval(this.timer);
    this.timer = null;
  }

  lap() {
    this.laps.push(this.elapsed);
  }

  /** キーボードの代わりの EventEmitter の 'l' でラップ、'q' で止める */
  bindKeys(keyboard) {
    keyboard.on('l', () => this.lap()); // 修正: EventEmitter は、リスナーの this を emitter にして呼ぶ
    keyboard.on('q', () => this.stop()); // 修正
  }

  summary() {
    return this.laps.map((ms, i) => `${this.label} ${i + 1}: ${ms}ms`); // 修正: function の中の this は undefined
  }
}

// このファイルを直接実行したときだけ動かす（テストから import したときは動かさない）
// import.meta.main は Node.js 24 で追加された機能。Python の if __name__ == "__main__": にあたる
if (import.meta.main) {
  const sw = new Stopwatch('ストップウォッチ');
  const keyboard = new EventEmitter();
  sw.bindKeys(keyboard);
  sw.start();
  setTimeout(() => keyboard.emit('l'), 350);
  setTimeout(() => keyboard.emit('l'), 720);
  setTimeout(() => {
    keyboard.emit('q');
    console.log('elapsed:', sw.elapsed);
    console.log('laps:', sw.laps);
    console.log(sw.summary());
  }, 1050);
}
