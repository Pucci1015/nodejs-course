// EventEmitter: 「何かが起きたら知らせる」仕組み（第15章 5節）
// 使い方: node events-demo.mjs
import { EventEmitter, once, on } from 'node:events';

class Download extends EventEmitter {
  start() {
    let received = 0;
    const timer = setInterval(() => {
      received += 25;
      this.emit('progress', received); // 登録された関数を、登録した順に、同期で呼ぶ
      if (received >= 100) {
        clearInterval(timer);
        this.emit('done', { bytes: received });
      }
    }, 10);
    return this;
  }
}

// 1. on で登録、emit で呼ぶ
const d = new Download();
d.on('progress', (n) => console.log(`1. progress ${n}%`));
d.once('done', (info) => console.log('1. done（once は1回だけ）', info));
d.start();

// 2. events.once: イベントを1回 Promise で待つ
const [info] = await once(new Download().start(), 'done');
console.log('2. await once(emitter, "done") →', info);

// 3. emit は同期。登録した関数が終わるまで、emit の次の行に進まない
const e = new EventEmitter();
e.on('x', () => console.log('3. リスナーの中'));
console.log('3. emit の前');
e.emit('x');
console.log('3. emit の後');

// 4. 'error' イベントは特別: リスナーが無いと、例外として投げられる
try {
  new EventEmitter().emit('error', new Error('誰も聞いていないエラー'));
} catch (err) {
  console.log('4. error のリスナーが無いと throw される:', err.message);
}

// 5. リスナーを付けすぎると警告（メモリリークの疑い）。既定は 10 個まで
const leaky = new EventEmitter();
process.once('warning', (w) => console.log('5. 警告:', w.name));
for (let i = 0; i < 11; i++) leaky.on('data', () => {});
await new Promise((r) => setImmediate(r)); // 警告は非同期に出る

// 6. events.on: イベントを for await で順に受け取る。signal で止める
const ticker = new EventEmitter();
const controller = new AbortController();
let n = 0;
const timer = setInterval(() => ticker.emit('tick', ++n), 5);
try {
  for await (const [value] of on(ticker, 'tick', { signal: controller.signal })) {
    console.log('6. for await で受け取った tick', value);
    if (value === 3) controller.abort();
  }
} catch (err) {
  console.log('6. signal で止めた:', err.name);
}
clearInterval(timer);
