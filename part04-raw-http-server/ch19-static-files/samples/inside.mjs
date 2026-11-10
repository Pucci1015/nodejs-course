// 第19章 4.2節で書く、URL のパスが公開するフォルダの中を指すかを調べるプログラムの完成形（サーバは起動しない）
// 使い方（~/dev/part04/ch19-static-files で）: node samples/inside.mjs
import path from 'node:path';

const ROOT = path.resolve('samples/public'); // 今いるフォルダから見た samples/public の、/ から始まるパス

function toFile(pathname) {
  const decoded = decodeURIComponent(pathname); // %xx を戻すのは1回だけ
  const full = path.join(ROOT, decoded);
  const rel = path.relative(ROOT, full); // ROOT から full への道順
  const outside = rel === '..' || rel.startsWith('..' + path.sep) || path.isAbsolute(rel);
  return { full, rel, outside };
}

console.log('公開するフォルダ:', ROOT);
for (const p of ['/hello.txt', '/docs/guide.html', '/..%2Foutside.txt', '/img/..%2F..%2F..%2Foutside.txt']) {
  const { full, rel, outside } = toFile(p);
  console.log(p);
  console.log('  path.join    :', full);
  console.log('  path.relative:', JSON.stringify(rel), outside ? '← 外を指している' : '');
}
