// 練習問題6: イベントを配る「ハブ」と、SSE のルート
// 要件は exercises/README.md の問題6です。確かめ方:
//   $ node --test event-hub.test.mjs
import { formatEvent } from './sse-format.mjs'; // 問題5で作ったもの（1行の data なら、ひな形のままでも動く）

export function createEventHub({ bufferSize = 100 } = {}) {
  const listeners = [];
  let lastId = 0;
  return {
    publish(type, data) {
      const e = { id: String(++lastId), type, data: typeof data === 'string' ? data : JSON.stringify(data) };
      for (const fn of listeners) fn(e);
      return e.id;
    },
    subscribe(lastEventId, listener) {
      // ここを書く: 送り直し、reset、やめる関数
      listeners.push(listener);
      return () => {};
    },
    size: () => listeners.length,
    buffered: () => 0, // ここを書く
  };
}

export function sseRoute(hub, { heartbeatMs = 15_000, retryMs = 3_000 } = {}) {
  return (req, res) => {
    res.writeHead(200, { 'Content-Type': 'text/event-stream; charset=utf-8', 'Cache-Control': 'no-cache' });
    hub.subscribe(undefined, (e) => res.write(formatEvent({ id: e.id, event: e.type, data: e.data })));
    // ここを書く: retry、Last-Event-ID、心拍、切れたときの後片付け
  };
}
