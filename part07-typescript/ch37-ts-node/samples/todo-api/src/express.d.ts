// 5.2節: Express の Request に、このアプリが足す項目を書く（宣言のマージ）
// .d.ts は「型だけを書くファイル」。動かすときには読まれない
declare namespace Express {
  interface Request {
    /** requestId のミドルウェアが付ける、リクエストごとの ID */
    id: string;
  }
}
