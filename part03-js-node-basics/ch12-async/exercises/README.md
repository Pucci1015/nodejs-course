# 第12章 練習問題

本文（[../README.md](../README.md)）を読んでから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。

| 問題 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- |
| 1 | 表示される順番を予想する | [order.mjs](order.mjs) | 3〜7 |
| 2 | `promisify` と `callbackify` を自分で作る | [promisify.mjs](promisify.mjs)、[promisify.test.mjs](promisify.test.mjs) | 2〜4 |
| 3 | 同時に動かす数を制限する `mapLimit` | [map-limit.mjs](map-limit.mjs)、[map-limit.test.mjs](map-limit.test.mjs) | 6〜8 |
| 4 | 指数バックオフでやり直す `retry` | [retry.mjs](retry.mjs)、[retry.test.mjs](retry.test.mjs) | 5, 8 |
| 5 | 非同期のバグを直す | [buggy-batch.mjs](buggy-batch.mjs)、[batch.test.mjs](batch.test.mjs) | 5〜7 |
| 6 | 調子の悪い API からまとめて取ってくる CLI | [fetch-all.mjs](fetch-all.mjs)、[flaky-server.mjs](flaky-server.mjs)、[check-fetch-all.sh](check-fetch-all.sh) | 全体 |

問題2〜5 は、`node --test ○○.test.mjs` ですべてのテストが通れば完成です。テストのファイルも読んで、何を求められているかを確かめてください。問題6 は、問題3と問題4で作った関数を使います。

---

## 問題1 表示される順番を予想する

[order.mjs](order.mjs) を**実行する前に**読んで、表示される行を順番に書き出してください。その後で `node order.mjs` で確かめ、予想と違った行について、本文のどの節の規則でそうなるのかを説明します。

特に、次の3つは理由を丁寧に説明してください。

- `B` が `p1: 開始` と `p2: 開始` の**後**に表示されるのはなぜか（ヒント: `async` 関数は、最初の `await` までは同期で動く）
- `D` の行で、`Promise.all` の結果が `p2,p1` ではなく `p1,p2` の順になるのはなぜか
- `E: forEach ...` の3行が、`F` より後で、しかもバラバラの場所に表示されるのはなぜか。`G` や `H` の行とどう混ざるか

## 問題2 promisify と callbackify を自分で作る

`node:util` の `promisify` と `callbackify` を使わずに、[promisify.mjs](promisify.mjs) の2つの関数を作ってください。

- **`promisify(fn)`**: 最後の引数にエラーファーストのコールバック `(err, value) => {}` を受け取る関数を、Promise を返す関数にする
  - `err` があれば rejected、無ければ `value` で fulfilled
  - `this` はそのまま `fn` に渡す
  - `fn` が同期で例外を投げたら、例外ではなく rejected にする
  - コールバックが2回呼ばれても、最初の1回だけを使う
  - 関数でないものを渡したら、すぐに `TypeError`
- **`callbackify(asyncFn)`**: その逆。Promise を返す関数を、最後の引数にコールバックを受け取る関数にする
  - `asyncFn` がすぐに値を返しても、コールバックは**必ず非同期に**呼ぶ（同期で呼んだり呼ばなかったりする関数は、使う人が混乱する）
  - コールバックが例外を投げたとき、コールバックが**もう一度呼ばれてはいけない**（ヒント: Promise のチェーンの中でコールバックを呼ぶとどうなるか）

```sh
$ node --test promisify.test.mjs
ℹ pass 11
ℹ fail 0
```

## 問題3 同時に動かす数を制限する mapLimit

`Promise.all(items.map(fn))` は全部を一度に始めます。1万件あれば、1万個の接続を同時に開こうとします。[map-limit.mjs](map-limit.mjs) に、**同時に `limit` 個まで**しか `fn` を動かさない `mapLimit(items, limit, fn, { signal })` を作ってください。

- 結果は、終わった順ではなく、`items` の順に並べた配列
- 1つ終わったら、**すぐに**次を始める（`limit` 個ずつの「組」に分けて、組ごとに `Promise.all` で待つのは不合格。遅いものが1つあると、組の全員が待たされる）
- `fn(item, index)` のように、要素と位置を渡す
- `items` は配列でなくても、反復できるもの（`Set` やジェネレータ）なら受け取る
- `limit` は1以上の整数か `Infinity`。それ以外なら `RangeError` で rejected
- 1つが失敗したら、その失敗で rejected になり、まだ始めていないものは始めない
- `signal` で中止されたら、`signal.reason` で rejected になり、新しいものは始めない。最初から中止されていたら、1つも始めない

```sh
$ node --test map-limit.test.mjs
ℹ pass 12
ℹ fail 0
```

ヒント: 「動いている数」「次に始める位置」「終わった数」を変数で持ち、1つ終わるたびに「空いていれば次を始める」関数を呼びます。

## 問題4 指数バックオフでやり直す retry

ネットワークの向こうのサーバは、混雑（503）や一時的な接続の失敗で、たまに失敗します。少し待ってやり直せば成功することが多いのですが、すぐに何度もやり直すと、混雑しているサーバにさらに負荷をかけます。そこで、**やり直すたびに待つ時間を倍にしていく**のが一般的です（指数バックオフ）。

