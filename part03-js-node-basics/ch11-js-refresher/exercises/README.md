# 第11章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part03/ch11-js-refresher/exercises/` で行います。最初に `cd exercises` で移動してください（`cd` だけを打つとホームに戻ってしまうので、`cd ~/dev/part03/ch11-js-refresher/exercises` と打っても構いません）。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | カウンタに機能を足す | [counter.mjs](counter.mjs)、[counter.test.mjs](counter.test.mjs) | 3.2 |
| 2 | 基本 | 配列のメソッドでタスクを集計する | [tasks.mjs](tasks.mjs)、[tasks.test.mjs](tasks.test.mjs) | 7 |
| 3 | 基本 | コピーし忘れのバグを直す | [buggy-receipt.mjs](buggy-receipt.mjs)、[receipt.test.mjs](receipt.test.mjs) | 6.2, 7.2, 8 |
| 4 | 基本 | 結果を予想して、理由を説明する（調べる問題） | [predict.mjs](predict.mjs) | 1〜8 |
| 5 | 応用 | this のバグを直す | [buggy-stopwatch.mjs](buggy-stopwatch.mjs)、[stopwatch.test.mjs](stopwatch.test.mjs) | 4 |
| 6 | 応用 | 配列のメソッドでアクセスログを集計する | [log-summary.mjs](log-summary.mjs)、[log-summary.test.mjs](log-summary.test.mjs) | 6, 7 |
| 7 | 応用 | 深い比較と、イミュータブルな更新 | [deep.mjs](deep.mjs)、[deep.test.mjs](deep.test.mjs) | 8 |
| 8 | 発展 | クロージャで関数の部品を作る（once・memoize・debounce・pipe） | [functions.mjs](functions.mjs)、[functions.test.mjs](functions.test.mjs) | 3, 4 |
| 9 | 発展 | LRU キャッシュのクラスを作る | [lru.mjs](lru.mjs)、[lru.test.mjs](lru.test.mjs) | 5, 7 |

**発展**（8・9）は、少し長めの問題です。できなくても次の章に進んでかまいません。

## テストの使い方

関数やクラスを作る問題は、`○○.mjs` の「ここを書く」を埋め、`node --test ○○.test.mjs` ですべてのテストが通れば完成です。

```sh
$ node --test counter.test.mjs
✔ 引数なしなら 0 から 1 ずつ増える (0.6ms)
...
ℹ pass 5
ℹ fail 0
```

`node --test ファイル名` は、Node.js に組み込まれたテストの仕組みで、ファイルの中の `test(...)` を1つずつ実行します（第2部 第7章で使いました。第11部で詳しく学びます）。失敗したテストには、期待した値（expected）と実際の値（actual）が表示されます。テストのファイルも読んで、何を求められているかを確かめてください。

---

## 基本

### 問題1 カウンタに機能を足す

本文3.2節の `makeCounter` を広げます。[counter.mjs](counter.mjs) の `makeCounter(start = 0, step = 1)` を完成させてください。

- 返すオブジェクトには、4つの関数を入れる
  - `increment()`: 値を `step` だけ増やし、増やした後の値を返す
  - `decrement()`: 値を `step` だけ減らし、減らした後の値を返す
  - `reset()`: 値を `start` に戻し、その値を返す
  - `get()`: 今の値を返す
- 値は外から書き換えられないようにする（返したオブジェクトに `c.count = 100` と書いても、`get()` の値は変わらない）

```sh
$ node --test counter.test.mjs
ℹ pass 5
ℹ fail 0
```

ヒント: `start = 0` は「引数が無いときは 0」という**既定の引数**です。本文の `count = count + 1` の `1` を `step` に変えるところから始めます。

### 問題2 配列のメソッドでタスクを集計する

本文7.1節の `tasks-summary.mjs` を、関数にまとめます。[tasks.mjs](tasks.mjs) の4つの関数を完成させてください。どれも、受け取った `tasks` を書き換えないでください。

