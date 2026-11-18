// 練習問題6で使う、Express の Request に req.user を足す宣言（本文の src/express.d.ts の一部）。書き換えなくてよいファイル
declare namespace Express {
  interface Request {
    /** ログインしている人（ログインしていなければ undefined） */
    user?: { id: number; role: import('./domain/booking-rules.ts').Role };
  }
}
