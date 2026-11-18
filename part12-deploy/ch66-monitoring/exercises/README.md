# 第66章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part12/ch66-monitoring/exercises/` で行います。最初に `cd exercises` で移動してください。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | パーセンタイルとまとめ | [percentile.ts](percentile.ts)、[percentile.test.ts](percentile.test.ts) | 4.1 |
| 2 | 基本 | ログを読んで数える | [log-stats.ts](log-stats.ts)、[log-stats.test.ts](log-stats.test.ts) | 2.3 |
| 3 | 基本 | カウンタを Prometheus の文字の形に | [prom-text.ts](prom-text.ts)、[prom-text.test.ts](prom-text.test.ts) | 3.2 |
| 4 | 基本 | 考えて答える（調べる問題） | [predict.md](predict.md) | 1〜7 |
| 5 | 応用 | ヒストグラムと、分位数の推定 | [histogram.ts](histogram.ts)、[histogram.test.ts](histogram.test.ts) | 3.1・3.3 |
| 6 | 応用 | Express で、ルートの形ごとに数える | [http-metrics.ts](http-metrics.ts)、[http-metrics.test.ts](http-metrics.test.ts) | 3.3 |
| 7 | 応用 | 台を選ぶ・続けて失敗した台を休ませる | [target-pool.ts](target-pool.ts)、[target-pool.test.ts](target-pool.test.ts) | 7.1 |
| 8 | 発展 | 台をまたいで知らせを配る（Redis の Pub/Sub） | [shared-hub.ts](shared-hub.ts)、[shared-hub.test.ts](shared-hub.test.ts) | 7.3 |

**発展**（8）は、少し長めの問題です。できなくても、成果物に進んでかまいません。

## テストの使い方

問題4以外は、ファイルを書いて、`node --test ○○.test.ts` ですべてのテストが通れば完成です。書く前に失敗するテストの数は、それぞれの問題に書いてあります。模範解答で試すには、`MODULE=../solutions/○○.ts` を付けます（例: `MODULE=../solutions/percentile.ts node --test percentile.test.ts`）。

- 問題8のテストは、第6部の compose の Redis（127.0.0.1:6380）を使います。チャンネルの名前を `test:…` にするので、ほかのものには届きません。
- 問題6のテストは、Express のアプリを空いているポートで動かします。
- [typecheck.ts](typecheck.ts) は、テストの部品です。書き換えなくてかまいません。どのテストも最後に、書いたファイルに `tsc` のエラーが無いことを確かめます。

---

## 基本

### 問題1 パーセンタイルとまとめ

[percentile.ts](percentile.ts) に、2つの関数を書いてください。本文 4.1節の `load.ts` の `pick` を、関数にしたものです。

- `percentile(values, p)`: 小さい方から数えて「`ceil(p ÷ 100 × 個数)` 番目」（1 から数える。0 番目になるときは 1 番目）の値（**nearest-rank**）
  - `values` は並んでいなくてよい。**元の配列は並べ替えない**
  - `values` が空なら `values` を含む文で、`p` が 0〜100 の数でなければ（`NaN` も）`p` を含む文で例外
- `summarize(values)`: `{ count, min, mean, p50, p95, p99, max }`（`mean` は平均。`min` は `percentile(values, 0)`、`max` は `percentile(values, 100)`）。空なら `values` を含む文で例外

```sh
$ node --test percentile.test.ts        # 書く前は 6 個が失敗
```

ヒント: 元の配列を変えずに並べ替えた配列を作るのは、`values.toSorted((a, b) => a - b)` です（第8部 第42章）。`p` が 0〜100 の数かは、`!(p >= 0 && p <= 100)` で調べると、`NaN` も「違う」になります（`NaN` との比べはいつも `false`）。

### 問題2 ログを読んで数える

[log-stats.ts](log-stats.ts) に、`logStats(lines)` を書いてください。本文 2節の `app.ts` が書くログ（1 行 1 つの JSON）の行の配列を受け取り、次を返します。

| 項目 | 中身 |
| --- | --- |
| `requests` | `msg` が `'request'` で、`url`（文字列）・`status`（整数）・`ms`（数）がそろった行の数 |
| `byStatus` | その行の `status` を、100 の位ごとに数えたもの（`{ '2xx': 4, '5xx': 1 }`）。出てこないものは書かない |
| `slowest` | その行の `{ url, ms }` を、`ms` の大きい順に 3 つまで。同じ `ms` なら、先に出た行が先 |
| `errors` | `level` が 50 以上で、`errorId`（文字列）がある行の `{ errorId, message }`（`message` は `err.message`。無ければ `''`）。出てきた順 |
| `skipped` | JSON として読めない行と、読めても**オブジェクトでない**（配列・数・文字列・`null`）行の数。空の行（空白だけ）は数えない |

