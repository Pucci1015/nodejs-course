// 本のテーブル（books.mjs）に SQL を投げて、結果を表で見る道具（書き換えなくてよい）
// 使い方（exercises フォルダで）:
//   node run-query.mjs "SELECT title FROM books WHERE year > 2020"
//   node run-query.mjs select-queries.mjs unread     ← ファイルの中の unread を動かす
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { createBooksDb } from './books.mjs';

const [first, name] = process.argv.slice(2);
if (!first) {
  console.error('使い方: node run-query.mjs "SQL"  または  node run-query.mjs ファイル.mjs 名前');
  process.exit(2);
}

let sql = first;
if (first.endsWith('.mjs')) {
  const mod = await import(pathToFileURL(path.resolve(first)).href);
  sql = mod[name];
  if (typeof sql !== 'string') {
    console.error(`${first} に ${name} という名前の SQL（文字列）がありません`);
    process.exit(2);
  }
}

const db = createBooksDb();
try {
  const stmt = db.prepare(sql);
  if (/^\s*(SELECT|WITH)\b/i.test(sql)) {
    console.table(stmt.all());
  } else {
    console.log(stmt.run());
    console.log('実行した後の books:');
    console.table(db.prepare('SELECT * FROM books').all());
  }
} catch (err) {
  console.error('エラー:', err.message);
  process.exitCode = 1;
}
