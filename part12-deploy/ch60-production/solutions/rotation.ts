// 第60章 練習問題2の模範解答: 鍵を取り替えられる署名（本文6.2節）
import { createHmac, timingSafeEqual } from 'node:crypto';

/** 確かめに通ったときの結果。keyIndex は、合った鍵の位置（0 なら今の鍵、1 以上なら古い鍵） */
export type Verified = { value: string; keyIndex: number };

/** 署名の部分（HMAC-SHA256 を base64url にしたもの）を作る。使ってよい */
export function mac(value: string, key: string): string {
  return createHmac('sha256', key).update(value).digest('base64url');
}

export function sign(value: string, keys: string[]): string {
  const key = keys[0];
  if (key === undefined) throw new Error('鍵がありません');
  return `${value}.${mac(value, key)}`;
}

export function unsign(signed: string, keys: string[]): Verified | undefined {
  const dot = signed.lastIndexOf('.');
  if (dot < 0) return undefined;
  const value = signed.slice(0, dot);
  const given = Buffer.from(signed.slice(dot + 1));
  // 合った鍵の位置を返すために、for … of ではなく entries() で番号も取る
  for (const [keyIndex, key] of keys.entries()) {
    const expected = Buffer.from(mac(value, key));
    // 長さが違うと timingSafeEqual は例外を投げるので、先に比べる（長さは秘密ではない）
    if (expected.length === given.length && timingSafeEqual(expected, given)) return { value, keyIndex };
  }
  return undefined;
}

export function needsResign(signed: string, keys: string[]): boolean {
  const r = unsign(signed, keys);
  return r !== undefined && r.keyIndex > 0;
}
