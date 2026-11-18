// 第60章 練習問題2: 鍵を取り替えられる署名（本文6.2節）
import { createHmac, timingSafeEqual } from 'node:crypto';

/** 確かめに通ったときの結果。keyIndex は、合った鍵の位置（0 なら今の鍵、1 以上なら古い鍵） */
export type Verified = { value: string; keyIndex: number };

/** 署名の部分（HMAC-SHA256 を base64url にしたもの）を作る。使ってよい */
export function mac(value: string, key: string): string {
  return createHmac('sha256', key).update(value).digest('base64url');
}

// 使ってよい: timingSafeEqual
void timingSafeEqual;

export function sign(value: string, keys: string[]): string {
  // ここを書く
  throw new Error(`まだ書いていません: ${value} ${keys.length}`);
}

export function unsign(signed: string, keys: string[]): Verified | undefined {
  // ここを書く
  throw new Error(`まだ書いていません: ${signed} ${keys.length}`);
}

export function needsResign(signed: string, keys: string[]): boolean {
  // ここを書く
  throw new Error(`まだ書いていません: ${signed} ${keys.length}`);
}
