#!/usr/bin/env node
// 練習問題9 の解答: 調子の悪い API から、たくさんの商品をまとめて取ってくる CLI
// 使い方（先に別のターミナルで ../exercises/flaky-server.mjs を起動しておく）:
//   node fetch-all.mjs 1-30
//   node fetch-all.mjs --limit 2 --timeout 300 1 2 3 7 13
// 確かめ方: cd ../exercises && TARGET=../solutions/fetch-all.mjs ./check-fetch-all.sh
import { parseArgs } from 'node:util';
import { mapLimit } from './map-limit.mjs'; // 練習問題8
import { retry } from './retry.mjs'; // 練習問題7

/** HTTP のステータスを持ったエラー。やり直すかどうかの判断に使う */
class HttpError extends Error {
  constructor(status) {
    super(`HTTP ${status}`);
    this.name = 'HttpError';
    this.status = status;
  }
}

/** "1-5" や "7" を [1, 2, 3, 4, 5] や [7] にする */
function parseIds(args) {
  return args.flatMap((arg) => {
    const m = arg.match(/^(\d+)(?:-(\d+))?$/);
    if (!m) throw new Error(`id の書き方が正しくありません: ${arg}`);
    const from = Number(m[1]);
    const to = Number(m[2] ?? m[1]);
    return Array.from({ length: to - from + 1 }, (_, i) => from + i);
  });
}

/** 1つの商品を取ってくる。404 なら null を返す */
async function fetchItem(base, id, opts, signal) {
  let attempts = 0;
  const item = await retry(
    async ({ signal: attemptSignal }) => {
      attempts++;
      // fetch に signal を渡すと、時間切れや Ctrl+C で接続を切ってくれる
      const res = await fetch(new URL(`/items/${id}`, base), { signal: attemptSignal });
      if (res.status === 404) return null;
      if (!res.ok) throw new HttpError(res.status);
      return res.json();
    },
    {
      retries: opts.retries,
      baseMs: 100,
      timeoutMs: opts.timeout,
      signal,
      // 4xx はやり直しても結果が変わらない。5xx・時間切れ・接続の失敗だけやり直す
      shouldRetry: (err) => !(err instanceof HttpError && err.status < 500),
      onRetry: ({ attempt, delay, error }) => {
        console.error(`再試行: ${id}（${attempt}回目を ${delay}ms 後に） ${describe(error)}`);
      },
    },
  ).catch((error) => {
    // ここで投げ直すエラーに、何回試したかを付ける（cause に元のエラーを入れる）
    throw Object.assign(new Error(`${describe(error)}（${attempts}回試した）`, { cause: error }), { id });
  });
  return { item, attempts };
}

function describe(err) {
  if (err?.name === 'TimeoutError') return '時間切れ';
  if (err instanceof HttpError) return err.message;
  return err?.cause?.code ?? err?.message ?? String(err); // fetch の接続失敗は cause.code に ECONNREFUSED など
}

async function main() {
  const { values, positionals } = parseArgs({
    allowPositionals: true,
    options: {
      base: { type: 'string', default: 'http://127.0.0.1:9121' },
      limit: { type: 'string', default: '4' },
      timeout: { type: 'string', default: '500' },
      retries: { type: 'string', default: '3' },
    },
  });
  const ids = parseIds(positionals);
  if (ids.length === 0) {
    console.error('使い方: node fetch-all.mjs [--base URL] [--limit N] [--timeout ms] [--retries N] <id|from-to>...');
    process.exitCode = 2;
    return;
  }
  const opts = { limit: Number(values.limit), timeout: Number(values.timeout), retries: Number(values.retries) };

  // Ctrl+C（SIGINT）で、動いているリクエストも、待っている再試行も、まとめてやめる
  const controller = new AbortController();
  process.once('SIGINT', () => controller.abort(new Error('Ctrl+C で中止しました')));

  const start = performance.now();
  let results;
  try {
    results = await mapLimit(
      ids,
      opts.limit,
      // 1つの失敗で全体を止めたくないので、失敗も「結果」として返す（Promise.allSettled と同じ考え方）
      (id) =>
        fetchItem(values.base, id, opts, controller.signal).then(
          ({ item, attempts }) => ({ id, status: item ? 'ok' : 'not-found', item, attempts }),
          (error) => {
            if (controller.signal.aborted) throw controller.signal.reason; // 中止だけは全体を止める
            return { id, status: 'failed', error };
          },
        ),
      { signal: controller.signal },
    );
  } catch (err) {
    if (!controller.signal.aborted) throw err;
    console.error(err.message);
    process.exitCode = 130; // シェルの慣習: 128 + シグナル番号（SIGINT は 2）
    return;
  }

  // 結果は、終わった順ではなく、指定した id の順に出す（mapLimit がそう返す）
  for (const r of results) {
    if (r.status === 'ok') console.log(`${r.id}\tok\t${r.item.title}`);
    else if (r.status === 'not-found') console.log(`${r.id}\tnot-found`);
    else console.log(`${r.id}\tfailed\t${r.error.message}`);
  }
  const count = (s) => results.filter((r) => r.status === s).length;
  const ms = Math.round(performance.now() - start);
  console.error(`成功 ${count('ok')} / 見つからない ${count('not-found')} / 失敗 ${count('failed')}（${ms}ms）`);
  if (count('failed') > 0) process.exitCode = 1;
}

await main();
