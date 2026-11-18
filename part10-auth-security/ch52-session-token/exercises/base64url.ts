// 第52章 練習問題2: JWT の1つ目・2つ目の部分（base64url の JSON）を作る・読む（本文6節）

/** オブジェクトを JSON にして、base64url にする */
export function encodePart(value: Record<string, unknown>): string {
  // ここを書く
  throw new Error(`まだ書いていません: ${JSON.stringify(value)}`);
}

/** encodePart の逆。読めない・オブジェクトでなければ null */
export function decodePart(text: string): Record<string, unknown> | null {
  // ここを書く
  throw new Error(`まだ書いていません: ${text}`);
}
