// 練習問題7: タスクを SQLite のファイルに保存する CLI を作ってください。
// 要件は README にあります。
// 使い方: node todo-db.mjs add 牛乳を買う / list / done 1 / rm 1
// 確かめ方: node --test todo-db.test.mjs
import { DatabaseSync } from 'node:sqlite';

const dbFile = process.env.TODO_DB ?? 'todo.db';
const [command, arg] = process.argv.slice(2);

// ここを書く
