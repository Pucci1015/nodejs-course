// 練習問題2 の解答: promisify と callbackify を自分で作る
// 確かめ方: cd ../exercises && MODULE=../solutions/promisify.mjs node --test promisify.test.mjs

/** エラーファーストのコールバックの関数を、Promise を返す関数にする */
export function promisify(fn) {
  if (typeof fn !== 'function') throw new TypeError(`関数を渡してください: ${String(fn)}`);
  return function (...args) {
    // this を受け取るため function で書く
    return new Promise((resolve, reject) => {
      // resolve と reject は最初の1回だけが有効なので、コールバックが2回呼ばれても安全
      // new Promise に渡した関数の中で投げた例外は、自動で reject になる
      fn.call(this, ...args, (err, value) => (err ? reject(err) : resolve(value)));
    });
  };
}

/** Promise を返す関数を、エラーファーストのコールバックの関数にする */
export function callbackify(asyncFn) {
  if (typeof asyncFn !== 'function') throw new TypeError(`関数を渡してください: ${String(asyncFn)}`);
  return function (...args) {
    const callback = args.pop();
    // Promise.resolve().then(...) で包むと、asyncFn が同期で例外を投げても reject として扱える
    Promise.resolve()
      .then(() => asyncFn.apply(this, args))
      .then(
        (value) => queueMicrotask(() => callback(null, value)),
        (err) => queueMicrotask(() => callback(err ?? new Error('理由の無い失敗'))),
      );
    // queueMicrotask で、Promise のチェーンの「外」でコールバックを呼ぶ。
    // チェーンの中で呼ぶと、コールバックが投げた例外が次の then の reject になり、
    // コールバックがもう一度 err 付きで呼ばれたり、unhandled rejection になったりする
  };
}
