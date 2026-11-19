// 第68章 練習問題2 の模範解答: 取り消せるか（canCancel の結果）を、HTTP のステータスと文にする
// switch で全部の場合を書くと、canCancel に新しい結果が増えたとき、tsc が「返していない場合がある」と教えてくれる
import { canCancel } from '../exercises/domain/booking-rules.ts';

export type CancelResult = ReturnType<typeof canCancel>;

export function cancelProblem(result: CancelResult): { status: 403 | 409; detail: string } | null {
  switch (result) {
    case 'ok':
      return null;
    case 'forbidden':
      return { status: 403, detail: '自分の予約だけを取り消せます' };
    case 'canceled':
      return { status: 409, detail: 'この予約は、もう取り消してあります' };
    case 'started':
      return { status: 409, detail: '始まった予約は取り消せません' };
  }
}
