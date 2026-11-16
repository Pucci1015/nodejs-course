// 第46章 練習問題1の模範解答
export function serializeForScript(data: unknown): string {
  const json = JSON.stringify(data);
  if (json === undefined) throw new TypeError('JSON にできない値です');
  // JSON の文字列の中では、< は < と同じ意味。HTML としては、ただの文字になる
  return json
    .replaceAll('<', '\\u003c')
    .replaceAll('>', '\\u003e')
    .replaceAll('&', '\\u0026')
    .replaceAll('\u2028', '\\u2028')
    .replaceAll('\u2029', '\\u2029');
}
