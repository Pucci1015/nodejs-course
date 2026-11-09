# 第12章 非同期処理

Node.js のプログラムは、ファイルを読む、データベースに問い合わせる、別のサーバに HTTP のリクエストを送る、といった**待ち時間のある処理**だらけです。Node.js では、待っている間にプログラムを止めず、終わったら続きを実行する**非同期**の書き方をします。
この章では、非同期の書き方が「コールバック → Promise → async/await」と移り変わった理由をたどり、失敗の扱い、複数の処理を同時に待つ方法、待つのをやめる方法までを身につけます。第2部 第10章の練習問題で見た「1つのリクエストの例外でサーバが止まる」「待っている間に別のリクエストが割り込む」問題を、async/await で書いたときにどうなるかも、ここで分かります。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 4〜5時間 |
| 前提 | 第11章（関数、クロージャ、エラー処理） |
| この章のゴール | コールバック・Promise・async/await の関係を説明できる / 失敗を取りこぼさずに受け取れる / 直列と並行を使い分け、時間を見積もれる / `Promise.all`・`allSettled`・`race`・`any` を使い分けられる / ループの中の `await` の落とし穴を避けられる / `AbortSignal` で待つのをやめられる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | コールバックと Promise の比較、Promise の基本、直列と並行の時間、unhandled rejection、forEach の落とし穴、AbortController |
| [exercises/](exercises/) | 練習問題 |
| [solutions/](solutions/) | 模範解答 |

> 時間の表示（`300ms` など）は、この教材の作成時に Node.js 26 で実行したものです。数ミリ秒の違いは毎回出ます。

---

## 1. なぜ非同期なのか

### 1.1 待ち時間の長さ

コンピュータの中の処理の速さを比べると、「待つ」ことの重さが分かります（数字はおおよその桁です）。

| 処理 | かかる時間の目安 |
| --- | --- |
| 変数の足し算 | 1ナノ秒より短い |
| メモリから読む | 100ナノ秒 |
| SSD から 4KB を読む | 数十〜100マイクロ秒 |
| 同じ Mac の中の HTTP のやり取り（第2部） | 0.1〜1ミリ秒 |
| 日本国内のサーバとの往復 | 10〜30ミリ秒 |
| 海外のサーバとの往復 | 100〜300ミリ秒 |

足し算1回を1秒に引き伸ばすと、海外のサーバとの往復は**数年**にあたります。その間、プログラムが何もせずに待っているのはもったいない、というのが非同期の出発点です。

### 1.2 Node.js と Flask の違い

Flask（WSGI）では、1つのリクエストを1つの**スレッド**（またはプロセス）が担当します。データベースの結果を待っている間、そのスレッドは止まっていますが、他のリクエストは別のスレッドが処理します。

Node.js は、JavaScript を実行するスレッドが**1つだけ**です。そこで、待ち時間のある処理は「始めるだけ」にして、終わったら知らせてもらい、その間に他のリクエストの処理を進めます。

```js
const text = fs.readFileSync('big.txt', 'utf8'); // 同期: 読み終わるまで、このスレッドは何もできない
fs.readFile('big.txt', 'utf8', (err, text) => { ... }); // 非同期: 読み始めるだけで、すぐ次の行へ進む
```

サーバで同期の関数を使うと、1人のリクエストのためにファイルを読んでいる間、**他のすべての利用者が待たされます**。この仕組み（イベントループ）は第13章で詳しく見ます。この章では、非同期の処理をどう**書く**かに集中します。

## 2. コールバック

### 2.1 エラーファーストのコールバック

Node.js の古い API は、最後の引数に**コールバック**（終わったら呼んでもらう関数）を渡します。コールバックは `(err, 結果)` の順で呼ばれます（**エラーファースト**）。

```sh
$ node samples/callback-demo.mjs
1. readFile を2つ呼ぶ（結果はまだ来ない）
2. readFile の次の行（ファイルを待たずに先へ進む）。(A) と (B) は、終わった順に表示される
(B) 無いファイル: ENOENT
(A) 読み終わった: 64 行
3. コールバック版: 2680 バイト
4. async/await 版: 2680 バイト
```

- `readFile` を呼んだ直後の行（2）が、結果（A・B）より先に表示されます。
- 先に呼んだ (A) より、後に呼んだ (B) が先に終わりました。**非同期の処理は、呼んだ順に終わるとは限りません**。
- 失敗しても例外は投げられず、`err` に入ってきます。`if (err)` を書き忘れると、失敗に気付けません。

