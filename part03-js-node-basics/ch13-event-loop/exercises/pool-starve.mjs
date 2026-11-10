// 練習問題7 用: スレッドプールが埋まると、関係の無い処理まで待たされる
// 使い方:
//   node pool-starve.mjs                        重いハッシュの計算 4つ（既定のスレッドプールと同じ数）
//   node pool-starve.mjs 8                      重いハッシュの計算 8つ
//   UV_THREADPOOL_SIZE=8 node pool-starve.mjs 4 スレッドプールを 8 本にする
//
// ログインの処理（パスワードのハッシュを crypto.pbkdf2 で計算する）が何件か来ている最中に、
// 小さなファイルを読む・localhost の名前を引く・タイマーを待つ、の3つにかかる時間を測ります。
import crypto from 'node:crypto';
import dns from 'node:dns/promises';
import fs from 'node:fs/promises';
import { promisify } from 'node:util';

const pbkdf2 = promisify(crypto.pbkdf2);

const HASHES = Number(process.argv[2] ?? 4);
const ITERATIONS = 1_000_000; // 1回が数百 ms になる回数（Mac の速さで変わる）

const start = performance.now();
const t = () => `${String(Math.round(performance.now() - start)).padStart(5)}ms`;
const timed = async (label, fn) => {
  const s = performance.now();
  await fn();
  console.log(`${t()} ${label}: ${Math.round(performance.now() - s)}ms かかった`);
};

console.log(`UV_THREADPOOL_SIZE=${process.env.UV_THREADPOOL_SIZE ?? '（未設定 = 4）'}、ハッシュの計算 ${HASHES} 件`);

// ログインが HASHES 件、同時に来た
const hashes = Array.from({ length: HASHES }, (_, i) =>
  timed(`ハッシュ ${i + 1}`, () => pbkdf2('secret', 'salt', ITERATIONS, 64, 'sha512')),
);

// その直後に、関係の無い3つの処理
await Promise.all([
  ...hashes,
  timed('ファイルを読む（fs）', () => fs.readFile(import.meta.filename)),
  timed('名前を引く（dns.lookup）', () => dns.lookup('localhost')),
  timed('10ms のタイマー', () => new Promise((r) => setTimeout(r, 10))),
]);
