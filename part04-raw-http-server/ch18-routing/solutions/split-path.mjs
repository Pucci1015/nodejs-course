// 練習問題1 の模範解答
export function splitPath(pathname) {
  const result = [];
  for (const seg of pathname.split('/')) {
    if (seg === '') continue; // 先頭・最後・続いた / の間の空の部分は捨てる
    try {
      result.push(decodeURIComponent(seg)); // 分けてから、セグメントごとに戻す
    } catch {
      return null; // %xx の形が壊れている
    }
  }
  return result;
}
