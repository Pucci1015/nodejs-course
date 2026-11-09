// 文字列の SHA-256 を表示する（第8章 2.1節で書くものの完成形）
// 使い方: node hash.mjs 文字列 ...
import crypto from 'node:crypto';

for (const text of process.argv.slice(2)) {
  const hash = crypto.createHash('sha256').update(text).digest('hex');
  console.log(`${text} → ${hash}`);
}
