#!/usr/bin/env node
// 練習問題6: 調子の悪い API から、たくさんの商品をまとめて取ってくる CLI を完成させてください。
// 要件は README にあります。練習問題3の mapLimit と、練習問題4の retry を使います。
// 使い方（先に別のターミナルで node flaky-server.mjs を起動しておく）:
//   node fetch-all.mjs 1-30
// 確かめ方: ./check-fetch-all.sh
import { parseArgs } from 'node:util';
import { mapLimit } from './map-limit.mjs'; // 練習問題3
import { retry } from './retry.mjs'; // 練習問題4

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

/**
 * 1つの商品を取ってくる。
 * - 成功したら { item, attempts }、404 なら { item: null, attempts } を返す
 * - 5xx・時間切れ・接続の失敗は、retry でやり直す（4xx はやり直さない）
 * - やり直しても失敗したら、「HTTP 503（4回試した）」のようなメッセージのエラーで rejected になる
 * - signal が中止されたら、動いているリクエストもやめる
 */
async function fetchItem(base, id, opts, signal) {
  // ここを書く
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
  const start = performance.now();

  // ここを書く
  //   1. Ctrl+C（SIGINT）で全体をやめられるように、AbortController を用意する
  //   2. mapLimit で、同時に opts.limit 個まで fetchItem を動かす。
  //      1つの失敗で全体を止めないよう、各要素の結果は次の形にそろえる:
  //        { id, status: 'ok', item, attempts } / { id, status: 'not-found', attempts } / { id, status: 'failed', error }
  //   3. Ctrl+C で中止されたら、メッセージを標準エラー出力に出し、終了コードを 130 にする
  let results = [];

  // 結果は、終わった順ではなく、指定した id の順に出す
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
