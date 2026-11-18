// メールのリンクのトークン（第53章 4節の token.ts の、作る・ハッシュにする部分）
import { createHash, randomBytes } from 'node:crypto';

/** 32 バイトのランダムな値を base64url にしたもの（43 文字）。リンクに入れて、本人にだけ送る */
export const newToken = () => randomBytes(32).toString('base64url');

/** 保存するのは SHA-256 のハッシュ。データベースが漏れても、リンクは作れない */
export const hashToken = (token: string) => createHash('sha256').update(token).digest('base64url');
