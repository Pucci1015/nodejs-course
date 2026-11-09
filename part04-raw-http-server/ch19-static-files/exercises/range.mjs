// 練習問題4: Range ヘッダ（bytes=0-99 など）を読む
// 仕様は README の練習問題4を見てください。
// 確かめる: node --test range.test.mjs
//
// 返すもの:
//   null            Range が無い、または読めない・対応しない形 → ふつうに全部（200）を返す
//   'unsatisfiable' 形は正しいが、ファイルの中に1バイトも無い範囲 → 416
//   { start, end }  返す範囲（end を含む）→ 206

export function parseRange(header, size) {
  // ここを書く（下は samples/range-demo.mjs と同じ、簡単な読み方です）
  const m = /^bytes=(\d+)-(\d*)$/.exec(header ?? '');
  if (!m) return null;
  const start = Number(m[1]);
  const end = m[2] === '' ? size - 1 : Number(m[2]);
  return { start, end };
}
