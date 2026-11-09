# 第13章 練習問題

本文（[../README.md](../README.md)）を読んでから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。

| 問題 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- |
| 1 | 表示される順番を予想する（nextTick・マイクロタスク・フェーズ） | [predict-loop.mjs](predict-loop.mjs) | 2, 3 |
| 2 | 重い計算で止まるサーバを、Worker で直す | [report-server.mjs](report-server.mjs)、[primes.mjs](primes.mjs)、[check-report-server.sh](check-report-server.sh) | 5, 6.1 |
| 3 | 重い処理を小分けにして、合間に譲る | [chunked.mjs](chunked.mjs)、[chunked.test.mjs](chunked.test.mjs) | 2.2, 6.2 |
| 4 | スレッドプールが埋まると何が待たされるか | [pool-starve.mjs](pool-starve.mjs) | 4 |
| 5 | 正規表現でサーバが止まる（ReDoS） | [slug.mjs](slug.mjs)、[redos-measure.mjs](redos-measure.mjs)、[slug.test.mjs](slug.test.mjs) | 5.2 |
| 6 | イベントループの見張りを作る | [lag-monitor.mjs](lag-monitor.mjs)、[lag-monitor.test.mjs](lag-monitor.test.mjs) | 7, 8 |

関数を作る問題（3・5・6）は、`node --test ○○.test.mjs` ですべてのテストが通れば完成です。テストは時間を測るものが多いので、他の重いアプリ（動画の書き出しなど）を止めてから実行してください。

---

## 問題1 表示される順番を予想する

[predict-loop.mjs](predict-loop.mjs) を**実行する前に**読んで、表示される15個の文字（A〜P。G はありません）を順番に書き出してください。その後で `node predict-loop.mjs` で確かめます。

全体が `fs.readFile` のコールバックの中にあることに注意してください。今どのフェーズにいるかで、次に何が実行されるかが決まります（本文3.1節の図）。

予想と違った所について、次の言葉を使って説明してください: コールスタック、`nextTick` の待ち行列、マイクロタスク、poll・check・timers のフェーズ。

追加の問い:

1. `setImmediate` のコールバックの中で `setImmediate(() => log('G'))` を足すと、`G` はどこに表示されるでしょうか。何度か実行して、**いつも同じとは限らない**ことを確かめ、その理由を説明してください（ヒント: `F` のタイマーは 1ms。check のフェーズの次は…）
2. 全体を `fs.readFile` のコールバックで包まず、ファイルの一番外側に書いたら、どこが変わるでしょうか（本文3.3節）

## 問題2 重い計算で止まるサーバを、Worker で直す

[report-server.mjs](report-server.mjs) は、`/report?n=数` で n 以下の素数の数を計算して返すサーバです。計算をメインのスレッドでしているので、計算の間は `/health`（監視の仕組みが数秒ごとに呼ぶ）にも応えられません。監視の仕組みは「サーバが死んだ」と判断して、再起動してしまうかもしれません。

まず、問題を体験してください。

```sh
# ターミナル1
$ node report-server.mjs

# ターミナル2
$ curl -s 'http://127.0.0.1:9131/report?n=5000000' &  curl -s -w ' %{time_total}秒\n' http://127.0.0.1:9131/health
```

次に、次の要件を満たすように直してください（[primes.mjs](primes.mjs) は変えずに使います）。

- `/report` の計算は、`worker_threads` の Worker で行う。計算の間も `/health` にすぐ応える
- Worker の中で例外が起きたら、500 を返す（サーバは止めない）
- **同時に計算するのは2つまで**。3つ目からは、すぐに `503 Service Unavailable` と `Retry-After: 1` ヘッダを返す
- n の確認（400）や、レスポンスの形は今のまま

```sh
$ bash check-report-server.sh
[OK] 1. GET /health
...
[OK] 7. 503 には Retry-After を付ける

すべて成功しました
```

直す前のファイルでは、7個のうち3個（4・6・7）が失敗します。スクリプトがサーバを起動するので、自分で起動したものは止めてから実行してください。

考えてみよう: 「同時に2つまで」の代わりに、3つ目からを**順番待ち**にする（キューに入れて、空いたら計算する）設計もあります。断る設計と比べて、良い点と危ない点は何でしょうか。

## 問題3 重い処理を小分けにして、合間に譲る

[chunked.mjs](chunked.mjs) に `processInChunks(items, fn, { budgetMs, signal })` を作ってください。`items` の各要素に**同期の**関数 `fn(item, index)` を順番に適用し、結果の配列を返します。ただし、続けて `budgetMs` ミリ秒（既定 10）以上 CPU を使ったら、いったんイベントループに順番を譲ります。

- 呼んだ時点では、まだ1つも処理しない（呼んだ側の同期のコードが先に終わる）
- `fn` が例外を投げたら、その例外で rejected になり、残りは処理しない
- `signal` で中止されたら、次に譲ったところで止まり、`signal.reason` で rejected になる。最初から中止されていたら、1つも処理しない
- 件数ではなく**時間**で区切る（`fn` の重さが要素ごとに違っても、イベントループを止める時間がそろう）

