// 第26章のサービスの層のエラー（ch26-app-structure/solutions/errors.mjs）のコピー。PreconditionFailedError を足した（「追加（成果物）」）
// 変更（第7部）: TypeScript にした
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

// 追加（成果物）: 「見ていた版（expectedVersion）と、今の版が違う」。ルートが 412 にする（第25章 7節）
export class PreconditionFailedError extends Error {
  name = 'PreconditionFailedError';
}
