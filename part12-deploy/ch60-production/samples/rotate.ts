// 第60章 6.2節: 鍵を取り替える。新しい鍵で署名し、確かめるときは新しい鍵と古い鍵の両方を試す
// 動かし方（章のフォルダで）: node samples/rotate.ts
import { createHmac, timingSafeEqual } from 'node:crypto';

/** 値に、最初の鍵で署名を付ける（第4部 第22章の sign と同じ形: 値.署名） */
function sign(value: string, keys: string[]): string {
  const key = keys[0];
  if (key === undefined) throw new Error('鍵がありません');
  return `${value}.${createHmac('sha256', key).update(value).digest('base64url')}`;
}

/** どれかの鍵で署名が合えば、値を返す。どれでも合わなければ undefined */
function unsign(signed: string, keys: string[]): string | undefined {
  const dot = signed.lastIndexOf('.');
  if (dot < 0) return undefined;
  const value = signed.slice(0, dot);
  const given = Buffer.from(signed.slice(dot + 1));
  for (const key of keys) {
    const expected = Buffer.from(createHmac('sha256', key).update(value).digest('base64url'));
    if (expected.length === given.length && timingSafeEqual(expected, given)) return value;
  }
  return undefined;
}

const OLD = 'dev-only-old-key-0123456789abcdef0123';
const NEW = 'dev-only-new-key-0123456789abcdef0123';

const before = sign('user:42', [OLD]); // 取り替える前に配った値（ブラウザの Cookie に入っている）
console.log('取り替える前に配った値:', before);
console.log('1. 古い鍵だけ           :', unsign(before, [OLD]));
console.log('2. 新しい鍵だけ         :', unsign(before, [NEW]), '← 全員がログアウトしてしまう');
console.log('3. [新しい鍵, 古い鍵]   :', unsign(before, [NEW, OLD]), '← 古い値も読める');
const after = sign('user:42', [NEW, OLD]);
console.log('4. 取り替えた後に配る値 :', after, '（新しい鍵で署名）');
console.log('5. 古い鍵を外した後     :', unsign(after, [NEW]), '／', unsign(before, [NEW]));
