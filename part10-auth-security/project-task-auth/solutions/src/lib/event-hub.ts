// 第27章 練習問題6の模範解答（ch27-realtime/solutions/event-hub.mjs）のコピー。止めるときに閉じる closeAll を足した（「追加（成果物）」）
// 変更（第7部）: TypeScript にした
// 追加（第10部）: ハブを、ログインしている人ごとに分ける（createUserHubs）。sseRoute は「リクエストからハブを選ぶ関数」も受け取る
// イベントを配る「ハブ」と、SSE のルート
import type { Request, Response } from 'express';
import { formatEvent } from './sse-format.ts';

/** 配るイベント。id は 1, 2, 3, … の数（文字列で渡す） */
export type HubEvent = { id: string; type: string; data: string };
export type Listener = (e: HubEvent) => void;

/**
 * @param options.bufferSize  送り直しのために覚えておくイベントの数
 */
export function createEventHub({ bufferSize = 100 }: { bufferSize?: number } = {}) {
  if (!Number.isInteger(bufferSize) || bufferSize < 1) throw new RangeError('bufferSize は 1 以上の整数です');
  const buffer: HubEvent[] = [];
  const listeners = new Set<Listener>();
  let lastId = 0;

  return {
    /** イベントを配る。id（文字列）を返す */
    publish(type: string, data: unknown): string {
      const e: HubEvent = { id: String(++lastId), type, data: typeof data === 'string' ? data : JSON.stringify(data) };
      buffer.push(e);
      if (buffer.length > bufferSize) buffer.shift(); // 追加: 古いものから捨てて、覚える量を決めた数までにする
      for (const fn of [...listeners]) fn(e); // 配っている途中で外されても困らないように、写しを回す
      return e.id;
    },

    /**
     * 受け取り始める。lastEventId があれば、その後のものを先に送り直す。
     * 送り直せない（古すぎる・知らない id）ときは、type 'reset' を1つ送る（客は全部を読み直す）
     * @returns やめる関数
     */
    subscribe(lastEventId: string | undefined, listener: Listener): () => void {
      if (lastEventId !== undefined && lastEventId !== '') {
        const n = /^[0-9]{1,15}$/.test(lastEventId) ? Number(lastEventId) : NaN;
        const first = buffer[0];
        const oldest = first !== undefined ? Number(first.id) : lastId + 1;
        // 修正: 送り直せるのは「覚えている一番古いものの1つ前」から「今」まで
        if (Number.isNaN(n) || n > lastId || n < oldest - 1) {
          listener({ id: String(lastId), type: 'reset', data: '' });
        } else {
          for (const e of buffer) if (Number(e.id) > n) listener(e);
        }
      }
      listeners.add(listener);
      return () => {
        listeners.delete(listener); // 追加: 切れた客を外せるように
      };
    },

    size: () => listeners.size,
    buffered: () => buffer.length,
  };
}

/** 追加（第7部）: ハブの型。createEventHub の戻り値から作る */
export type EventHub = ReturnType<typeof createEventHub>;

/**
 * 追加（第10部）: ユーザーごとのハブ。alice のタスクのイベントは、alice のハブにだけ流れる（bob には届かない）。
 * 1台のサーバのメモリに置くので、サーバが複数台なら Redis の Pub/Sub などで配る（第34章 6節）
 */
export function createUserHubs({ bufferSize = 100 }: { bufferSize?: number } = {}) {
  const hubs = new Map<number, EventHub>();
  return {
    /** その人のハブ。無ければ作る */
    for(userId: number): EventHub {
      let hub = hubs.get(userId);
      if (hub === undefined) {
        hub = createEventHub({ bufferSize });
        hubs.set(userId, hub);
      }
      return hub;
    },
    size: () => hubs.size,
  };
}

/** SSE のハンドラ。closeAll() で、つながっている全員を閉じる */
export type SseHandler = ((req: Request, res: Response) => void) & { closeAll: () => void; size: () => number };

/**
 * GET で text/event-stream を返す Express のハンドラ
 */
export function sseRoute(hubOf: EventHub | ((req: Request) => EventHub), { heartbeatMs = 15_000, retryMs = 3_000 }: { heartbeatMs?: number; retryMs?: number } = {}): SseHandler {
  const open = new Set<Response>(); // 追加（成果物）: 止めるときに閉じるため、つながっている res を覚える

  function handler(req: Request, res: Response): void {
    // 変更（第10部）: 関数を渡されたら、リクエストから（ログインしている人の）ハブを選ぶ。応答を書き始める前に選ぶ（失敗したら 500 にできるように）
    const hub = typeof hubOf === 'function' ? hubOf(req) : hubOf;
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
    // 心拍。何も送らない時間が続くと、途中のプロキシに切られる
    const timer = setInterval(() => res.write(formatEvent({ comment: 'ping' })), heartbeatMs);
    open.add(res);
    // 客が切ったら、ハブから外し、タイマーも止める（外さないと、切れた客に書き続け、覚える量がふくらむ）
    req.on('close', () => {
      clearInterval(timer);
      unsubscribe();
      open.delete(res);
    });
  }

  // 変更（第7部）: 関数に項目を足すときは Object.assign にする（足した項目にも型が付く）
  return Object.assign(handler, {
    /**
     * 追加（成果物）: 全員に shutdown のイベントを送ってから閉じる。
     * SSE の応答は終わらないので、閉じないと server.close() がいつまでも終わらない（第27章 5節）。
     * ブラウザの EventSource は、retry の時間の後に、自分でつなぎ直す（そのころには新しいサーバが起きている）
     */
    closeAll: () => {
      for (const res of open) {
        // 追加（第10部）: 書き終わったら、接続も閉じる。express-session は、セッションを保存してから応答を終えるので、
        // 応答が終わるのが server.close() の後になる。その後で空いた接続（keep-alive）は閉じられず、客が切るまで止まれない
        const socket = res.socket; // finish のときには、res から外れている
        res.once('finish', () => socket?.end());
        res.end(formatEvent({ event: 'shutdown', data: '{"reason":"server is shutting down"}' }));
      }
    },
    size: () => open.size,
  });
}
