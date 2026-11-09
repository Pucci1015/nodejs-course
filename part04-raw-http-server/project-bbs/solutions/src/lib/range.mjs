// 問題4 解答例: Range ヘッダ（bytes=0-99 など）を読む
//
// 返すもの:
//   null            Range が無い、または読めない・対応しない形 → ふつうに全部（200）を返す
//   'unsatisfiable' 形は正しいが、ファイルの中に1バイトも無い範囲 → 416
//   { start, end }  返す範囲（end を含む）→ 206

const RANGE_RE = /^bytes=(\d*)-(\d*)$/;

export function parseRange(header, size) {
  if (typeof header !== 'string') return null;
  const value = header.trim();
  if (value.includes(',')) return null; // 複数の範囲（multipart/byteranges）には対応しない。全部を返してよい
  const m = RANGE_RE.exec(value);
  if (!m) return null;
  const [, a, b] = m;
  if (a === '' && b === '') return null; // "bytes=-"

  let start;
  let end;
  if (a === '') {
    // bytes=-500: 最後の 500 バイト
    const suffix = Number(b);
    if (suffix === 0) return 'unsatisfiable';
    start = Math.max(0, size - suffix);
    end = size - 1;
  } else {
    start = Number(a);
    end = b === '' ? size - 1 : Math.min(Number(b), size - 1); // ファイルより後ろを頼まれたら、最後までにする
    if (b !== '' && Number(b) < start) return null; // bytes=5-2 は形が正しくない → 無視する
  }
  if (!Number.isSafeInteger(start) || !Number.isSafeInteger(end)) return null;
  if (start >= size) return 'unsatisfiable';
  return { start, end };
}
