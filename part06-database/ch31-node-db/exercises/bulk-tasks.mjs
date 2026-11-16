// 練習問題6: 何件ものタスクを「全部か、何もしないか」で変える関数を2つ書いてください。
// 要件は README にあります。withTransaction（本文4節）を使います。
// 確かめ方: node --test bulk-tasks.test.mjs
import { withTransaction } from './with-transaction.mjs';

// titles の題名のタスクを全部作り、作った id の配列を返す。1つでも作れなければ、1つも作らずに例外
export function importTasks(db, titles, now) {
  // ここを書く
}

// ids のタスクを全部 done にし、変えた数を返す。無い id や、もう done のものが1つでもあれば、何も変えずに例外
export function completeMany(db, ids, now) {
  // ここを書く
}
