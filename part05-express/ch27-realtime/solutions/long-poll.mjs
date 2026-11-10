// 練習問題9の模範解答: ロングポーリングの「待つ」部分と、そのルート

/** 新しいものが来るまで待つ人たちを覚えておき、来たら全員を起こす */
export function createWaiter() {
  const waiting = new Set(); // 修正: EventEmitter の listener ではなく Set。外し忘れが見つけやすく、上限の警告も出ない

  return {
    /**
     * @param {{ timeoutMs: number, signal?: AbortSignal }} options
     * @returns {Promise<'notified' | 'timeout' | 'aborted'>}
     */
    wait({ timeoutMs, signal }) {
      return new Promise((resolve) => {
        if (signal?.aborted) return resolve('aborted');
        // 追加: どの終わり方でも、必ず全部を片付ける
        const done = (why) => {
          clearTimeout(timer);
          signal?.removeEventListener('abort', onAbort);
          waiting.delete(entry);
          resolve(why);
        };
        const entry = () => done('notified');
        const onAbort = () => done('aborted');
        const timer = setTimeout(() => done('timeout'), timeoutMs);
        signal?.addEventListener('abort', onAbort, { once: true });
        waiting.add(entry);
      });
    },
    notifyAll() {
      for (const fn of [...waiting]) fn();
    },
    waiting: () => waiting.size,
  };
}

/**
 * GET /events?since=N のハンドラ。新しいものがあればすぐ、無ければ来るまで待って返す
 * @param {{ list: (since: number) => object[], waiter: ReturnType<typeof createWaiter>, timeoutMs?: number }} deps
 */
export function longPollRoute({ list, waiter, timeoutMs = 25_000 }) {
  return async (req, res) => {
    const raw = String(req.query.since ?? '0');
    if (!/^[0-9]{1,15}$/.test(raw)) return res.status(400).json({ error: 'since は 0 以上の整数です' }); // 追加
    const since = Number(raw);
    let items = list(since);
    if (items.length === 0) {
      // 修正: 客が先に切ったら、待つのをやめる（AbortController で、waiter から外す）
      const ac = new AbortController();
      const onClose = () => ac.abort();
      res.once('close', onClose);
      const why = await waiter.wait({ timeoutMs, signal: ac.signal });
      res.off('close', onClose);
      if (why === 'aborted') return; // 送る相手がいない
      if (why === 'timeout') return res.sendStatus(204); // 修正: 何も来なければ 204。客はすぐに聞き直す
      items = list(since);
    }
    res.set('Cache-Control', 'no-store').json({ items, last: items.at(-1)?.id ?? since });
  };
}