- **`undoneTitles(tasks)`**: 未完了のタスクのタイトルの配列（元の順番のまま）
- **`totalMinutes(tasks, onlyDone = false)`**: `minutes` の合計。`onlyDone` が `true` なら、完了したものだけを足す
- **`countByTag(tasks)`**: タグごとの数を入れたオブジェクト（例: `{ 買い物: 2, 勉強: 2, 'Node.js': 1 }`）。タグが2つあるタスクは、両方に数える
- **`sortByMinutes(tasks)`**: `minutes` の短い順に並べた**新しい**配列。`minutes` が同じなら `id` の小さい順

```sh
$ node --test tasks.test.mjs
ℹ pass 9
ℹ fail 0
```

ヒント:
- `countByTag` は、`for...of` を2重にして書けます。`counts[tag]` がまだ無いときは `undefined` なので、`(counts[tag] ?? 0) + 1` のように `??` で 0 にしてから足します（6.3節）。
- 「同じなら id の順」は、比較関数で `a.minutes - b.minutes || a.id - b.id` と書きます（7.2節）。

### 問題3 コピーし忘れのバグを直す

[buggy-receipt.mjs](buggy-receipt.mjs) は、商品の一覧からレシートの行を作る関数 `makeReceipt(items, overrides)` です。`overrides` で、税率と「合計」の表記を変えられます。

```sh
$ node buggy-receipt.mjs
```

1. 実行して、ファイルの先頭に書いた「期待する出力」と比べる。2枚目と3枚目が、期待と違います。
2. 原因は「コピーしたつもりで、元のものを書き換えている」所が**2つ**あることです。どの行が、何を書き換えているかを説明する。
3. コピーして `receipt.mjs` を作り、直す。

   ```sh
   $ cp buggy-receipt.mjs receipt.mjs
   $ node --test receipt.test.mjs
   ℹ pass 5
   ℹ fail 0
   ```

ヒント: `Object.assign(a, b)` は、`b` の中身を `a` に**書き込みます**。`a` が `DEFAULT_OPTIONS` そのものなら、`DEFAULT_OPTIONS` が変わります。スプレッド（6.2節）と、`sort` の落とし穴（7.2節）を思い出してください。

### 問題4 結果を予想して、理由を説明する（調べる問題）

[predict.mjs](predict.mjs) には15個の小さな式があります。**実行する前に**、それぞれの結果（エラーになるものはエラーの種類）を予想して書き出してください。その後で `node predict.mjs` で確かめ、予想と違ったものについて、本文のどの節の規則でそうなるのかを説明します。

```sh
$ node predict.mjs       # すべて
$ node predict.mjs 2     # 2番だけ
```

特に、次の3つは「なぜそうなるか」を丁寧に説明してください。

- 2番 `[1, 2, 3].map(parseInt)`（ヒント: `map` がコールバックに渡す引数と、`parseInt` の2つ目の引数）
- 3番（ヒント: `let` のループの変数は、繰り返しごとに「新しい変数に、前の値をコピーして」作られる）
- 14番（ヒント: `{}` のプロトタイプには何があるか。どう直せばよいか、2通り答える）

---

## 応用

### 問題5 this のバグを直す

[buggy-stopwatch.mjs](buggy-stopwatch.mjs) は、100ミリ秒ごとに時間を数えるストップウォッチです。キーボードの代わりに `EventEmitter`（第15章で詳しく学びます）の `'l'` でラップ、`'q'` で止めます。

```sh
$ node buggy-stopwatch.mjs
TypeError: Cannot read properties of undefined (reading 'push')
    at EventEmitter.lap (...)
```

1. `this` の扱いに関する問題が**3つ**あります。それぞれ、そのメソッドが呼ばれたときに `this` が何になっているかを、本文4節の表を使って説明する。
   - ヒント: エラーにならずに、**静かに間違った動きをする**ものが1つあります。`start()` の後の `sw.elapsed` と `sw.timer.elapsed` を表示してみてください。
