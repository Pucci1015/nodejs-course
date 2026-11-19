// 本文で書いた src/errors.ts のコピー（練習問題で使う。書き換えなくてよいファイル）
// サービスの層のエラー（第26章 3節）
// HTTP のステータスは知らない。「無い」「今の状態ではできない」「決まりに合わない」「その人にはできない」を表す
// どのステータスにするかは middleware/domain-errors.ts が決める
export class NotFoundError extends Error {
  name = 'NotFoundError';
}
export class ConflictError extends Error {
  name = 'ConflictError';
}
/** その人には許されていない（本人でも管理者でもない、など） */
export class ForbiddenError extends Error {
  name = 'ForbiddenError';
}

/** 決まりに合わないところ（field は入力の名前） */
export type Issue = { field?: string | undefined; message: string };

export class ValidationError extends Error {
  name = 'ValidationError';
  /** 合わないところ。1つ以上 */
  readonly issues: Issue[];

  /** 1つなら (message, field)。いくつもあれば (message, undefined, issues) */
  constructor(message: string, field?: string, issues?: Issue[]) {
    super(message);
    this.issues = issues ?? [{ field, message }];
  }
}
