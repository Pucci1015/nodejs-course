# 第56章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part11/ch56-testing-basics/exercises/` で行います。最初に `cd exercises` で移動してください。

| 問題 | 種類 | 書くもの | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- | --- |
| 1 | 基本 | テスト | スラッグを作る関数のテスト | [slug.ts](slug.ts)、[slug.test.ts](slug.test.ts) | 1〜3・9 |
| 2 | 基本 | コード | 「今」を引数で受け取る形に直す | [due-label.ts](due-label.ts)、[due-label.test.ts](due-label.test.ts) | 5 |
| 3 | 基本 | テスト | パスワードの決まりの境界を表で | [password-rules.ts](password-rules.ts)、[password-rules.test.ts](password-rules.test.ts) | 3 |
| 4 | 基本 | 答え | 考えて答える | [predict.md](predict.md) | 2・7〜9 |
| 5 | 応用 | テスト | 偽物の関数で、送った相手を確かめる | [digest.ts](digest.ts)、[digest.test.ts](digest.test.ts) | 6 |
| 6 | 応用 | テスト | タイマーを進めて確かめる | [debounce.ts](debounce.ts)、[debounce.test.ts](debounce.test.ts) | 5.3 |
| 7 | 応用 | テスト | カバレッジを 100% にする | [discount.ts](discount.ts)、[discount.test.ts](discount.test.ts) | 8 |
| 8 | 発展 | テスト | 回数の制限を、偽物の時計で確かめる | [limiter.ts](limiter.ts)、[limiter.test.ts](limiter.test.ts) | 5・9 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

## テストを書く問題の確かめ方（1・3・5・6・8）

この章の問題の多くは、**コード（`○○.ts`）は正しく書けていて、テスト（`○○.test.ts`）を書く**問題です。`○○.ts` は書き換えないでください。

1. `○○.test.ts` の `// ここを書く` の所に、テストを書き足します
2. `node --test ○○.test.ts` で、自分のテストがすべて通ることを確かめます
3. 本文9節の道具で、[mutants/](mutants/) の「わざと壊した実装」をすべて見つけられるかを確かめます

```sh
$ node ../../tools/check-tests.ts slug.test.ts
[OK] 正しい実装（slug.ts）で、すべてのテストが通る
[NG] ミュータント1（小文字にしない）を見逃した（すべてのテストが通ってしまう）
…
7 個の確認が失敗しました
```

最後に「すべて成功しました」と出れば完成です。最初（ひな形のまま）は、問題1で7個、問題3で6個、問題5で4個、問題6で6個、問題8で6個の確認が失敗します。

- `[NG] 正しい実装で、通らないテストがあります` と出たら、テストの期待する値が、問題文の決まりと違っています
- ミュータントの中身は [mutants/](mutants/) で読めます。ただし、**先に読まずに**、問題文の決まりからテストを考えてください。どれかを見逃したときに、そのミュータントを読んで「どんな入力なら結果が変わるか」を考えます
- 模範解答のテストは `node ../../tools/check-tests.ts ../solutions/slug.test.ts` で確かめられます

コードを書く問題（2）は、第10部までと同じく `node --test due-label.test.ts` ですべて通れば完成です。模範解答は `MODULE=../solutions/due-label.ts node --test due-label.test.ts` で試せます。[typecheck.ts](typecheck.ts) は、テストの中から tsc を動かす部品です（第7部と同じ）。

---

## 基本

### 問題1 スラッグを作る関数のテスト

[slug.ts](slug.ts) の `toSlug(title)` は、タスクの題名から URL の一部に使う文字列（**スラッグ**）を作ります。決まりは次のとおりです。[slug.test.ts](slug.test.ts) に、決まりを1つずつ確かめるテストを書いてください。

| 決まり | 例 |
| --- | --- |
| 全角の英数字は半角にする | `ＡＢＣ１２３` → `abc123` |
| 大文字は小文字にする | `Buy Milk` → `buy-milk` |
| 空白と `_` は `-` にする | `buy_milk` → `buy-milk` |
| 英小文字・数字・`-` のほかは消す | `牛乳 (milk)!` → `milk` |
| `-` が続いたら1つにする | |
| 最初と最後の `-` は消す | |
| 長くても 50 文字まで。切ったところが `-` なら、それも消す | |
| 使える文字が残らなければ `null` | `牛乳` → `null` |

