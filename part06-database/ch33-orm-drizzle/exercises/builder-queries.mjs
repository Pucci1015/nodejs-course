// 練習問題2: 第32章の練習問題1の4つの関数を、Drizzle のクエリビルダで書き直してください。
// 要件は README にあります。SQL を文字列で書かずに（sql というタグ付きテンプレートも使わずに）書きます。
// 確かめ方: node --test builder-queries.test.mjs
import { and, asc, count, eq, ilike, lt, ne } from 'drizzle-orm';
import { tasks } from './schema.mjs';

// status が同じタスクの title の配列（id の順）
export async function findByStatus(db, status) {
  // ここを書く
}

// title に word を含むタスクの { id, title } の配列（id の順）。英字の大文字と小文字は区別しない
export async function searchTitle(db, word) {
  // ここを書く
}

// { todo: 数, doing: 数, done: 数 }。1つも無い status も 0
export async function countByStatus(db) {
  // ここを書く
}

// 終わっていなくて、due_date が date より前のタスクの title の配列（due_date の順に、limit 個まで）
export async function overdue(db, { date, limit }) {
  // ここを書く
}
