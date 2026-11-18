// サービスの層のエラー（第26章 3節）
// HTTP のステータスは知らない。「無い」「今の状態ではできない」「決まりに合わない」を表す
export class NotFoundError extends Error {
  name = 'NotFoundError';
}
export class ConflictError extends Error {
  name = 'ConflictError';
}
export class ValidationError extends Error {
  name = 'ValidationError';
  /** 間違っている項目の名前 */
  readonly field: string | undefined;

  constructor(message: string, field?: string) {
    super(message);
    this.field = field;
  }
}