```sh
$ node --test slug.test.ts
$ node ../../tools/check-tests.ts slug.test.ts
```

ヒント: 1つのテストで、1つの決まりを確かめます。「`-` が続く」「最初と最後に `-` がある」入力は、空白や記号を並べると作れます。50 文字の決まりは、`'a'.repeat(60)` のように長い文字列を作り、`.length` か `'a'.repeat(50)` と比べます。

### 問題2 「今」を引数で受け取る形に直す

[due-label.ts](due-label.ts) の `dueLabel(due)` は、中で `new Date()` を読んでいるので、テストで「今日」を決められません。本文5.1節のように、**`dueLabel(due, now)` の形に直し**、決まりを次のように変えてください。日数は、本文と同じく日本時間（`Asia/Tokyo`）の日付で数えます。

| 期限まで | 返す文 |
| --- | --- |
| 期限なし（`null`） | `期限なし` |
| 過ぎている（N 日前） | `N 日過ぎ` |
| 0 日 | `今日まで` |
| 1 日 | `明日まで` |
| 2〜6 日 | `あと N 日` |
| 7 日以上 | `M月D日まで`（`12月17日まで`、`1月5日まで`。先頭の 0 は付けない） |

```sh
$ node --test due-label.test.ts
```

最初は 11 個のテストのうち 10 個が失敗します。

ヒント: 月と日は、期限の文字列 `'2027-01-05'` を `split('-')` で分け、`Number()` で数にすると、先頭の 0 が消えます。

### 問題3 パスワードの決まりの境界を表で

[password-rules.ts](password-rules.ts) の `checkPassword(password, email)` は、問題の配列を返します（第10部 第51章 4節を小さくしたもの）。

| 問題 | 決まり |
| --- | --- |
| `too_short` | 12 文字より少ない。文字の数は、絵文字も1文字と数える（`[...password].length`） |
| `too_long` | 64 文字より多い |
| `contains_email` | メールアドレスの `@` より前（3文字以上のときだけ）を、大文字・小文字を区別せずに含む |
| `common` | よく使われるもの（`password1234`・`qwertyuiop12`・`123456789012`）と、大文字・小文字を区別せずに同じ |

[password-rules.test.ts](password-rules.test.ts) の表 `cases` に、行を足してください。境目の内側と外側を、どちらも入れます。

```sh
$ node ../../tools/check-tests.ts password-rules.test.ts
```

ヒント: 絵文字の 🍣 は、`'🍣'.length` が 2 ですが、`[...'🍣'].length` は 1 です。`@` より前が 3 文字のときの境目は、`EMAIL`（`alice`）とは別のアドレスで確かめる必要があります。表の外に `test` を1つ足してかまいません。

### 問題4 考えて答える

[predict.md](predict.md) の4つの問いに答えてください。

---

## 応用

### 問題5 偽物の関数で、送った相手を確かめる

[digest.ts](digest.ts) の `sendDigest(users, { now, listTasks, send })` は、人ごとにタスクを読み、決まりに合うタスクの数を、その人に1通だけ知らせます。

- 数えるのは、終わっていない（`done` でない）、期限があり、期限まで **3日以内**のタスク。期限を**過ぎたものも数える**
- 数が 0 の人には送らない
- `send` が失敗した人がいても、残りの人には送る。失敗した人の id の配列を返す

[digest.test.ts](digest.test.ts) に、`t.mock.fn` で `listTasks` と `send` の偽物を作り、だれに・何回・どんな引数で送ったかを確かめるテストを書き足してください（本文6節）。

```sh
$ node ../../tools/check-tests.ts digest.test.ts
```

ヒント: 偽物の `listTasks` は、`userId` ごとに違うタスクを返すと、人ごとの決まりを確かめやすくなります（`{ 1: [...], 2: [...] }` のようなオブジェクトから引く）。失敗する `send` は、`if (to === 'alice@example.com') throw new Error(…)` のように書けます。

