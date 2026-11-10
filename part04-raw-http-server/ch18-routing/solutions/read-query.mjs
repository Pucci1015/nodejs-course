// 練習問題3 の模範解答
export function readPage(value) {
  if (value === null) return 1; // 書かれていなければ既定の 1
  if (!/^[1-9]\d*$/.test(value)) return null; // 1以上の整数の形でなければ間違い
  const n = Number(value);
  return n <= 1000 ? n : null;
}

export function readSort(value) {
  if (value === null) return 'new';
  return value === 'new' || value === 'old' ? value : null;
}

export function readListQuery(searchParams) {
  const page = readPage(searchParams.get('page'));
  const sort = readSort(searchParams.get('sort'));
  const errors = [];
  if (page === null) errors.push('page は 1〜1000 の整数で指定してください');
  if (sort === null) errors.push('sort は new か old で指定してください');
  if (errors.length > 0) return { ok: false, errors };
  return { ok: true, page, sort };
}
