// URL のパスを、公開するフォルダのファイルのパスにすると、どうなるか（第19章 4節）
// 使い方: node traversal-demo.mjs
// サーバは使わない。届いた URL を、path.join と path.relative でどう扱うかを表にする
import path from 'node:path';

const ROOT = '/Users/alice/site/public';
const targets = [
  '/index.html',
  '/docs/',
  '/../outside.txt',
  '/..%2Foutside.txt',
  '/docs/..%2F..%2F..%2F.ssh%2Fid_ed25519',
  '/%2e%2e/outside.txt',
  '/.env',
  '/img/..%5C..%5Coutside.txt',
  '/a%00.html',
];

console.log(`公開するフォルダ: ${ROOT}\n`);
for (const t of targets) {
  // ブラウザやサーバに届く前に、URL として読まれると .. は消える（第18章3節）
  const pathname = new URL(`http://localhost${t}`).pathname;
  let decoded;
  try {
    decoded = decodeURIComponent(pathname);
  } catch (err) {
    decoded = `(${err.name})`;
  }
  const full = path.join(ROOT, decoded);
  const rel = path.relative(ROOT, full);
  const outside = rel === '..' || rel.startsWith('../') || path.isAbsolute(rel);
  console.log(JSON.stringify(t));
  console.log(`  URL の pathname : ${pathname}`);
  console.log(`  %xx を戻すと    : ${JSON.stringify(decoded)}`);
  console.log(`  path.join       : ${full}`);
  console.log(`  path.relative   : ${JSON.stringify(rel)}${outside ? '   ← 外を指している' : ''}`);
}
