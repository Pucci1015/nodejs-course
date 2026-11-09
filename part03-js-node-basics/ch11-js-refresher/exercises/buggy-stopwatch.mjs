// 練習問題3 用: this の扱いに問題があるストップウォッチ
// 使い方: node buggy-stopwatch.mjs      （1秒ほど動かして、結果を表示する）
//   このファイルをコピーして stopwatch.mjs を作り、直してから node --test stopwatch.test.mjs で確かめる。
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
    this.timer = setInterval(this.tick, 100);
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
    keyboard.on('l', this.lap);
    keyboard.on('q', this.stop);
  }

  summary() {
    return this.laps.map(function (ms, i) {
      return `${this.label} ${i + 1}: ${ms}ms`;
    });
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