### 2.2 コールバック地獄

処理をつなげるたびに、コールバックの中にコールバックを書くことになります。

```js
fs.readFile(src, 'utf8', (err, text) => {
  if (err) return done(err);
  fs.mkdir(work, { recursive: true }, (err) => {
    if (err) return done(err);
    fs.writeFile(dest, text.toUpperCase(), (err) => {
      if (err) return done(err);
      fs.stat(dest, (err, stat) => {
        if (err) return done(err);
        done(null, stat.size);
      });
    });
  });
});
```

右へ右へと深くなり（**コールバック地獄**）、すべての段で `if (err) return done(err)` を書く必要があります。さらに、「コールバックを2回呼んでしまう」「1回も呼ばない」というバグも起きやすい形です。

## 3. Promise

### 3.1 後で結果が入る箱

**Promise** は、「まだ終わっていない処理の結果」を表すオブジェクトです。3つの状態のどれかにあります。

| 状態 | 意味 |
| --- | --- |
| pending（待機中） | まだ終わっていない |
| fulfilled（成功） | 値が入った |
| rejected（失敗） | エラーが入った |

一度 fulfilled か rejected になったら、もう変わりません。

```sh
$ node samples/promise-demo.mjs
== 1. Promise は「後で結果が入る箱」==
作った直後: Promise { <pending> }
待った後:   Promise { '結果' }
```

### 3.2 then と catch

```js
delay(10, 'こんにちは')
  .then((text) => text.length)          // 値を返す → 次の then に渡る
  .then((n) => delay(10, n * 2))        // Promise を返す → それが終わるのを待ってから次へ
  .catch((err) => '代わりの値')          // どこかで失敗したら、ここまで飛ぶ
  .finally(() => console.log('後片付け'));
```

```
== 3. 失敗は catch まで飛ぶ（途中の then は飛ばされる）==
  catch: ネットワークが切れた
  その後の then: 代わりの値
  finally: 成功でも失敗でも実行
```

`then` は**新しい Promise を返す**ので、つなげて書けます。コールバック地獄の入れ子が、縦の1列になります。エラーは途中の `then` を飛ばして `catch` まで届くので、エラーの処理を1か所にまとめられます。

### 3.3 Promise を作る

```js
function delay(ms, value) {
  return new Promise((resolve) => setTimeout(() => resolve(value), ms));
}
```

`new Promise` に渡す関数は、`resolve`（成功させる）と `reject`（失敗させる）を受け取ります。この関数は**すぐに**（同期的に）実行され、`resolve` や `reject` は**最初の1回だけ**が有効です（2回呼んでも無視されるので、コールバックの「2回呼ぶ」バグが起きません）。

コールバックの関数は、`util.promisify` で Promise を返す関数に変えられます。`fs` のように、`fs/promises`（`fs.promises`）として最初から Promise 版が用意されているものもあります（第15章）。

```js
import { promisify } from 'node:util';
const readFile = promisify(fs.readFile);
```

### 3.4 then のコールバックは、いつ呼ばれるか

```
== 5. new Promise の中の同期の処理は、すぐに実行される ==
  (1) new Promise の前
  (2) new Promise に渡した関数の中（すぐ実行される）
  (3) new Promise の後
  (4) then の中: 済み（すでに resolve 済みでも、次の機会まで待つ）
```

Promise がすでに成功していても、`then` のコールバックは**今実行しているコードが終わってから**呼ばれます。これは「コールバックが、あるときは同期で、あるときは非同期で呼ばれる」ことによる混乱を防ぐための決まりです。この「次の機会」が何なのか（マイクロタスク）は、第13章で説明します。

## 4. async / await

### 4.1 同期のように書ける

**`async` 関数**の中では、**`await`** で Promise の結果を待てます。

```js
async function copyUpperCaseAsync(src, dest) {
  const text = await readFile(src, 'utf8');
  await fs.promises.mkdir(work, { recursive: true });
  await fs.promises.writeFile(dest, text.toUpperCase());
  const stat = await fs.promises.stat(dest);
  return stat.size;
}
```

2.2節のコールバック地獄と同じ処理が、上から下へ読めるようになりました。`await` は「この Promise が終わるまで、**この関数の続き**を後回しにする」という意味で、スレッドを止めるわけではありません。待っている間、Node.js は他の処理を進めます。

