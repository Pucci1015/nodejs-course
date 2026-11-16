// 練習問題7 の模範解答
import { SQLITE } from './sqlite-errors.mjs';

// NOT NULL のエラーの文 'NOT NULL constraint failed: tasks.title' から、列の名前を取り出す
const NOT_NULL_COLUMN = /NOT NULL constraint failed: \w+\.(\w+)/;

export function toProblem(err) {
  if (err?.code !== 'ERR_SQLITE_ERROR') return null;
  const msg = err.message;
  switch (err.errcode) {
    case SQLITE.CONSTRAINT_UNIQUE:
      if (msg.includes('tasks.title')) return { status: 409, detail: '同じ題名の、終わっていないタスクがあります' };
      return { status: 409, detail: 'ほかのデータとぶつかりました' };
    case SQLITE.CONSTRAINT_PRIMARYKEY:
      return { status: 409, detail: 'ほかのデータとぶつかりました' };
    case SQLITE.CONSTRAINT_FOREIGNKEY:
      return { status: 422, detail: 'つながる先のデータがありません' };
    case SQLITE.CONSTRAINT_CHECK:
      if (msg.includes('length(title)')) return { status: 422, detail: 'title は 1〜100 文字です' };
      if (msg.includes('status IN')) return { status: 422, detail: 'status は todo・doing・done のどれかです' };
      return { status: 422, detail: '送られた値が決まりに合いません' };
    case SQLITE.CONSTRAINT_NOTNULL: {
      const m = NOT_NULL_COLUMN.exec(msg);
      return { status: 422, detail: m ? `${m[1]} は必ず送ってください` : '送られていない値があります' };
    }
    default:
      // SQL の書き間違いなど。中身は利用者に見せず、500 にする
      return { status: 500, detail: 'サーバの中でエラーが起きました' };
  }
}
