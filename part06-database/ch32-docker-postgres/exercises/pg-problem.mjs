// 練習問題7: PostgreSQL のエラーを、利用者に見せてよい { status, detail } に直す関数を書いてください。
// 要件は README にあります。
// 確かめ方: node --test pg-problem.test.mjs
import pg from 'pg';
import { PG } from './pg-errors.mjs';

export function toProblem(err) {
  // ここを書く（PostgreSQL のエラー（pg.DatabaseError）でなければ null）
}
