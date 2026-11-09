// 練習問題1: パスの組み立ての結果を予想する
// 公開するフォルダを /srv/site/public として、実行する前に 12 個の結果を予想して書き出してから: node predict-paths.mjs
import path from 'node:path';

const ROOT = '/srv/site/public';
const pathnameOf = (target) => new URL(`http://localhost${target}`).pathname;

const items = [
  () => path.join(ROOT, '/index.html'),
  () => path.join(ROOT, '../secret'),
  () => path.join(ROOT, decodeURIComponent(pathnameOf('/../a'))),
  () => path.join(ROOT, decodeURIComponent(pathnameOf('/..%2Fa'))),
  () => path.relative(ROOT, '/srv/site/a'),
  () => path.relative(ROOT, '/srv/site/public/docs/a'),
  () => '/srv/site/public-old/a'.startsWith(ROOT),
  () => '/srv/site/public-old/a'.startsWith(ROOT + path.sep),
  () => path.resolve(ROOT, '/etc/passwd'),
  () => path.join(ROOT, '/etc/passwd'),
  () => decodeURIComponent('%252e%252e%252f'),
  () => decodeURIComponent(decodeURIComponent('%252e%252e%252f')),
];

items.forEach((f, i) => console.log(`${String(i + 1).padStart(2)}: ${JSON.stringify(f())}`));
