// 練習問題6 の解答: 深い比較と、イミュータブルな更新
// 確かめ方: cd ../exercises && MODULE=../solutions/deep.mjs node --test deep.test.mjs

/** a と b が「中身として」等しいか */
export function deepEqual(a, b) {
  return equal(a, b, new Map());
}

// seen: 比べている最中のオブジェクトの組（a → b）。循環しているときに、同じ組をもう一度比べないため
function equal(a, b, seen) {
  // NaN 同士、0 と -0 を等しいとする比べ方（SameValueZero。Map や includes と同じ）
  if (a === b || (Number.isNaN(a) && Number.isNaN(b))) return true;
  if (typeof a !== 'object' || typeof b !== 'object' || a === null || b === null) return false;
  if (Object.getPrototypeOf(a) !== Object.getPrototypeOf(b)) return false; // 配列とオブジェクト、別のクラス

  if (seen.get(a) === b) return true; // この組は今比べている途中 → 違いが見つかれば、そちらで false になる
  seen.set(a, b);

  if (a instanceof Date) return a.getTime() === b.getTime();
  if (a instanceof RegExp) return a.source === b.source && a.flags === b.flags;

  if (a instanceof Map) {
    if (a.size !== b.size) return false;
    for (const [key, value] of a) {
      if (!b.has(key) || !equal(value, b.get(key), seen)) return false;
    }
    return true;
  }
  if (a instanceof Set) {
    if (a.size !== b.size) return false;
    for (const value of a) if (!b.has(value)) return false; // 中のオブジェクトは参照で比べる（簡単にするため）
    return true;
  }

  // 配列もここに来る（キーが '0', '1', ... と 'length' 以外の、自分の列挙できるキー）
  if (Array.isArray(a) && a.length !== b.length) return false;
  const keysA = Object.keys(a);
  const keysB = Object.keys(b);
  if (keysA.length !== keysB.length) return false;
  return keysA.every((key) => Object.hasOwn(b, key) && equal(a[key], b[key], seen));
}

/** obj の path の場所を value にした、新しいオブジェクトを返す（obj は変えない） */
export function setIn(obj, path, value) {
  if (path.length === 0) return value;
  const [key, ...rest] = path;
  const current = obj?.[key];
  // 途中が無ければ作る: 次のキーが数なら配列、そうでなければオブジェクト
  const child = current ?? (typeof rest[0] === 'number' ? [] : {});
  const nextChild = rest.length === 0 ? value : setIn(child, rest, value);
  if (obj != null && Object.is(current, nextChild) && Object.hasOwn(obj, key)) return obj; // 変わらないなら、そのまま返す

  const base = obj ?? (typeof key === 'number' ? [] : {});
  const copy = Array.isArray(base) ? [...base] : { ...base }; // この段だけを浅くコピーする
  copy[key] = nextChild;
  return copy;
}
