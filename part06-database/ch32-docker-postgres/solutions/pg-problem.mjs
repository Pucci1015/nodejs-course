// 練習問題7 の模範解答
import pg from 'pg';
import { PG } from './pg-errors.mjs';

// 制約の名前 → 利用者に見せる文。制約の名前は、テーブルを作ったときに決まる（名前を書かなければ、表_列_check のように自動で付く）
const UNIQUE_DETAIL = {
  tasks_open_title: '同じ題名の、終わっていないタスクがあります',
};
const CHECK_DETAIL = {
  tasks_title_check: 'title は 1〜100 文字です',
  tasks_status_check: 'status は todo・doing・done のどれかです',
};

export function toProblem(err) {
  if (!(err instanceof pg.DatabaseError)) return null;
  switch (err.code) {
    case PG.UNIQUE_VIOLATION:
      return { status: 409, detail: UNIQUE_DETAIL[err.constraint] ?? 'ほかのデータとぶつかりました' };
    case PG.CHECK_VIOLATION:
      return { status: 422, detail: CHECK_DETAIL[err.constraint] ?? '送られた値が決まりに合いません' };
    case PG.NOT_NULL_VIOLATION:
      return { status: 422, detail: `${err.column} は必ず送ってください` };
    case PG.FOREIGN_KEY_VIOLATION:
      return { status: 422, detail: 'つながる先のデータがありません' };
    case PG.INVALID_TEXT_REPRESENTATION:
    case PG.INVALID_DATETIME_FORMAT:
    case PG.DATETIME_FIELD_OVERFLOW:
      return { status: 422, detail: '値の形が違います（日付は YYYY-MM-DD）' };
    default:
      return { status: 500, detail: 'サーバの中でエラーが起きました' };
  }
}
