// 練習問題3・5で使う、サービスの層のエラー（書き換えなくてよい）
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