### 4.2 async 関数は必ず Promise を返す

```
== 4. async 関数は、必ず Promise を返す ==
  getUser(1) の戻り値: Promise { <pending> }
  await した値: { id: 1, name: 'ryota' }
  try/catch で受け取れる: RangeError: id が正しくありません: 0
```

| async 関数の中で | 返した Promise は |
| --- | --- |
| `return 値` | その値で fulfilled |
| `throw err`（または、`await` した Promise が失敗） | `err` で rejected |

`await` した Promise が失敗すると、その場所で例外が投げられたのと同じになり、**ふつうの `try`/`catch` で受け取れます**。

### 4.3 トップレベル await

ES Modules（`.mjs`）では、関数の外でも `await` を使えます（**トップレベル await**）。この章のサンプルは、これを使っています。CommonJS（第14章）では使えません。

## 5. 失敗を取りこぼさない

### 5.1 unhandled rejection

失敗した Promise を、誰も `catch` も `await` もしないと、**unhandled rejection**（処理されなかった失敗）になります。今の Node.js は、**既定でプロセスを終了します**。

```sh
$ node samples/unhandled-demo.mjs 1
saveLog を呼ぶ（await しない）
file:///.../unhandled-demo.mjs:8
...
Error: ログの保存に失敗: ログイン
    at Timeout._onTimeout (...)

Node.js v26.13.0
$ echo $?
1
```

100ミリ秒後に表示するはずだった「この行は表示されるか？」は表示されませんでした。サーバなら、1つのリクエストの中で await し忘れた1行のせいで、**サーバ全体が止まります**（第2部 第10章の練習問題6で、存在しない番号で例外を起こしてサーバが止まったのと同じ結果です）。

> Node.js 14 までは、警告を表示するだけで動き続けていました（15 から終了するように変わりました）。古い記事の説明と動きが違うことがあるので、注意してください。

### 5.2 よくある取りこぼし

```js
try {
  saveLog('ログイン');   // await が無い → try を抜けた後で失敗する
} catch (err) {
  // ここには来ない
}
```

`try`/`catch` が受け取れるのは、`try` の中で**同期的に投げられた例外**と、**`await` した Promise の失敗**だけです。`await` を書き忘れると、失敗は `try` の外で起きます（`node samples/unhandled-demo.mjs 2`）。

| 書き方 | 失敗を受け取れるか |
| --- | --- |
| `await saveLog()` を `try` の中で | 受け取れる |
| `saveLog().catch((err) => ...)` | 受け取れる |
| `saveLog()` だけ | 受け取れない（unhandled rejection） |
| `const p = saveLog();` → 後で `p.catch(...)` | 失敗した時点で `catch` が無いと、間に合わない（`node samples/unhandled-demo.mjs 3`） |
| `return saveLog()`（async 関数の中で） | 呼んだ側が await すれば受け取れる |

「結果を待たなくてよい処理」（ログを送る、通知を出す）でも、**失敗を受け取る `catch` は必ず付けます**。typescript-eslint の `no-floating-promises` というルール（第7部・第11部）を使うと、await し忘れを自動で見つけられます。

### 5.3 最後の砦

```js
process.on('unhandledRejection', (reason) => {
  console.error('[unhandledRejection]', reason);
  process.exitCode = 1;
});
```

`unhandledRejection` のイベントでログを残せます（`node samples/unhandled-demo.mjs 4`）。ただし、ここに来た時点で「どこかの処理が途中で失敗したまま」なので、**動き続けるのは危険**です。本番では、ログを送ってからプロセスを終了し、プロセスを管理する仕組み（第12部）に再起動させるのが一般的です。これは**取りこぼしを直すための記録**であって、エラーを処理する場所ではありません。

## 6. 順番に待つか、同時に待つか

### 6.1 直列と並行

```sh
$ node samples/timing-demo.mjs
== 1. 順番に await（直列）: 時間は足し算 ==
  ユーザー の結果、タスク の結果、通知 の結果  → 602ms

== 2. 先に全部始めてから待つ（並行）: 時間はいちばん長いもの ==
  ユーザー の結果、タスク の結果、通知 の結果  → 300ms
```

3つの処理（300ms・200ms・100ms）を順番に `await` すると、合わせて600msかかります。**互いに関係の無い処理**なら、全部を先に始めてから待てば、いちばん長い300msで済みます。

