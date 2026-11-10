# 第12章 練習問題の模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。

| ファイル | 内容 |
| --- | --- |
| [timers.mjs](timers.mjs) | 問題1: `delay`・`delayFail`・`valueOr` |
| [total.mjs](total.mjs) | 問題2: 合計が 0 になるバグを直した `totalPrice` |
| [prices.mjs](prices.mjs) | 問題3: `getPricesSerial`・`getPricesParallel`・`getPricesSettled` |
| [promisify.mjs](promisify.mjs) | 問題5: `promisify` と `callbackify` |
| [batch.mjs](batch.mjs) | 問題6: バグを直した `importUsers`・`loadDashboard`・`saveAll` |
| [retry.mjs](retry.mjs) | 問題7: `retry` |
| [map-limit.mjs](map-limit.mjs) | 問題8: `mapLimit` |
| [fetch-all.mjs](fetch-all.mjs) | 問題9: 調子の悪い API からまとめて取ってくる CLI（同じフォルダの `map-limit.mjs` と `retry.mjs` を使う） |

模範解答のテストは、`~/dev/part03/ch12-async/exercises` で次のように実行できます。`MODULE=ファイル` を前に付けると、テストが読み込むファイルを、自分のものから模範解答に切り替えられます。

```sh
$ MODULE=../solutions/timers.mjs node --test timers.test.mjs
$ MODULE=../solutions/total.mjs node --test total.test.mjs
$ MODULE=../solutions/prices.mjs node --test prices.test.mjs
$ MODULE=../solutions/promisify.mjs node --test promisify.test.mjs
$ MODULE=../solutions/batch.mjs node --test batch.test.mjs
$ MODULE=../solutions/retry.mjs node --test retry.test.mjs
$ MODULE=../solutions/map-limit.mjs node --test map-limit.test.mjs
$ TARGET=../solutions/fetch-all.mjs bash check-fetch-all.sh
```

---

## 問題1 Promise を返す関数を作る

```js
export function delay(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}

export function delayFail(ms, message) {
  return new Promise((resolve, reject) => setTimeout(() => reject(new Error(message)), ms));
}

export async function valueOr(promise, fallback) {
  try {
    return await promise;
  } catch {
    return fallback;
  }
}
```

- `delay` の `return` を忘れると、関数は `undefined` を返し、テスト「delay は Promise を返す」が失敗します。
- `valueOr` で `return promise;`（`await` なし）と書くと、`try` を抜けた後で失敗するので、`catch` に来ません（本文5.2節）。`valueOr` が返す Promise がそのまま失敗し、テスト「失敗したら fallback を返す」が失敗します。
- `catch {` のように `(err)` を省くと、「エラーの中身は使わない」という意味になります。

## 問題2 合計が 0 になるバグを直す

```js
export async function totalPrice(ids, getPrice) {
  let total = 0;
  for (const id of ids) {
    const price = await getPrice(id);
    total += price;
  }
  return total;
}
```

`forEach` は、渡した `async` 関数が返す Promise を捨てて、すぐに次へ進みます（本文7.1節）。そのため `return total` の時点では、まだどの値段も届いておらず、`total` は 0 のままでした。値段は 100ms 後に足されますが、もう誰も見ていません。

さらに、`getPrice` が失敗しても `totalPrice` は失敗せず、その失敗は unhandled rejection になります（テスト「問い合わせに失敗したら」）。`for...of` と `await` なら、失敗はその場で例外になり、`totalPrice` が返す Promise の失敗として呼んだ側に届きます。

直す前のファイルでテストを動かすと、4個のうち3個が失敗します（`MODULE=./buggy-total.mjs node --test total.test.mjs`）。

> 問い合わせを同時に行うなら `Promise.all` でも直せます（問題3）。合計を出すだけなら、`const prices = await Promise.all(ids.map((id) => getPrice(id)));` の後に `reduce` で足します。

## 問題3 直列・並行・allSettled で値段を集める