### 問題6 タイマーを進めて確かめる

[debounce.ts](debounce.ts) の `debounce(fn, ms)` は、本文5.3節のものに2つのメソッドを足したものです。

| | すること |
| --- | --- |
| `debounced(…)` | 最後に呼ばれてから `ms` たったら、最後の引数で1回だけ `fn` を呼ぶ |
| `debounced.cancel()` | 待っている呼び出しを取り消す |
| `debounced.flush()` | 待っている呼び出しがあれば、待たずに今すぐ呼ぶ（その後、時間がたっても、もう一度は呼ばない）。無ければ何もしない |

[debounce.test.ts](debounce.test.ts) に、`t.mock.timers` で時間を進めて確かめるテストを書き足してください。

```sh
$ node ../../tools/check-tests.ts debounce.test.ts
```

ヒント: 「ちょうど `ms` で呼ばれる」は、`ms - 1` では 0 回、`ms` で 1 回、の2つで確かめます。テストごとの準備（`enable`・`mock.fn`・`debounce`）が同じなら、`function setup(t: TestContext)` のような関数にまとめると読みやすくなります（`TestContext` は `node:test` から `import { type TestContext }` で読めます）。

### 問題7 カバレッジを 100% にする

[discount.ts](discount.ts) の `total(lines, coupon)` は、注文の合計をクーポンを使って計算します。[discount.test.ts](discount.test.ts) のテストは2つだけです。カバレッジの表を見ながら、行と分かれ道のカバレッジが **どちらも 100%** になるまで、テストを書き足してください。足すテストにも、必ず `assert` で正しい値を確かめる行を入れます（問題4の問3）。

```sh
$ node --test --experimental-test-coverage --test-coverage-include='**/discount.ts' \
    --test-coverage-lines=100 --test-coverage-branches=100 discount.test.ts
```

（`\` は「次の行に続く」という意味です。1行で打ってもかまいません。）

最初は、表の `uncovered lines` に 17-23 と出て、最後に次のように出ます。終了ステータスは 1 です。

```
ℹ Error: 70.83% line coverage does not meet threshold of 100%.
ℹ Error: 66.67% branch coverage does not meet threshold of 100%.
```

この2行が消え、終了ステータスが 0 になれば完成です。

ヒント: クーポンの道は、`HALF`・`OFF` で始まる（引ける・引きすぎて 0 円・`OFF` の後が正の整数でない）・どれでもない、に分かれます。`quantity` が 0 以下の道も忘れずに。

---

## 発展

### 問題8 回数の制限を、偽物の時計で確かめる

[limiter.ts](limiter.ts) の `createLimiter({ limit, windowMs, now })` は、第5部 第24章 5節の「固定の窓」の数え方を、関数だけにしたものです。`now` には「今」をミリ秒で返す関数を渡せます。

| `hit(key)` の決まり | |
| --- | --- |
| 窓 | 時刻を `windowMs` ごとに区切る（`windowMs` が 1000 なら、0〜999・1000〜1999 …）。窓が変わったら数え直す |
| 許す | その窓で、そのキーが `limit` 回目まで。`{ allowed: true, remaining: あと何回か, retryAfterMs: 0 }` |
| 断る | `{ allowed: false, remaining: 0, retryAfterMs: 次の窓が始まるまでのミリ秒 }`。断った呼び出しは数えない |
| キー | キーごとに別に数える |

[limiter.test.ts](limiter.test.ts) に、テストを書き足してください。「今」は、自分で書き換えられる偽物の時計で決めます。

```ts
const clock = { now: 0 };
const limiter = createLimiter({ limit: 2, windowMs: 1000, now: () => clock.now });
clock.now = 999; // 「今」を進める
```

```sh
$ node ../../tools/check-tests.ts limiter.test.ts
```

ヒント: 窓の境目は、999 と 1000 の両方で確かめます。`retryAfterMs` は、窓の途中（たとえば 700）で断られたときの値で確かめます。
