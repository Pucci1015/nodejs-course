// そのほかの便利な標準 API: util・os・crypto（第15章 8節）
// 使い方: node util-demo.mjs
import crypto from 'node:crypto';
import os from 'node:os';
import util from 'node:util';

// util.inspect: console.log が中で使っている「オブジェクトを文字列にする」関数
const nested = { a: { b: { c: { d: { e: 1 } } } }, list: Array.from({ length: 120 }, (_, i) => i) };
console.log('1. 既定（深さ 2 まで、配列は 100 個まで）:', util.inspect(nested).slice(0, 60), '…');
console.log('   depth: Infinity:', util.inspect(nested.a, { depth: Infinity }));

// util.styleText: 端末の文字に色を付ける（NO_COLOR などは第16章）
console.log('2.', util.styleText('green', '成功'), util.styleText(['bold', 'red'], '失敗'));

// util.types / util.isDeepStrictEqual
console.log('3. isDeepStrictEqual({a:[1]}, {a:[1]}):', util.isDeepStrictEqual({ a: [1] }, { a: [1] }));

// os: 動いているコンピュータの情報
console.log('4. os:', {
  platform: os.platform(), // Mac なら 'darwin'
  arch: os.arch(), // Apple Silicon なら 'arm64'
  cpus: os.availableParallelism(),
  totalMemGiB: Math.round(os.totalmem() / 1024 ** 3),
  homedir: os.homedir().replace(/[^/]+$/, '…'),
  EOL: JSON.stringify(os.EOL),
});

// crypto: 推測されない乱数、ハッシュ
console.log('5. randomUUID():', crypto.randomUUID());
console.log('   randomBytes(16) を base64url で:', crypto.randomBytes(16).toString('base64url'));
console.log('   sha256("hello"):', crypto.createHash('sha256').update('hello').digest('hex'));
console.log('   Math.random() は推測できるので、ID や トークンには使わない:', Math.random());
