// 第52章 練習問題2 の模範解答: JWT の1つ目・2つ目の部分（base64url の JSON）を作る・読む（本文6節）

/** オブジェクトを JSON にして、base64url にする */
export function encodePart(value: Record<string, unknown>): string {
  return Buffer.from(JSON.stringify(value)).toString('base64url');
}

/** encodePart の逆。読めない・オブジェクトでなければ null */
export function decodePart(text: string): Record<string, unknown> | null {
  // Buffer.from(…, 'base64url') は、知らない文字を黙って飛ばすので、先に文字の種類を確かめる
  if (!/^[A-Za-z0-9_-]+$/.test(text)) return null;
  // 4文字で3バイト。4で割って1余る長さは、どんなバイト列からも作られない
  if (text.length % 4 === 1) return null;
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(text, 'base64url').toString('utf8'));
  } catch {
    return null;
  }
  return isRecord(value) ? value : null;
}

/** 型ガード（第7部 第36章 3節）。配列と null も typeof は 'object' なので、別に除く */
function isRecord(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}
