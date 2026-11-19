// このアプリが Express の Request に足す項目（第37章 5.2節の宣言のマージ）
// middleware/request-logger.ts が、どのリクエストにも最初に入れる
declare namespace Express {
  interface Request {
    /** リクエストの id（X-Request-Id） */
    id: string;
    /** このリクエストのためのロガー（reqId が付く） */
    log: import('pino').Logger;
    /** ログインしている人。middleware/require-user.ts が入れる（ログインが要らない道では undefined） */
    user?: { id: number; email: string | null; role: import('./repositories/pg-users.ts').Role };
  }
}