```js
export async function getPricesSerial(ids, getPrice) {
  const result = [];
  for (const id of ids) {
    result.push(await getPrice(id));
  }
  return result;
}

export async function getPricesParallel(ids, getPrice) {
  return Promise.all(ids.map((id) => getPrice(id)));
}

export async function getPricesSettled(ids, getPrice) {
  const settled = await Promise.allSettled(ids.map((id) => getPrice(id)));
  const prices = {};
  const failed = [];
  settled.forEach((r, i) => {
    if (r.status === 'fulfilled') {
      prices[ids[i]] = r.value;
    } else {
      failed.push(ids[i]);
    }
  });
  return { prices, failed };
}
```

- テストの `getPrice` は、apple が 120ms、bread が 60ms、milk が 30ms かかります。直列なら 210ms、並行なら 120ms です。
- `Promise.all` の結果は、終わった順（milk、bread、apple）ではなく、**渡した配列の順**です（本文6.2節）。
- `getPricesSettled` の `forEach` は、Promise を待つ必要が無い（もう全部終わっている）ので、使って構いません。

## 問題4 表示される順番を予想する

```
$ node order.mjs
A
p1: 開始
p2: 開始
B
p2: 終了
C: race の結果は p2
p1: 終了
D: all の結果は p1,p2
F
G: for...of 30
G: for...of 10
G: for...of 20
p3: 開始
E: forEach 100
p3: 終了
H: fulfilled, rejected
E: forEach 200
E: forEach 300
```

時刻を追うと分かりやすくなります（0ms はプログラムの開始）。

| 時刻 | 表示 | 理由 |
| --- | --- | --- |
| 0ms | `A`、`p1: 開始`、`p2: 開始`、`B` | `async` 関数は、呼ばれるとすぐに**最初の `await` までを同期で**実行してから Promise を返す（本文4.2節）。だから `B` より先に「開始」が2つ出る |
| 100ms | `p2: 終了`、`C` | `race` は先に決着した方の結果になる。p1 はやめられたわけではなく、動き続けている |
| 200ms | `p1: 終了`、`D` | `Promise.all` の結果は、終わった順ではなく**渡した配列の順**（本文6.2節） |
| 200ms | `F` | `forEach` は `async` のコールバックが返す Promise を捨てるので、待たずにすぐ次へ進む（本文7.1節）。3つのタイマー（300・100・200ms後）はここで同時に始まっている |
| 230〜260ms | `G` の3行 | `for...of` と `await` は1つずつ順番に待つ。30+10+20 = 60ms かかる |
| 260ms | `p3: 開始` | |
| 300ms | `E: forEach 100` | 200ms の時点で始まった100msのタイマー。`for...of` や p3 とは無関係に進む |
| 340ms | `p3: 終了`、`H` | `allSettled` は失敗があっても全部を待ち、それぞれの状態を返す。p4 の失敗は `allSettled` が受け取っているので unhandled rejection にならない |
| 400ms、500ms | `E: forEach 200`、`E: forEach 300` | メインの処理が全部終わった後でも、タイマーが残っている間はプロセスは終わらない（第13章） |

`E` の行が「バラバラの場所」に出るのは、`forEach` の中の処理が、それ以降の `await` と**並行に**動いているからです。本当に順番に処理したいなら `for...of`、同時に処理して全部を待ちたいなら `await Promise.all(list.map(async ...))` と書きます。

## 問題5 promisify と callbackify

[promisify.mjs](promisify.mjs) を見てください。要点は次のとおりです。

- **`new Promise` の中で `fn` を呼ぶ**: `new Promise` に渡した関数の中で投げられた例外は、自動で reject になります。そのため、「`fn` が同期で例外を投げたら rejected」は、何も書かなくても満たされます
- **`resolve`・`reject` は最初の1回だけ有効**: コールバックが2回呼ばれても、2回目は無視されます。自分でフラグを持つ必要はありません
- **`function` で返す**: アロー関数では `this` を受け取れません（第11章 4節）

`callbackify` には、2つの落とし穴があります。

