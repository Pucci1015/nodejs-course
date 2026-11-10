// 練習問題9: ロングポーリングの「待つ」部分と、そのルート
// 要件は exercises/README.md の問題9です。確かめ方:
//   $ node --test long-poll.test.mjs
// サンプルの polling-demo.mjs と同じように動きますが、片付けを忘れています。
import { EventEmitter } from 'node:events';

export function createWaiter() {
  const bus = new EventEmitter();
  return {
    wait({ timeoutMs, signal }) {
      return new Promise((resolve) => {
        bus.once('notify', () => resolve('notified'));
        setTimeout(() => resolve('timeout'), timeoutMs);
        // ここを書く: signal、片付け
      });
    },
    notifyAll() {
      bus.emit('notify');
    },
    waiting: () => bus.listenerCount('notify'),
  };
}

export function longPollRoute({ list, waiter, timeoutMs = 25_000 }) {
  return async (req, res) => {
    const since = Number(req.query.since ?? 0);
    let items = list(since);
    if (items.length === 0) {
      await waiter.wait({ timeoutMs }); // ここを書く: 客が切ったとき、時間切れのとき
      items = list(since);
    }
    res.json({ items, last: items.at(-1)?.id ?? since });
  };
}
