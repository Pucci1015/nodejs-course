// 練習問題6の模範解答: イベントを配る「ハブ」と、SSE のルート
import { formatEvent } from './sse-format.mjs';

/**
 * @param {{ bufferSize?: number }} [options]  送り直しのために覚えておくイベントの数
 */
export function createEventHub({ bufferSize = 100 } = {}) {
  if (!Number.isInteger(bufferSize) || bufferSize < 1) throw new RangeError('bufferSize は 1 以上の整数です');
  const buffer = []; // { id, type, data }。id は 1, 2, 3, … の数（文字列で渡す）
  const listeners = new Set();
  let lastId = 0;

  return {
    /** イベントを配る。id（文字列）を返す */
    publish(type, data) {
      const e = { id: String(++lastId), type, data: typeof data === 'string' ? data : JSON.stringify(data) };
      buffer.push(e);
      if (buffer.length > bufferSize) buffer.shift(); // 追加: 古いものから捨てて、覚える量を決めた数までにする
      for (const fn of [...listeners]) fn(e); // 配っている途中で外されても困らないように、写しを回す
      return e.id;
    },

    /**
     * 受け取り始める。lastEventId があれば、その後のものを先に送り直す。
     * 送り直せない（古すぎる・知らない id）ときは、type 'reset' を1つ送る（客は全部を読み直す）
     * @returns {() => void} やめる関数
     */
    subscribe(lastEventId, listener) {
      if (lastEventId !== undefined && lastEventId !== null && lastEventId !== '') {
        const n = /^[0-9]{1,15}$/.test(String(lastEventId)) ? Number(lastEventId) : NaN;
        const oldest = buffer.length > 0 ? Number(buffer[0].id) : lastId + 1;
        // 修正: 送り直せるのは「覚えている一番古いものの1つ前」から「今」まで
        if (Number.isNaN(n) || n > lastId || n < oldest - 1) {
          listener({ id: String(lastId), type: 'reset', data: '' });
        } else {
          for (const e of buffer) if (Number(e.id) > n) listener(e);
        }
      }
      listeners.add(listener);
      return () => listeners.delete(listener); // 追加: 切れた客を外せるように
    },

    size: () => listeners.size,
    buffered: () => buffer.length,
  };
}

/**
 * GET で text/event-stream を返す Express のハンドラ
 * @param {ReturnType<typeof createEventHub>} hub
 * @param {{ heartbeatMs?: number, retryMs?: number }} [options]
 */
export function sseRoute(hub, { heartbeatMs = 15_000, retryMs = 3_000 } = {}) {
  return (req, res) => {
    res.writeHead(200, {
      'Content-Type': 'text/event-stream; charset=utf-8',
      'Cache-Control': 'no-cache',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no', // nginx に「ためずに送って」と伝える
    });
    res.write(formatEvent({ retry: retryMs }));
    // EventSource は最初の接続でヘッダを付けられないので、クエリでも受け付ける
    const last = req.get('last-event-id') ?? req.query.lastEventId;
    const unsubscribe = hub.subscribe(typeof last === 'string' ? last : undefined, (e) => res.write(formatEvent({ id: e.id, event: e.type, data: e.data })));
    // 追加: 心拍。何も送らない時間が続くと、途中のプロキシに切られる
    const timer = setInterval(() => res.write(formatEvent({ comment: 'ping' })), heartbeatMs);
    // 修正: 客が切ったら、ハブから外し、タイマーも止める（外さないと、切れた客に書き続け、覚える量がふくらむ）
    req.on('close', () => {
      clearInterval(timer);
      unsubscribe();
    });
  };
}
