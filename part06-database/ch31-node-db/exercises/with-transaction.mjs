// 第31章 4節で書く、トランザクションの関数 withTransaction の完成形
// 使い方: import { withTransaction } from './with-transaction.mjs';

// fn を1つのトランザクションの中で動かし、fn の戻り値を返す。fn が例外を投げたら、全部取り消して投げ直す
// fn は同期の関数にする（DatabaseSync は同期なので。await をはさむと、その間にほかの処理の SQL が混ざる）
export function withTransaction(db, fn) {
  if (db.isTransaction) return fn(); // もう外側のトランザクションの中なら、そこに加わる
  db.exec('BEGIN');
  try {
    const result = fn();
    db.exec('COMMIT');
    return result;
  } catch (err) {
    db.exec('ROLLBACK');
    throw err;
  }
}
