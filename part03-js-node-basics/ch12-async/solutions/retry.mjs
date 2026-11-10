// 練習問題7 の解答: 指数バックオフでやり直す retry
// 確かめ方: cd ../exercises && MODULE=../solutions/retry.mjs node --test retry.test.mjs
import { setTimeout as sleep } from 'node:timers/promises';

export async function retry(fn, options = {}) {
  const {
    retries = 3,
    baseMs = 100,
    factor = 2,
    maxMs = 10_000,
    timeoutMs,
    shouldRetry = () => true,
    onRetry = () => {},
    signal,
  } = options;

  for (let attempt = 1; ; attempt++) {
    signal?.throwIfAborted(); // 全体が中止されていたら、もう始めない

    // この1回だけに使う signal。「全体の中止」と「この試行の時間切れ」のどちらでも中止される
    const signals = [signal, timeoutMs === undefined ? undefined : AbortSignal.timeout(timeoutMs)];
    const attemptSignal = AbortSignal.any(signals.filter(Boolean));

    try {
      // async 関数の中の await なので、fn が同期で投げた例外もここで catch できる
      return await fn({ attempt, signal: attemptSignal });
    } catch (thrown) {
      // 全体が中止されたのなら、fn がどんな失敗を返しても、やり直さない
      signal?.throwIfAborted();
      // timers/promises の setTimeout や fetch は、中止されると「AbortError」を投げ、
      // 中止の理由（ここでは TimeoutError）は投げない。理由の方が役に立つので、置き換える
      const error = attemptSignal.aborted ? attemptSignal.reason : thrown;
      if (attempt > retries || !shouldRetry(error, attempt)) throw error;

      const delay = Math.min(maxMs, baseMs * factor ** (attempt - 1));
      onRetry({ attempt: attempt + 1, delay, error });
      await wait(delay, signal);
    }
  }
}

/** ms ミリ秒待つ。待っている途中で signal が中止されたら、すぐに signal.reason で rejected になる */
async function wait(ms, signal) {
  try {
    await sleep(ms, undefined, { signal });
  } catch (err) {
    // sleep は中止されると AbortError を投げる。呼んだ人が渡した理由で失敗させたいので置き換える
    if (signal?.aborted) throw signal.reason;
    throw err;
  }
}
