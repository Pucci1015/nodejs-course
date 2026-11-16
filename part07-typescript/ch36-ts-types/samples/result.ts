// 6節: Result 型。失敗を throw ではなく、戻り値で返す
type Result<T, E = string> = { ok: true; value: T } | { ok: false; error: E };

function parseLimit(text: string | undefined): Result<number> {
  if (text === undefined) return { ok: true, value: 20 };
  const n = Number(text);
  if (!Number.isInteger(n)) return { ok: false, error: 'limit は整数です' };
  if (n < 1 || n > 100) return { ok: false, error: 'limit は 1〜100 です' };
  return { ok: true, value: n };
}

for (const text of [undefined, '50', 'abc', '500']) {
  const r = parseLimit(text);
  // ok で絞り込むと、value か error のどちらかだけが使える
  if (r.ok) console.log(`${text} → ${r.value}`);
  else console.log(`${text} → エラー: ${r.error}`);
}
