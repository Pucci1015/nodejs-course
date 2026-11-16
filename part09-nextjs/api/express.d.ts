// 追加（第7部）: このアプリが Express の Request に足す項目（第37章 5.2節の宣言のマージ）
// middleware/request-logger.ts が、どのリクエストにも最初に入れる
declare namespace Express {
  interface Request {
    /** リクエストの id（X-Request-Id） */
    id: string;
    /** このリクエストのためのロガー（reqId が付く） */
    log: import('pino').Logger;
  }
}
