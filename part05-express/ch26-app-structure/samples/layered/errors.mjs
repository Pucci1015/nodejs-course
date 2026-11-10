// サービスの層が投げるエラー（第26章 3節）。HTTP のステータスは知らない。
// 「無い」「今の状態ではできない」「決まりに合わない」という、仕事の言葉で表す
export class NotFoundError extends Error {
  name = 'NotFoundError';
}
export class ConflictError extends Error {
  name = 'ConflictError';
}
export class ValidationError extends Error {
  name = 'ValidationError';
  /** @param {string} message @param {string} [field] 間違っている項目 */
  constructor(message, field) {
    super(message);
    this.field = field;
  }
}