[retry.mjs](retry.mjs) に `retry(fn, options)` を作ってください。

- `fn({ attempt, signal })` を呼ぶ。`attempt` は何回目か（1から）、`signal` はこの1回のための `AbortSignal`
- 失敗したら、`retries` 回（既定 3）までやり直す。やり直しても失敗したら、**最後の失敗**で rejected
- `n` 回目のやり直しの前に待つ時間は `baseMs × factor^(n-1)`。ただし `maxMs` を超えない
- `shouldRetry(err, attempt)` が `false` を返す失敗は、やり直さずにすぐ rejected（404 のように、やり直しても結果が変わらない失敗のため）
- やり直す前に `onRetry({ attempt, delay, error })` を呼ぶ（ログを出すため）
- `timeoutMs` を指定したら、1回の試行がその時間を超えたとき、`fn` に渡した `signal` を中止する。その試行は `TimeoutError` で失敗したことにして、やり直す
- `signal` で全体が中止されたら、試行中でも待っている途中でも、すぐに `signal.reason` で rejected になり、それ以上やり直さない

```sh
$ node --test retry.test.mjs
ℹ pass 14
ℹ fail 0
```

ヒント:

- 1回の試行のための signal は、`AbortSignal.any([全体の signal, AbortSignal.timeout(timeoutMs)])` で作れます（本文8節）
- `node:timers/promises` の `setTimeout(ms, value, { signal })` は、中止されると `AbortError` で rejected になります。`signal.reason` で rejected にしたいときは、置き換えが必要です

実際に使うときは、待つ時間に乱数を混ぜる（ジッター）のが一般的です。多くのクライアントが同じ時刻に失敗すると、全員が同じ時刻にやり直して、またサーバが混雑するからです。余裕があれば、`jitter: true` のときは `0〜delay` の乱数を待つ、という機能を足してみてください（テストはありません）。

## 問題5 非同期のバグを直す

[buggy-batch.mjs](buggy-batch.mjs) の3つの関数は、どれも「動いているように見えて、実は間違っている」非同期のコードです。[batch.test.mjs](batch.test.mjs) を実行して、どのテストが失敗するかを見てから、直してください。

```sh
$ node --test batch.test.mjs
ℹ pass 2
ℹ fail 6
```

- `importUsers` … バグが3つあります。直した後、「`rows` の中で重複しているメールアドレス」のテストが通るかどうかに注意してください。全員を `Promise.all` で同時に処理すると、このテストは通りません。それはなぜでしょうか（第2部 第10章の練習問題8で見た「割り込み」と同じ問題です）
- `loadDashboard` … 結果は正しいのに、テストは「遅い」と言って失敗します
- `saveAll` … `try`/`catch` があるのに、失敗が包まれません

それぞれのバグについて、「なぜこう書くと間違いなのか」を一言で説明できるようにしてください。

## 問題6 調子の悪い API からまとめて取ってくる CLI

[flaky-server.mjs](flaky-server.mjs) は、わざと調子の悪い API サーバです。id によって、503 を返したり、返事をしなかったり、404 を返したりします（ファイルの先頭のコメントを読んでください）。

このサーバから、指定した id の商品をまとめて取ってくる CLI を [fetch-all.mjs](fetch-all.mjs) に完成させてください。引数の解釈と結果の表示は書いてあります。

```sh
# ターミナル1
$ node flaky-server.mjs

# ターミナル2
$ node fetch-all.mjs 1-30
```

要件:

- 同時に `--limit` 個（既定 4）までしかリクエストしない（問題3の `mapLimit`）
- 5xx・時間切れ・接続の失敗は、指数バックオフでやり直す（問題4の `retry`）。404 などの 4xx はやり直さない
- 1回のリクエストは `--timeout` ミリ秒（既定 500）で時間切れにする
- 1つの商品が失敗しても、他の商品は取り続ける。最後に、id の順に結果を表示する
- 失敗したものが1つでもあれば、終了コードを 1 にする
- Ctrl+C（SIGINT）を押したら、動いているリクエストも、待っている再試行もすぐにやめ、終了コードを 130 にする

期待する出力（標準出力に id の順に、標準エラー出力に再試行のログと集計）:

```
1	ok	商品 1
...
13	not-found
...
29	failed	HTTP 503（4回試した）
30	ok	商品 30
成功 28 / 見つからない 1 / 失敗 1（2134ms）
```

確かめるスクリプトは、サーバを自分で起動し直しながら14項目を調べます（先に起動したサーバは止めておいてください。ポートがぶつかります）。

```sh
$ bash check-fetch-all.sh
[OK] 1. 失敗したものがあるので、終了コードは 1
...
すべて成功しました
```

問題3・4がまだ解けていない場合は、`../solutions/map-limit.mjs` と `../solutions/retry.mjs` を `exercises` にコピーして使っても構いません。

考えてみよう: id 5 の最初のリクエストは、クライアントが時間切れであきらめた後、サーバの中ではどうなっているでしょうか（本文8.2節）。もしこれが「注文する」POST だったら、やり直してよいでしょうか。
