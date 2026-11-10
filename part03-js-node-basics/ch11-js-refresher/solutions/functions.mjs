// 練習問題8 の解答: クロージャを使った関数の部品
// 確かめ方: cd ../exercises && MODULE=../solutions/functions.mjs node --test functions.test.mjs

/** 1回だけ実行する関数を返す。2回目以降は、1回目の結果を返す */
export function once(fn) {
  let done = false; // 「呼んだか」は結果とは別に持つ（結果が undefined のこともあるため）
  let result;
  return function (...args) {
    // アロー関数ではなく function にする: 呼ばれたときの this を受け取って、fn に渡すため
    if (!done) {
      result = fn.apply(this, args); // 例外が出たら、done を true にする前に抜ける → 次も試す
      done = true;
    }
    return result;
  };
}

/** 結果を覚えておく関数を返す。maxSize を超えたら、いちばん古く使われたものから捨てる */
export function memoize(fn, { key = (...args) => JSON.stringify(args), maxSize = Infinity } = {}) {
  // Map は入れた順番を保つ。「使ったら一度消して入れ直す」と、先頭がいちばん古く使われたものになる
  const cache = new Map();
  function memoized(...args) {
    const k = key(...args);
    if (cache.has(k)) {
      const value = cache.get(k);
      cache.delete(k);
      cache.set(k, value); // 最後尾へ移す（最近使った）
      return value;
    }
    const value = fn.apply(this, args); // 例外なら cache に入らない
    cache.set(k, value);
    if (cache.size > maxSize) cache.delete(cache.keys().next().value); // 先頭（いちばん古い）を捨てる
    return value;
  }
  memoized.clear = () => cache.clear();
  return memoized;
}

/** 最後に呼ばれてから ms たったら、最後の引数で1回だけ fn を呼ぶ関数を返す */
export function debounce(fn, ms) {
  let timer = null;
  let pending = null; // { thisArg, args }

  function run() {
    const { thisArg, args } = pending;
    pending = null;
    timer = null;
    fn.apply(thisArg, args);
  }

  function debounced(...args) {
    pending = { thisArg: this, args };
    clearTimeout(timer); // 前の予約を取り消して、予約し直す
    timer = setTimeout(run, ms);
  }
  debounced.cancel = () => {
    clearTimeout(timer);
    timer = null;
    pending = null;
  };
  debounced.flush = () => {
    if (!pending) return;
    clearTimeout(timer);
    run();
  };
  return debounced;
}

/** 関数を左から順につなげた関数を返す */
export function pipe(...fns) {
  for (const f of fns) {
    if (typeof f !== 'function') throw new TypeError(`pipe には関数を渡してください: ${String(f)}`);
  }
  if (fns.length === 0) return (x) => x;
  const [first, ...rest] = fns;
  return (...args) => rest.reduce((value, f) => f(value), first(...args));
}