1. **同期で呼んではいけない**: `asyncFn` がすぐに値を返しても、`then` のコールバックはマイクロタスクで呼ばれるので、コールバックは必ず非同期になります
2. **コールバックを Promise のチェーンの中で呼んではいけない**: 次のように書くと、コールバックが投げた例外が `then` の rejected になり、2つ目の関数がコールバックを**もう一度**呼んでしまいます

   ```js
   // 間違い
   promise.then((value) => callback(null, value), (err) => callback(err));
   // callback(null, value) が投げると… → チェーンは rejected → でも、それを受け取る catch が無い → unhandled rejection
   promise.then((value) => callback(null, value)).catch((err) => callback(err));
   // callback(null, value) が投げると… → catch に届いて callback(err) が2回目の呼び出しになる
   ```

   模範解答は `queueMicrotask` でチェーンの外に出してから呼んでいます。コールバックが投げた例外は、普通の同期の例外と同じく uncaughtException になります。これは Node.js の `util.callbackify` と同じ振る舞いです。

## 問題6 非同期のバグを直す

[batch.mjs](batch.mjs) を見てください。`// 修正:` のコメントが付いた所が直した場所です。

| 関数 | バグ | なぜ間違いか |
| --- | --- | --- |
| `importUsers` | `forEach(async …)` | `forEach` は Promise を捨てる。`importUsers` は誰の保存も待たずに `{ created: 0, skipped: 0 }` を返す |
| `importUsers` | `if (db.exists(email))` | `db.exists` は Promise を返す。Promise はオブジェクトなので、いつでも truthy。全員を「いる」と判断する |
| `importUsers` | `db.save(...)` に `await` が無い | 保存の失敗を誰も受け取らず、unhandled rejection になる。件数も保存の前に数えてしまう |
| `loadDashboard` | 3つを1つずつ `await` | 互いに関係の無い待ち時間が足し算になる（60+60+60 = 180ms）。`Promise.all` なら 60ms |
| `saveAll` | `try` の中で `return db.saveMany(items)` | Promise をそのまま返すと、`try` を抜けた**後で** rejected になるので `catch` に届かない。`return await` と書く |

`importUsers` を `Promise.all(rows.map(async …))` で直すと、「rows の中の重複」のテストが失敗します。2つの行の `exists` が**両方とも先に**終わり、どちらも「まだいない」と判断して、両方が `save` するからです。第2部 第10章の練習問題8で見た「保存を待っている間に別のリクエストが割り込む」問題と同じです。

直し方は2つあります。

1. 模範解答のように `for...of` で1件ずつ処理する（簡単で確実。ただし件数が多いと遅い）
2. 先にメールアドレスで重複を取り除いてから、`mapLimit` などで並行に処理する

本物のデータベースでは、さらに別のプロセスが同時に同じメールアドレスを登録するかもしれません。最終的には、データベースの**一意制約**（第6部）で守るのが正解です。アプリの中の確認は「なるべく早く気付くため」のものです。

## 問題7 retry

[retry.mjs](retry.mjs) を見てください。`for` のループで `attempt` を数え、`try`/`catch` で失敗を受け取って、やり直すかどうかを決めます。

つまずきやすいのは、**「中止された理由」を正しく伝える**部分です。

- `node:timers/promises` の `setTimeout` や `fetch` は、signal で中止されると、`signal.reason` ではなく、`name` が `AbortError` のエラーで rejected になります
- そのため、1回の試行が時間切れになったとき、`fn` から返ってくるのは `AbortError` です。模範解答は `attemptSignal.aborted` を見て、`attemptSignal.reason`（`AbortSignal.timeout` なら `TimeoutError`）に置き換えています
- 待っている途中で全体が中止されたときも同じです。`wait` 関数の中で `signal.reason` に置き換えています
- `catch` の最初に `signal?.throwIfAborted()` を置いているのは、「全体が中止されたせいで失敗した試行」をやり直さないためです

ジッター（問題の最後の追加課題）は、`delay` を計算した後に1行足すだけです。

```js
const delay = Math.min(maxMs, baseMs * factor ** (attempt - 1));
const actual = jitter ? Math.random() * delay : delay; // 「full jitter」と呼ばれるやり方
```

## 問題8 mapLimit

[map-limit.mjs](map-limit.mjs) を見てください。

「`limit` 個ずつの組に分けて `Promise.all`」という書き方は、分かりやすいのですが不合格です。