- 項目が足りない・型が違う行は、数えずに飛ばす（例外にしない）

```sh
$ node --test log-stats.test.ts         # 書く前は 6 個が失敗
```

ヒント: 1 行ずつ `JSON.parse` を `try` / `catch` で包むのは、本文 2.3節と同じです。項目の確かめは、Zod の `z.object({ msg: z.literal('request'), url: z.string(), … }).safeParse(entry)` で書くと短くなります（`z.object` は、ほかの項目があってもかまいません）。`toSorted` は、同じ値の順番を変えません（安定）。

### 問題3 カウンタを Prometheus の文字の形に

[prom-text.ts](prom-text.ts) に、`formatCounter(name, help, samples)` を書いてください。本文 3.2節の `render` を、きちんとしたものにします。

```
# HELP 名前 説明
# TYPE 名前 counter
名前{ラベル="値",…} 数
```

- 最後に改行を付ける。ラベルが無ければ `{}` を書かない
- ラベルは、**名前の順**（文字の順）に並べる（同じ組なら、いつも同じ行になる）
- ラベルの値の `\` を `\\` に、`"` を `\"` に、改行を `\n`（`\` と `n` の 2 文字）にする。`help` の `\` と改行も同じようにする（`help` の `"` はそのまま）
- `name` が `/^[a-zA-Z_:][a-zA-Z0-9_:]*$/` に合わなければ、`name` を含む文で例外
- ラベルの名前が `/^[a-zA-Z_][a-zA-Z0-9_]*$/` に合わないか、`__` で始まる（Prometheus が使う）なら、「ラベル」を含む文で例外
- `value` が 0 以上の数でなければ（`NaN` も）、`value` を含む文で例外

```sh
$ node --test prom-text.test.ts         # 書く前は 7 個が失敗
```

ヒント: エスケープは、**`\` を最初に**置き換えます。後にすると、`"` を `\"` にしたときの `\` まで、もう一度 `\\` にしてしまいます。

### 問題4 考えて答える

[predict.md](predict.md) の 6 つの問いに答えてください。問い4は、予想してから、本文の `app.ts` と `load.ts` で試します。

---

## 応用

### 問題5 ヒストグラムと、分位数の推定

[histogram.ts](histogram.ts) に、`Histogram` のクラスを書いてください。本文 3.1節のヒストグラムに、「バケツの数から p95 などを推定する」を足します。Prometheus の `histogram_quantile` と同じ考え方です。

- `new Histogram(buckets)`: 区切り（`[0.01, 0.05, 0.1]` など）。空・小さい順でない・同じ値がある・数でない、なら `buckets` を含む文で例外
- `observe(value)`: 値を数える。区切りちょうどの値は、その区切りのバケツ（**以下**）。どの区切りより大きければ `+Inf` のバケツ。`NaN` は数えない
- `snapshot()`: `{ buckets: [{ le, count }, …], sum, count }`。`count` は**累積**（その区切り以下の数）。最後に `le: Infinity`
- `quantile(q)`（`q` は 0〜1。違えば `q` を含む文で例外）:
  1. `rank = q × 全部の数`
  2. 累積の数が `rank` 以上になる、最初のバケツを探す
  3. そのバケツの中は、下の区切り（最初のバケツなら 0）から上の区切りまで、一様に散らばっているとして、`下 + (上 - 下) × (rank - 下のバケツまでの累積) ÷ このバケツの数` を返す
  4. `+Inf` のバケツなら、いちばん大きい区切りを返す（それより上は分からない）。数が 0 なら `NaN`

```sh
$ node --test histogram.test.ts         # 書く前は 7 個が失敗
```

例: 区切り `[0.1, 0.2]` に 0.15 を 10 個入れると、`quantile(0.9)` は `0.1 + 0.1 × 9/10 = 0.19` です（本当はどれも 0.15 なので、推定には誤差があります）。

ヒント: クラスの中では、バケツごとの数を**累積でなく**持っておき、`snapshot` で足し上げると、`observe` が短くなります。区切りを探すのは `buckets.findIndex((le) => value <= le)`（見つからなければ -1）です。

### 問題6 Express で、ルートの形ごとに数える

[http-metrics.ts](http-metrics.ts) に、`createHttpMetrics({ now })` を書いてください。本文 3.3節の `app.ts` の数える所を、どのアプリにも付けられる形にします。戻り値は `{ middleware, render }` です。