2. `buggy-stopwatch.mjs` をコピーして `stopwatch.mjs` を作り、直す。

   ```sh
   $ cp buggy-stopwatch.mjs stopwatch.mjs
   $ node --test stopwatch.test.mjs
   ℹ pass 6
   ℹ fail 0
   $ node stopwatch.mjs
   elapsed: 1000
   laps: [ 300, 700 ]
   [ 'ストップウォッチ 1: 300ms', 'ストップウォッチ 2: 700ms' ]
   ```

3. 直し方は複数あります（アロー関数で包む、`bind`、クラスのフィールドにアロー関数を入れる）。それぞれの長所と短所を書く。

### 問題6 配列のメソッドでアクセスログを集計する

第1部 第1章で `awk` や `sort | uniq -c` で集計したアクセスログ（同じものを [access.log](access.log) にコピーしてあります）を、今度は JavaScript で集計します。[log-summary.mjs](log-summary.mjs) の2つの関数を完成させてください。

- **`parseLine(line)`**: 1行を `{ ip, time, hour, method, path, status, bytes }` にする。形が違う行は `null`
  - `time` は `Date`。`[04/Nov/2026:09:03:15 +0900]` のタイムゾーンを正しく扱う（UTC では 0時3分15秒）
  - `hour` はログに書かれた時刻の「時」の文字列（`'09'`）
  - `path` からクエリ文字列（`?` 以降）を取り除く。バイト数の `-` は `0`
- **`summarize(entries, { top = 3 })`**: 次の項目を持つオブジェクトを返す
  - `total`、`byStatusClass`（`{ '2xx': 43, ... }`）、`byMethod`、`byHour`
  - `topPaths`: 回数の多い順に `top` 件の `{ path, count }`。同じ回数なら `path` の文字コード順
  - `uniqueIps`、`bytesTotal`、`serverErrorRate`（5xx の割合。小数第3位に丸める）、`first`・`last`（いちばん早い・遅い時刻の `Date`。空なら `null`）
  - 引数の配列を書き換えない

```sh
$ node --test log-summary.test.mjs
ℹ pass 9
ℹ fail 0
```

できたら、次の問いにも答えてください。

1. 結果を `console.log` すると、`byHour` のキーは `'10', '11', '12', '13', '09'` の順に表示されます。なぜ `'09'` だけが最後になるのか（ヒント: オブジェクトのキーの順番の規則）。順番が大事な集計には、何を使えばよいか。
2. `for` 文で書いた場合と比べて、`reduce` で書く長所と短所を挙げる。

### 問題7 深い比較と、イミュータブルな更新

[deep.mjs](deep.mjs) の2つの関数を完成させてください。

- **`deepEqual(a, b)`**: 中身として等しいかを返す
  - プリミティブ: `NaN` 同士、`0` と `-0` は等しい。型が違えば等しくない
  - オブジェクト: キーの順番は関係ない。キーの数と名前も同じであること。**プロトタイプ**（クラス）が違えば等しくない（配列と、配列のようなオブジェクトも）
  - `Date` は時刻、`RegExp` は `source` と `flags`、`Map` はキーと値、`Set` は要素で比べる
  - 自分自身を指すオブジェクト（循環）でも、止まらずに答える
- **`setIn(obj, path, value)`**: `obj` の `path`（キーの配列）の場所を `value` にした**新しい**オブジェクトを返す
  - `obj` は変えない。通り道のオブジェクト・配列だけを作り直し、それ以外は**同じものを使い回す**（配列は配列のまま）
  - 値が変わらないなら、`obj` をそのまま返す
  - 途中が無ければ作る（次のキーが数なら配列、そうでなければオブジェクト）

```sh
$ node --test deep.test.mjs
ℹ pass 13
ℹ fail 0
```