```js
// 不合格: 組の中で一番遅いものを、組の全員が待つ
for (let i = 0; i < items.length; i += limit) {
  results.push(...(await Promise.all(items.slice(i, i + limit).map(fn))));
}
```

`[1000, 10, 10, 10, 10, 10]` を `limit: 3` で処理すると、この書き方では 1010ms かかりますが、模範解答は「空いた枠にすぐ次を入れる」ので約1000msで終わります（テスト「1つ終わったら、すぐ次を始める」）。

ほかのポイントです。

- **結果は `results[index] = value`**: `push` すると終わった順になります
- **`Promise.resolve().then(() => fn(...))`**: `fn` が async 関数でなく、同期で例外を投げても、reject として受け取れます
- **失敗したら `failed = true`**: 以降は `launch` が新しいものを始めません。すでに動いているものは止められません（止めたいなら、`fn` に signal を渡す設計にします。問題9の CLI はそうしています）
- **`signal.addEventListener('abort', …, { once: true })`**: 中止されたら、動いているものの終わりを待たずに、すぐ rejected にします

もう1つの書き方として、「`limit` 個の**作業者**を作り、それぞれが共有のキューから次の要素を取り出し続ける」形もあります。

```js
const workers = Array.from({ length: Math.min(limit, list.length) }, async () => {
  while (next < list.length && !failed) {
    const index = next++;
    results[index] = await fn(list[index], index);
  }
});
await Promise.all(workers);
```

こちらの方が短く、`p-limit` や `p-map` などのパッケージ（第14章）の中身もおおむねこの考え方です。ただ、失敗したときに他の作業者を止める処理や、`signal` への対応を足すと、長さはあまり変わりません。

## 問題9 調子の悪い API からまとめて取ってくる CLI

[fetch-all.mjs](fetch-all.mjs) を見てください。全体は次の3層になっています。

```
main         … 引数、Ctrl+C、結果の表示
└ mapLimit   … 同時に4つまで（問題8）
  └ fetchItem
    └ retry  … 5xx・時間切れ・接続失敗をやり直す（問題7）
      └ fetch … 1回の HTTP リクエスト（signal で切れる）
```

ポイントです。

- **1つの失敗で全体を止めない**: `mapLimit` は1つ失敗すると全体が rejected になります。そこで、`fetchItem` の失敗を `then` の2つ目の関数で受け取り、`{ status: 'failed', error }` という「結果」に変えています。`Promise.allSettled` と同じ考え方です。ただし、Ctrl+C の中止だけは投げ直して、全体を止めます
- **signal を一番下まで渡す**: `AbortController` の signal を `mapLimit` → `retry` → `fetch` まで渡しているので、Ctrl+C を押すと、動いている `fetch`、待っている再試行、まだ始めていない要素が、すべてすぐにやめられます（確認 14）
- **4xx はやり直さない**: `shouldRetry` で `HttpError` の 4xx を除いています。404 は何度聞いても 404 です
- **終了コード**: 失敗があれば `1`、Ctrl+C なら `130`（128 + SIGINT の番号 2。シェルの慣習）。`process.exit()` ではなく `process.exitCode` を使うのは、出力を最後まで書き出してから終わるためです（第16章で詳しく見ます）
- **標準出力と標準エラー出力を分ける**: 結果は標準出力、ログと集計は標準エラー出力です。`node fetch-all.mjs 1-30 > result.tsv` としても、ログは画面に出たまま、ファイルには結果だけが入ります

「考えてみよう」の答え: クライアントが時間切れであきらめても、サーバは3秒後に返事を書こうとします（接続が切れているので、書いた内容は捨てられます）。これが「注文する」POST なら、サーバは注文を受け付けているかもしれません。そのままやり直すと、二重に注文されるおそれがあります。POST をやり直すなら、第2部 第10章の練習問題8で作った**冪等キー**（`Idempotency-Key`）を付けて、サーバ側で「同じ注文の2回目」を見分けられるようにする必要があります。GET のように何度送っても結果が変わらないリクエストだけを、気軽にやり直してよいのです。
