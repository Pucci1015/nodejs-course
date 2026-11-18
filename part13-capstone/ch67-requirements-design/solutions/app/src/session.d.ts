// express-session の req.session に入れる値の型（宣言のマージ。第52章 2節）
import 'express-session';

declare module 'express-session' {
  interface SessionData {
    /** ログインしている人のユーザーの id */
    userId: number;
    /** 練習用の IdP でログインを始めてから、戻ってくるまでの間だけ覚える値（第54章 5節） */
    oidc: { state: string; nonce: string; verifier: string };
  }
}