```js
// 直列: 1つ目が終わってから2つ目を始める
const user = await getUser();
const tasks = await getTasks();

// 並行: 両方を始めてから、両方を待つ
const [user, tasks] = await Promise.all([getUser(), getTasks()]);
```

ただし、**2つ目が1つ目の結果を使う**（ユーザーの ID でタスクを取る）なら、直列にするしかありません。

Promise は**作った時点で処理が始まっています**。`await` は「結果を待つ」だけで、「始める」わけではありません（`timing-demo.mjs` の6）。

### 6.2 Promise の組み合わせ方

| 関数 | 結果 | 使いどころ |
| --- | --- | --- |
| `Promise.all(ps)` | すべて成功したら、結果の配列（**渡した順**）。1つでも失敗したら、**すぐに**その失敗 | すべて必要なもの（画面の表示に必要なデータ） |
| `Promise.allSettled(ps)` | すべて終わったら、`{ status, value }` か `{ status, reason }` の配列 | 一部が失敗してもよいもの（100件の通知を送って、失敗を数える） |
| `Promise.race(ps)` | 最初に**終わった**もの（成功でも失敗でも） | タイムアウト（ただし今は 8節の `AbortSignal` を使う） |
| `Promise.any(ps)` | 最初に**成功した**もの。全部失敗したら `AggregateError` | 複数のミラーのどれかから取れればよいとき |

```
== 3. Promise.all は、1つでも失敗するとすぐに失敗する ==
  タスク は失敗  → 101ms（他の処理の終わりを待たない）
```

`Promise.all` が失敗で終わっても、**他の処理が取り消されるわけではありません**。ユーザーと通知の処理は、裏で最後まで動いています。本当にやめさせるには、8節の `AbortSignal` を使います。

## 7. ループと非同期

### 7.1 forEach は await を待たない

```sh
$ node samples/foreach-demo.mjs
== 1. forEach に async 関数を渡す ==
  forEach の直後: []（forEach は Promise を待たない）
  400ms 後: ["タスク1","タスク2","タスク3"]（終わった順に入る）
```

`forEach` は、渡された関数が返した Promise を**捨てます**。そのため、`forEach` の直後にはまだ何も終わっておらず、結果の順番も終わった順になり、途中の失敗は unhandled rejection になります。`map`・`filter`・`reduce` なども、同じく Promise を待ちません。

```
== 4. filter に async 関数を渡す ==
  filter(async): [3,1,2]（Promise はオブジェクトなので、常に truthy）
```

### 7.2 正しい書き方

| 目的 | 書き方 | 時間 |
| --- | --- | --- |
| 1つずつ順番に（前の結果を使う、相手に負荷をかけない） | `for (const id of ids) { await f(id); }` | 足し算（602ms） |
| すべて同時に | `await Promise.all(ids.map((id) => f(id)))` | いちばん長いもの（300ms） |
| 同時に N 個まで | 自分で書く（練習問題3）か、パッケージを使う | その間 |

1万件の URL を `Promise.all(urls.map(fetch))` で取りに行くと、1万個の接続を同時に開こうとして、相手のサーバにも自分の Mac にも大きな負荷がかかります。**同時に動かす数を制限する**のは、実際のアプリでとても大事です（練習問題3・6）。

## 8. 待つのをやめる

### 8.1 AbortController と AbortSignal

ネットワークの相手が返事をしないと、`fetch` はいつまでも待ち続けることがあります。**`AbortSignal`** は「やめて」という合図を伝えるオブジェクトで、`fetch`、`fs` の多くの関数、`timers/promises` の `setTimeout` などが受け取れます。

```sh
$ node samples/abort-demo.mjs
== 1. AbortSignal.timeout: 決めた時間で fetch をやめる ==
    [サーバ] /?ms=100 の処理が終わった（クライアントは待っている）
  100ms のもの: 100ms 待ちました
  1000ms のもの: TimeoutError: The operation was aborted due to timeout
    [サーバ] /?ms=1000 の処理が終わった（クライアントは切断済み）
```

| 作り方 | 用途 |
| --- | --- |
| `AbortSignal.timeout(ms)` | 決めた時間が過ぎたらやめる（`TimeoutError`） |
| `const c = new AbortController(); c.signal` → `c.abort(理由)` | 好きなときにやめる（利用者のキャンセル、画面を離れたとき） |
| `AbortSignal.any([s1, s2])` | どれか1つがやめたら、やめる |

