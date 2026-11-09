// 練習問題3・5の模範解答で使う、サービスの層のエラー（exercises/errors.mjs と同じもの）
// HTTP のステータスは知らない。「無い」「今の状態ではできない」「決まりに合わない」を表す
export class NotFoundError extends Error {
  name = 'NotFoundError';
}
export class ConflictError extends Error {
  name = 'ConflictError';
}
export class ValidationError extends Error {
  name = 'ValidationError';
  /** @param {string} message @param {string} [field] 間違っている項目の名前 */
  constructor(message, field) {
    super(message);
    this.field = field;
  }
}
