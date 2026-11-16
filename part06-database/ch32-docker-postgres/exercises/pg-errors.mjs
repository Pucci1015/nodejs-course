// 第32章 7節で書く、PostgreSQL のエラーを HTTP のステータスコードに読み替える部品の完成形
// 使い方: import { statusForPgError } from './pg-errors.mjs';

// PostgreSQL のエラーには、5 文字のエラーコード（SQLSTATE）が err.code に入っている
export const PG = {
  UNIQUE_VIOLATION: '23505',
  FOREIGN_KEY_VIOLATION: '23503',
  NOT_NULL_VIOLATION: '23502',
  CHECK_VIOLATION: '23514',
  INVALID_TEXT_REPRESENTATION: '22P02', // '2026-13-45' を date に、'abc' を integer に、など
  INVALID_DATETIME_FORMAT: '22007',
  DATETIME_FIELD_OVERFLOW: '22008',
};

// 利用者が送った値のせいで起きたエラーなら、返すべきステータスコード。それ以外は null（500 にする）
export function statusForPgError(err) {
  switch (err?.code) {
    case PG.UNIQUE_VIOLATION:
      return 409;
    case PG.FOREIGN_KEY_VIOLATION:
    case PG.NOT_NULL_VIOLATION:
    case PG.CHECK_VIOLATION:
    case PG.INVALID_TEXT_REPRESENTATION:
    case PG.INVALID_DATETIME_FORMAT:
    case PG.DATETIME_FIELD_OVERFLOW:
      return 422;
    default:
      return null;
  }
}