- `middleware`: 頼みが終わったとき（`res` の `finish`）に、次を数える
  - `http_requests_total{method="GET",route="…",status="200"}` のカウンタ（ラベルはこの順）
  - ルートごとの、かかった秒数のヒストグラム `http_request_duration_seconds`（区切りは 0.01・0.05・0.1・0.5・1）。`_bucket{route="…",le="…"}`（累積、最後に `le="+Inf"`）・`_sum{route="…"}`・`_count{route="…"}`
- `route` は、**`req.baseUrl` + `req.route.path`**（`app.use('/api/tasks', router)` の下の `/:id` なら `/api/tasks/:id`）。ルートに合わなかった頼み（404 など）は `unmatched`。URL そのものは、どこにも書かない
- 時間は `now()`（ミリ秒。既定は `performance.now()`）で、頼みの始めと終わりに1回ずつ読む
- `render()`: Prometheus の文字の形（`# TYPE http_requests_total counter`、`# TYPE http_request_duration_seconds histogram` の行を含む）

```sh
$ node --test http-metrics.test.ts      # 書く前は 5 個が失敗
```

ヒント: `req.route` は、Express の型では `any` です。本文 3.3節のように、`const r: unknown = req.route;` で受けて、`'path' in r && typeof r.path === 'string'` と確かめてから使います。`finish` の時には、ルーターの処理は終わっているので、`req.baseUrl` と `req.route` が読めます。

### 問題7 台を選ぶ・続けて失敗した台を休ませる

[target-pool.ts](target-pool.ts) に、`createTargetPool(targets, { failThreshold, cooldownMs, now })` を書いてください。本文 7.1節の `pick` に、「続けて失敗した台を、しばらく休ませる」（**サーキットブレーカ**の考え方）を足します。

- `pick()`: 休んでいない台を、順番に（ラウンドロビン）返す。全部休んでいれば `undefined`
- `reportFailure(target)`: 続けての失敗の数を 1 増やす。`failThreshold` 回になったら、`now() + cooldownMs` まで休ませる。休みが明けた台は、**1 回の失敗で、すぐまた休む**（休む前の失敗の数を `failThreshold - 1` にしておく）
- `reportSuccess(target)`: 続けての失敗の数を 0 にする
- 知らない台の報告は無視する
- `status()`: `[{ target, up, failures }, …]`（`targets` の順）
- `targets` が空か、同じ台が2つあれば、`targets` を含む文で例外

```sh
$ node --test target-pool.test.ts       # 書く前は 6 個が失敗
```

休みが明けた台に、いきなり全部の頼みを送らず、1 回だけ試して様子を見る形を、**半開き**（half-open）と呼びます。

---

## 発展

### 問題8 台をまたいで知らせを配る（Redis の Pub/Sub）

[shared-hub.ts](shared-hub.ts) に、`createSharedHub({ publisher, subscriber, channel })` を書いてください。本文 7.3節の表の「SSE のハブ」の直し方です。第5部 第27章のハブは、同じ台の客にしか配れませんでした。これを、Redis の Pub/Sub（第6部 第34章 6節）で全部の台に流し、それぞれの台が、自分につながっている客に配る形にします。成果物で使います。

- `start()`: `subscriber.subscribe(channel, 受け取る関数)` で購読を始める
- `subscribe(userId, listener)`: この台の、その人の客を足す。戻り値の関数を呼ぶと外す
- `publish(userId, event)`: `{ userId, event }` を JSON にして `publisher.publish(channel, …)` する。**自分の台の客にも、Redis を通って届く**（ここで直接配らない。2 回届いてしまう）
- 受け取ったメッセージは、Zod で形を確かめる（`userId` は 1 文字以上の文字列、`event` は `{ type: 1 文字以上の文字列, data: 何でも }`）。JSON でない・形が違うものは捨てる
- その人の客に配る。1 人の客の関数が例外を投げても、ほかの客には配る
- `close()`: `subscriber.unsubscribe(channel)` して、客を全部外す（接続は閉じない）

```sh
$ node --test shared-hub.test.ts        # 書く前は 7 個が失敗
```

テストは、2 台ぶんのハブ（それぞれ publisher と subscriber の 2 本の接続）を同じプロセスで作り、台 a で `publish` したものが台 b の客に届くかを確かめます。

ヒント: 購読している接続は、ほかのコマンドに使えないので、`publisher` と `subscriber` は別の接続です（第6部 第34章 6節の `duplicate()`）。客は `Map<string, Set<Listener>>`（人 → その人の客の集まり）に置きます。
