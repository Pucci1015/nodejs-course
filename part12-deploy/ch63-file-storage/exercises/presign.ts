// 第63章 練習問題5: 署名付き URL（GET）を作る関数（本文 4.2節の sign-by-hand.ts を関数にする）
import { createHash, createHmac } from 'node:crypto';

export type PresignInput = {
  /** 'http://127.0.0.1:9800' のような、ストレージの入口 */
  endpoint: string;
  bucket: string;
  key: string;
  region: string;
  accessKeyId: string;
  secretAccessKey: string;
  /** 使える秒数（1〜604800） */
  expiresIn: number;
  /** 署名する時刻 */
  now: Date;
  /** あれば、response-content-disposition を attachment; filename*=UTF-8''… にする */
  downloadName?: string;
};

export function presignGetUrl(input: PresignInput): string {
  // ここを書く
  throw new Error(`まだ書いていません（${typeof input} ${typeof createHash} ${typeof createHmac}）`);
}
