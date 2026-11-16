// 練習問題7: 一覧のページ分け・完了にする・題名を変える、の3つの関数を Drizzle で書いてください。
// 要件は README にあります。
// 確かめ方: node --test task-actions.test.mjs
import { and, asc, eq, gt, sql } from 'drizzle-orm';
import { tasks } from './schema.mjs';
import { PG } from './pg-errors.mjs';

// id が after より大きいタスクの { id, title } を id の順に limit 個。{ items, next }。続きがあれば next は最後の id、無ければ null
export async function listPage(db, { after = 0, limit }) {
  // ここを書く
}

// version が expectedVersion のときだけ、status を 'done' にして completedAt・updatedAt を今に、version を 1 増やす
// 変えたら { id, status, version, completedAt } を、version が違う（か、タスクが無い）なら null を返す
export async function complete(db, id, { expectedVersion }) {
  // ここを書く
}

// 題名を変える。結果は { ok: true, task: { id, title } } か { ok: false, reason: 'not-found' | 'duplicate' | 'invalid' }
export async function rename(db, id, title) {
  // ここを書く
}
