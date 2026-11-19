// 練習問題6で使う、本文の src/middleware/problem.ts の HttpProblem を小さくしたもの。書き換えなくてよいファイル
/** HTTP のステータスと、利用者に見せる文を持つエラー。エラーのミドルウェアが problem+json にする */
export class HttpProblem extends Error {
  readonly status: number;
  readonly detail: string;

  constructor(status: number, detail: string) {
    super(detail);
    this.name = 'HttpProblem';
    this.status = status;
    this.detail = detail;
  }
}
