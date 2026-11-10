// 練習問題1 の模範解答
import path from 'node:path';

const TYPES = {
  '.html': 'text/html; charset=utf-8',
  '.css': 'text/css; charset=utf-8',
  '.js': 'text/javascript; charset=utf-8',
  '.json': 'application/json; charset=utf-8',
  '.txt': 'text/plain; charset=utf-8',
  '.svg': 'image/svg+xml',
  '.png': 'image/png',
  '.jpg': 'image/jpeg',
  '.jpeg': 'image/jpeg',
};

export function contentTypeOf(file) {
  const ext = path.extname(file).toLowerCase();
  return Object.hasOwn(TYPES, ext) ? TYPES[ext] : 'application/octet-stream';
}