できたら、次の問いにも答えてください。

1. `setIn` で「それ以外は同じものを使い回す」と、何がうれしいのか（ヒント: 何が変わったかを `===` だけで調べられる。第8部の React）。
2. Node.js の `assert.deepStrictEqual` と、あなたの `deepEqual` の違いを1つ調べる（ヒント: `0` と `-0`）。

---

## 発展

### 問題8 クロージャで関数の部品を作る

[functions.mjs](functions.mjs) の4つの関数を完成させてください。どれも「関数を受け取って、新しい関数を返す」関数で、クロージャで状態を持ちます。

- **`once(fn)`**: 何度呼んでも `fn` を1回だけ呼び、2回目からは1回目の結果を返す関数を返す
  - `this` と引数は、そのまま `fn` に渡す
  - `fn` が例外を投げたら結果を覚えず、次の呼び出しでもう一度 `fn` を呼ぶ
  - `fn` が `undefined` を返しても、2回目は呼ばない
- **`memoize(fn, { key, maxSize })`**: 引数ごとに結果を覚える関数を返す
  - キーは、既定ではすべての引数を `JSON.stringify` したもの。`key` の関数で変えられる
  - 覚える数が `maxSize`（既定は無制限）を超えたら、**いちばん長く使われていない**ものから捨てる
  - 例外は覚えない。返す関数に `clear()` を付け、覚えたものを消せるようにする
- **`debounce(fn, ms)`**: 続けて呼ばれたとき、最後の呼び出しから `ms` ミリ秒たってから、最後の引数で1回だけ `fn` を呼ぶ関数を返す（入力が止まってから保存する、などに使う）
  - `this` はそのまま渡す。返す関数に、待っている呼び出しを取り消す `cancel()` と、すぐに実行する `flush()` を付ける
- **`pipe(...fns)`**: 関数を左から順につなげた関数を返す。最初の関数にはすべての引数を渡す。関数が無ければ、最初の引数をそのまま返す。関数でないものが混ざっていたら、作るときに `TypeError`

```sh
$ node --test functions.test.mjs
ℹ pass 19
ℹ fail 0
```

できたら、次の問いにも答えてください。

1. `once` と `memoize` の中で、返す関数をアロー関数ではなく `function` で書く必要があるのはなぜか。
2. 既定のキーを `args[0]` にすると、どんな問題が起きるか。`JSON.stringify(args)` でも区別できない引数の例を1つ挙げる。

### 問題9 LRU キャッシュのクラスを作る

**LRU キャッシュ**（Least Recently Used）は、決まった数までしか覚えず、いっぱいになったら「いちばん長く使われていないもの」から捨てるキャッシュです。データベースの結果や、計算に時間がかかるものを覚えておくのに使います（第6部 第34章のキャッシュの考え方につながります）。[lru.mjs](lru.mjs) に `LRUCache` クラスを作ってください。

- `new LRUCache(capacity, { onEvict })`: `capacity` は1以上の整数か `Infinity`。そうでなければ `RangeError`
- `get(key)`（使ったことにする）、`peek(key)`・`has(key)`（使ったことにしない）、`set(key, value)`（`this` を返す）、`delete(key)`、`clear()`、`size`
- 容量を超えたら、いちばん長く使われていないものを捨て、`onEvict(key, value)` を呼ぶ（`delete`・`clear`・上書きでは呼ばない）
- `for...of` で `[キー, 値]` を、`keys()` でキーを、**最近使った順**に取り出せる
- 中身はクラスの外から見えないようにする（`Object.keys(cache)` が `[]`）

```sh
$ node --test lru.test.mjs
ℹ pass 12
ℹ fail 0
```

ヒント: `Map` は、キーを入れた順番を覚えています。

できたら、次の問いにも答えてください。`get` が「使ったことにする」ための処理の計算量は、キャッシュの大きさに比例するか。配列で同じものを作った場合と比べる。
