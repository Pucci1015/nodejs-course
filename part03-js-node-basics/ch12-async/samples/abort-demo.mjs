// 待つのをやめる: AbortController と AbortSignal（第12章 8節）
// 使い方: node abort-demo.mjs
//   同じプロセスの中で、わざと遅い HTTP サーバ（127.0.0.1:9120）を起動して、fetch を途中でやめる。
import http from 'node:http';
import { setTimeout as sleep } from 'node:timers/promises';

const server = http.createServer(async (req, res) => {
  const ms = Number(new URL(req.url, 'http://x').searchParams.get('ms') ?? 0);
  let aborted = false;
  req.on('close', () => (aborted = !res.writableEnded)); // クライアントが途中で切ったか
  await sleep(ms);
  console.log(`    [サーバ] ${req.url} の処理が終わった（クライアントは${aborted ? '切断済み' : '待っている'}）`);
  res.end(`${ms}ms 待ちました`);
});
await new Promise((resolve) => server.listen(9120, '127.0.0.1', resolve));
const base = 'http://127.0.0.1:9120';

console.log('== 1. AbortSignal.timeout: 決めた時間で fetch をやめる ==');
try {
  const res = await fetch(`${base}/?ms=100`, { signal: AbortSignal.timeout(500) });
  console.log(`  100ms のもの: ${await res.text()}`);
  await fetch(`${base}/?ms=1000`, { signal: AbortSignal.timeout(300) });
} catch (err) {
  console.log(`  1000ms のもの: ${err.name}: ${err.message}`);
}
await sleep(800); // サーバの側の処理が終わるのを見るため

console.log('\n== 2. AbortController: 自分の好きなときにやめる ==');
const controller = new AbortController();
setTimeout(() => controller.abort(new Error('利用者がキャンセルした')), 200);
try {
  await fetch(`${base}/?ms=1000`, { signal: controller.signal });
} catch (err) {
  console.log(`  ${err.name}: ${err.message}`);
}

console.log('\n== 3. 1つの signal で、いくつもの処理をまとめてやめる ==');
const all = new AbortController();
const jobs = [
  fetch(`${base}/?ms=300`, { signal: all.signal }).then((r) => r.text()),
  sleep(5000, '5秒待った', { signal: all.signal }), // timers/promises の setTimeout も signal を受け取れる
  fetch(`${base}/?ms=50`, { signal: all.signal }).then((r) => r.text()),
];
setTimeout(() => all.abort(), 150);
for (const r of await Promise.allSettled(jobs)) {
  console.log(`  ${r.status}: ${r.status === 'fulfilled' ? r.value : r.reason.name}`);
}

console.log('\n== 4. AbortSignal.any: 「キャンセル」か「タイムアウト」の早い方 ==');
const user = new AbortController();
const signal = AbortSignal.any([user.signal, AbortSignal.timeout(250)]);
try {
  await fetch(`${base}/?ms=1000`, { signal });
} catch (err) {
  console.log(`  ${err.name}（signal.reason: ${signal.reason.name}）`);
}

console.log('\n== 5. 自分の関数を signal に対応させる ==');
async function countdown(n, { signal } = {}) {
  for (let i = n; i > 0; i--) {
    signal?.throwIfAborted(); // やめる指示が出ていたら、reason を投げる
    console.log(`  ${i}…`);
    await sleep(100, undefined, { signal });
  }
  return '発射';
}
try {
  console.log(`  ${await countdown(5, { signal: AbortSignal.timeout(350) })}`);
} catch (err) {
  console.log(`  中止: ${err.name}`);
}

await sleep(1200);
server.close();