```sh
$ node --test chunked.test.mjs
ℹ pass 9
ℹ fail 0
```

完成したら、「順番を譲る」部分を `await Promise.resolve()` に変えて、テストを実行してみてください。どのテストが失敗するでしょうか。それはなぜでしょうか（本文2.2節）。

## 問題4 スレッドプールが埋まると何が待たされるか

[pool-starve.mjs](pool-starve.mjs) は、パスワードのハッシュの計算（`crypto.pbkdf2`）を何件か同時に始め、その直後に「小さなファイルを読む」「`localhost` の名前を引く」「10ms のタイマー」の3つにかかる時間を測ります。

**実行する前に**、次の4通りで、3つの処理にそれぞれ何 ms かかるかを予想してください。その後で実行し、結果を表にまとめます。

```sh
$ node pool-starve.mjs 3
$ node pool-starve.mjs 4
$ node pool-starve.mjs 8
$ UV_THREADPOOL_SIZE=8 node pool-starve.mjs 4
```

| ハッシュの数 | スレッドプール | ファイル | 名前解決 | タイマー |
| --- | --- | --- | --- | --- |
| 3 | 4 | | | |
| 4 | 4 | | | |
| 8 | 4 | | | |
| 4 | 8 | | | |

そのうえで、次の問いに答えてください。

1. タイマーだけが、どの場合でも約 10ms で終わるのはなぜか
2. ハッシュが 4 件のとき、ファイルの読み込みはなぜ待たされたのか。3 件のときはなぜ待たされないのか
3. `dns.lookup` がスレッドプールを使うということは、`fetch('https://example.com/')` にどんな影響がありそうか（本文4.1節の表）
4. ログインの処理が多いサーバで、この問題を防ぐ方法を2つ以上挙げる。それぞれの欠点も書く

## 問題5 正規表現でサーバが止まる（ReDoS）

[slug.mjs](slug.mjs) の `isValidSlug` は、URL に使う短い名前（スラッグ）が正しい形かを確かめる関数です。正しい入力にも正しくない入力にも、正しい答えを返します。ところが、ある形の入力を渡すと、**答えを返すまでに何秒もかかります**。

```sh
$ node redos-measure.mjs
長さ  17:      6.4ms（結果 false）
長さ  19:      3.7ms（結果 false）
長さ  21:     14.7ms（結果 false）
...
```

1. 実行して、長さが2増えるごとに時間がどう増えるかを確かめてください。長さ 41 の入力なら、およそ何時間かかりそうでしょうか
2. なぜこうなるのかを説明してください（ヒント: `aaaa` を `([a-z0-9]+-?)*` で表す方法は何通りあるか。最後の `!` で失敗したとき、正規表現のエンジンは何をするか）
3. 同じ文字列を受け付け、どんな入力でもすぐに終わるように直してください

```sh
$ node --test slug.test.mjs
ℹ pass 4
ℹ fail 0
```

直す前は、4個のうち1個（「意地の悪い入力でも、すぐに終わる」）だけが失敗します。このテストは、`isValidSlug` を Worker の中で実行し、1秒たったら Worker を止めます。メインのスレッドで実行すると、テストそのものが止まってしまうからです。

この種の弱点は **ReDoS**（Regular expression Denial of Service、正規表現によるサービス妨害）と呼ばれ、実際に広く使われているパッケージでも何度も見つかっています。自分のサーバを、自分の Mac の中で試すだけにしてください。

## 問題6 イベントループの見張りを作る

[lag-monitor.mjs](lag-monitor.mjs) に `createLagMonitor({ intervalMs, thresholdMs, onLag })` を作ってください。`monitorEventLoopDelay` を使わず、タイマーだけで作ります。

- `intervalMs`（既定 20）ごとに目を覚まし、予定よりどれだけ遅れて呼ばれたかを測る
- 遅れが `thresholdMs`（既定 100）以上なら、`onLag({ lagMs, at })` を呼ぶ。`lagMs` はミリ秒の整数、`at` は `Date`
- `stats()` は、これまでの遅れの最大（ミリ秒の整数）と、`onLag` を呼んだ回数を `{ max, count }` で返す
- `stop()` で見張りをやめる
- 見張りのタイマーは、**プロセスを引き止めない**（見張りがいるせいでプロセスが終わらない、ということが無いように）
- `intervalMs`・`thresholdMs` が正の数でなければ `RangeError`

```sh
$ node --test lag-monitor.test.mjs
ℹ pass 6
ℹ fail 0
```

完成したら、問題2の `report-server.mjs`（直す前のもの）の先頭で `createLagMonitor({ onLag: ({ lagMs }) => console.warn(`イベントループが ${lagMs}ms 止まった`) })` を動かし、`/report?n=5000000` を送ってみてください。Worker で直した後は、警告が出なくなることも確かめます。
