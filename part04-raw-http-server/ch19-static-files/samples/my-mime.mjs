// 第19章 3.1節で書く、拡張子から Content-Type を決めるプログラムの完成形（サーバは起動しない）
// 使い方（~/dev/part04/ch19-static-files で）: node samples/my-mime.mjs
import path from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.png': 'image/png',
};

function contentType(file) {
  const ext = path.extname(file).toLowerCase(); // '.PNG' → '.png'
  return TYPES[ext] ?? 'application/octet-stream'; // 知らないものは「ただのバイト列」
}

for (const file of ['index.html', 'style.css', 'LOGO.PNG', 'notes.md', 'Makefile']) {
  console.log(file.padEnd(12), path.extname(file).padEnd(6), contentType(file));
}
