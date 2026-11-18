// 第65章 5.1節: 中身のハッシュを、ファイルの名前に入れる
// 動かし方（章のフォルダで）: node samples/hash-name.ts
import crypto from 'node:crypto';
import path from 'node:path';

function hashedName(fileName: string, content: string): string {
  const hash = crypto.createHash('sha256').update(content).digest('hex').slice(0, 8);
  const ext = path.extname(fileName); // '.js'
  return `${path.basename(fileName, ext)}.${hash}${ext}`;
}

console.log(hashedName('app.js', 'console.log(1);\n'));
console.log(hashedName('app.js', 'console.log(1);\n'));
console.log(hashedName('app.js', 'console.log(2);\n'));
console.log(hashedName('style.css', 'body { color: black; }\n'));
