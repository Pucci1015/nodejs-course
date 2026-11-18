// 第68章 練習問題2: 取り消せるか（canCancel の結果）を、HTTP のステータスと文にする（本文 3.2節・5.2節）
import { canCancel } from './domain/booking-rules.ts';

export type CancelResult = ReturnType<typeof canCancel>;

/** 取り消せないなら { status, detail }、取り消せるなら null */
export function cancelProblem(result: CancelResult): { status: 403 | 409; detail: string } | null {
  // ここを書く
  throw new Error(`まだ書いていません（${result}）`);
}