1つの signal を複数の処理に渡せば、まとめてやめられます（`abort-demo.mjs` の3）。

### 8.2 やめても、相手は処理を続けている

上の結果の最後の行に注意してください。クライアントが1000msの `fetch` をやめた後も、**サーバは処理を最後まで続けています**。クライアントがやめられるのは「待つこと」だけです。サーバに保存を頼んだ `POST` をタイムアウトでやめても、保存はされているかもしれません。だからこそ、送り直しには冪等性が必要でした（第2部 第10章6.2節と練習問題8）。

### 8.3 自分の関数を signal に対応させる

```js
async function countdown(n, { signal } = {}) {
  for (let i = n; i > 0; i--) {
    signal?.throwIfAborted();                  // やめる指示が出ていたら、理由を投げる
    await sleep(100, undefined, { signal });   // 待っている途中でもやめられる
  }
}
```

長く動く関数は、`{ signal }` を受け取れるようにしておくと、呼ぶ側がやめさせられます。受け取った signal を、中で呼ぶ関数（`fetch` など）にもそのまま渡すのがコツです。

## 9. Python の asyncio との比較

Python にも `async`/`await` があり、考え方はよく似ています。違いを知っておくと、混乱を避けられます。

| | Python（asyncio） | JavaScript |
| --- | --- | --- |
| 非同期の仕組み | 使うかどうかを選ぶ（Flask は使わない） | **最初から全部が非同期**（イベントループが常に動いている） |
| `async` 関数を呼ぶと | コルーチンができるだけで、**まだ始まらない**（`await` するか `create_task` で始まる） | **すぐに始まる**（Promise が返る） |
| 同時に待つ | `asyncio.gather(...)` | `Promise.all(...)` |
| タイムアウト | `asyncio.timeout(...)`、`wait_for` | `AbortSignal.timeout(...)` |
| 取り消し | `task.cancel()`（`CancelledError` が中に投げられる） | `AbortController`（関数の側が signal を見て、自分でやめる） |
| await し忘れ | 「coroutine was never awaited」の警告。処理は**実行されない** | 処理は**実行される**。失敗すると unhandled rejection |
| 同期の重い処理 | イベントループを止める（同じ） | イベントループを止める（第13章） |

いちばん大きな違いは、**JavaScript では呼んだ時点で処理が始まる**ことです。Python の感覚で「`await` していないから実行されないはず」と思うと、思わぬ処理が裏で動きます。

## まとめ

- 待ち時間のある処理は、待っている間に他のことができるよう非同期で書く。サーバで同期の関数を使うと、全員が待たされる。
- コールバック → Promise → async/await の順に、書きやすく、間違えにくくなった。コールバックの API は `promisify` か `fs/promises` などで Promise にする。
- async 関数は必ず Promise を返す。`await` した失敗は `try`/`catch` で受け取れる。
- `await` も `catch` もしない Promise の失敗は、unhandled rejection でプロセスを止める。結果を待たない処理にも `catch` を付ける。
- 関係の無い処理は `Promise.all` で並行にする。一部の失敗を許すなら `allSettled`。`all` が失敗しても他の処理は止まらない。
- `forEach`・`map`・`filter` は Promise を待たない。順番なら `for...of` + `await`、同時なら `Promise.all`、数を制限するなら自分で書く。
- `AbortSignal` で待つのをやめる。やめても相手は処理を続けているかもしれない。

## 練習問題

[exercises/README.md](exercises/README.md) に6問あります。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- MDN「プロミスの使用」: https://developer.mozilla.org/ja/docs/Web/JavaScript/Guide/Using_promises
- MDN「async function」: https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Statements/async_function
- MDN「Promise.all()」などの各ページ: https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Promise
- MDN「AbortSignal」: https://developer.mozilla.org/ja/docs/Web/API/AbortSignal
- Node.js「util.promisify」: https://nodejs.org/api/util.html#utilpromisifyoriginal
- Node.js「Timers Promises API」: https://nodejs.org/api/timers.html#timers-promises-api
- Node.js「--unhandled-rejections」（unhandled rejection のときの動きを変えるオプション）: https://nodejs.org/api/cli.html#--unhandled-rejectionsmode

前の章: [第11章 JavaScript 再入門](../ch11-js-refresher/README.md) ／ 次の章: [第13章 イベントループ](../ch13-event-loop/README.md)
