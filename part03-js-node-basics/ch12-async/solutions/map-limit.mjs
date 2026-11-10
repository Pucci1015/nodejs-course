// 練習問題8 の解答: 同時に動かす数を制限して、すべての要素に非同期の関数を適用する
// 確かめ方: cd ../exercises && MODULE=../solutions/map-limit.mjs node --test map-limit.test.mjs

export async function mapLimit(items, limit, fn, { signal } = {}) {
  if (!(Number.isInteger(limit) || limit === Infinity) || limit < 1) {
    throw new RangeError(`limit は1以上の整数か Infinity にしてください: ${String(limit)}`); // async 関数なので rejected になる
  }
  signal?.throwIfAborted();

  const list = [...items]; // Set やジェネレータも配列にする（長さと位置が必要なため）
  const results = new Array(list.length);
  let next = 0; // 次に始める要素の位置
  let failed = false;

  return new Promise((resolve, reject) => {
    let running = 0;
    let done = 0;

    const fail = (err) => {
      if (failed) return;
      failed = true; // これ以降、新しい要素を始めない
      reject(err);
    };
    signal?.addEventListener('abort', () => fail(signal.reason), { once: true });

    // 「空いている枠があって、まだ始めていない要素があれば始める」を繰り返す
    const launch = () => {
      if (done === list.length) return resolve(results);
      while (!failed && running < limit && next < list.length) {
        const index = next++;
        running++;
        // Promise.resolve().then で包むと、fn が同期で投げた例外も reject として受け取れる
        Promise.resolve()
          .then(() => fn(list[index], index))
          .then(
            (value) => {
              results[index] = value; // 終わった順ではなく、元の位置に入れる
              running--;
              done++;
              launch(); // 1つ空いたので、すぐ次を始める
            },
            fail,
          );
      }
    };
    launch();
  });
}
