// 第31章 6節で書く、SQLite の制約のエラーを、HTTP のステータスコードに読み替える部品の完成形
// 使い方: import { statusForDbError } from './sqlite-errors.mjs';

// node:sqlite のエラーは err.code が 'ERR_SQLITE_ERROR'。どの制約かは err.errcode（SQLite の拡張エラーコード）で分かる
export const SQLITE = {
  CONSTRAINT_CHECK: 275,
  CONSTRAINT_FOREIGNKEY: 787,
  CONSTRAINT_NOTNULL: 1299,
  CONSTRAINT_PRIMARYKEY: 1555,
  CONSTRAINT_UNIQUE: 2067,
};

// 制約のエラーなら、返すべきステータスコード。それ以外（SQL の書き間違い・接続の失敗など）は null（500 にする）
export function statusForDbError(err) {
  if (err?.code !== 'ERR_SQLITE_ERROR') return null;
  switch (err.errcode) {
    case SQLITE.CONSTRAINT_UNIQUE:
    case SQLITE.CONSTRAINT_PRIMARYKEY:
      return 409; // ほかのデータとぶつかった
    case SQLITE.CONSTRAINT_CHECK:
    case SQLITE.CONSTRAINT_NOTNULL:
    case SQLITE.CONSTRAINT_FOREIGNKEY:
      return 422; // 送られた値が決まりに合わない
    default:
      return null;
  }
}
