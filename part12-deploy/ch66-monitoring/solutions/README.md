# 第66章 模範解答

練習問題（[../exercises/README.md](../exercises/README.md)）の模範解答です。動かすときは、`exercises/` で `MODULE=../solutions/○○.ts` を付けてテストを動かします。問題8は Redis（第6部の compose）を動かしておきます。

| 問題 | ファイル | 確かめ方（`exercises/` で） |
| --- | --- | --- |
| 1 | [percentile.ts](percentile.ts) | `MODULE=../solutions/percentile.ts node --test percentile.test.ts` |
| 2 | [log-stats.ts](log-stats.ts) | `MODULE=../solutions/log-stats.ts node --test log-stats.test.ts` |
| 3 | [prom-text.ts](prom-text.ts) | `MODULE=../solutions/prom-text.ts node --test prom-text.test.ts` |
| 4 | このファイルの「問題4」 | |
| 5 | [histogram.ts](histogram.ts) | `MODULE=../solutions/histogram.ts node --test histogram.test.ts` |
| 6 | [http-metrics.ts](http-metrics.ts) | `MODULE=../solutions/http-metrics.ts node --test http-metrics.test.ts` |
| 7 | [target-pool.ts](target-pool.ts) | `MODULE=../solutions/target-pool.ts node --test target-pool.test.ts` |
| 8 | [shared-hub.ts](shared-hub.ts) | `MODULE=../solutions/shared-hub.ts node --test shared-hub.test.ts` |

---

## 問題1 パーセンタイルとまとめ

```ts
const sorted = values.toSorted((a, b) => a - b);
const rank = Math.max(1, Math.ceil((p / 100) * sorted.length));
return sorted[rank - 1] ?? 0;
```

- `sort` ではなく `toSorted` にしたのは、呼んだ人の配列を勝手に並べ替えないためです。`sort` は元の配列を書き換えます。テストの2つ目がこれを確かめます。
- パーセンタイルの決め方には、いくつかの流儀があります。nearest-rank は「実際にあった値のどれか」を返すので、分かりやすいのが良い所です。表計算ソフトの `PERCENTILE` のように、2つの値の間を比で求める（補間する）流儀もあります。比べるときは、同じ流儀で計ります。
- テストの4つ目のとおり、100 回のうち 1 回だけ 1 秒かかっても、平均は 10ms → 19.9ms と「少し遅くなった」ようにしか見えません。p99 も、ちょうど 100 個目なので出てきません。**最大**と、もっと上（p99.9）も見ると気づけます。

## 問題2 ログを読んで数える

```ts
const RequestLine = z.object({ msg: z.literal('request'), url: z.string(), status: z.number().int(), ms: z.number() });
const ErrorLine = z.object({ level: z.number().min(50), errorId: z.string(), err: z.object({ message: z.string() }).optional() });
```

- ログは、いろいろな版のアプリが書いたもの・ほかの道具が書いたものが混ざるので、「使う項目だけを確かめ、ほかはあってもよい」にしました。`z.object` は、知らない項目を捨てて通します（`z.strictObject` だと、`level` や `time` があるだけで失敗します）。
- `typeof entry !== 'object'` に加えて `Array.isArray(entry)` も調べたのは、`[1,2]` も `typeof` では `'object'` になるからです。
- `toSorted` は安定な並べ替え（同じ値の順番を変えない）と、JavaScript の決まりで決まっています。だから「同じ `ms` なら先に出た行が先」が、何もしなくても守られます。
- 本番では、こうした集計を、ログのサービスの検索の書き方（`status:5* | count by url` のようなもの）でします。何を数えたいかが分かっていれば、メトリクス（3節）にしておく方が、軽くて速いです。

## 問題3 カウンタを Prometheus の文字の形に

```ts
function escapeValue(v: string): string {
  return v.replaceAll('\\', '\\\\').replaceAll('"', '\\"').replaceAll('\n', '\\n');
}
```

- ラベルの値に `"` や改行がそのまま入ると、行や値の区切りが崩れ、集める側が読めなくなります（その行だけでなく、`/metrics` 全体を捨てることもあります）。ラベルの値に利用者の入力（ユーザーエージェントなど）を入れると、こうした文字が入りえます。問題6のとおり、そもそも利用者の入力をラベルにしないのが一番です。
- ラベルを名前の順に並べたのは、`{status, method}` と `{method, status}` を、同じ組として同じ行にするためです。集める側は順番を気にしませんが、自分で `Map` のキーにするときに、別の組として数えてしまいます。
- `# HELP` の行では `"` はエスケープしません（文字の形の決まり）。決まりは、Prometheus の「Exposition formats」にあります。

## 問題4 考えて答える

1. p99 が 2 秒なので、遅い方の 1 %、つまり 1 日に約 1 万回は 2 秒以上待っています。平均の 100ms からは、これが見えません。知らせる条件は、p95・p99 のようなパーセンタイル（と、エラーの割合）で決めます。平均は、遅い少数が多数の速い頼みに薄められるからです。
2. URL ごと（タスクの ID ごと、クエリの組み合わせごと）に別のラベルの組ができ、数え続けるもの（時系列）が際限なく増えます。アプリのメモリ（`Map` のキーの数）も、集める側のメモリとディスクも増え続け、いつか集める側が遅くなったり、止まったりします。これが**カーディナリティの爆発**です。ラベルには、種類が決まっているもの（ルートの形、メソッド、状態の番号の数）だけを使います。
3. どちらも正しく、計っている範囲が違います。`app.ts` の `ms` は、Express が頼みを受け取ってから返すまでの時間です。`/cpu` の計算でイベントループが止まっている間、`/fast` の頼みは、受け取られる前に待たされています（ソケットのデータを読むのも、イベントループの仕事なので）。その待ち時間は、サーバの中の時計には出てきません。利用者が感じるのは、負荷の道具で計った方（179.2ms）です。だから、イベントループの遅れ（`nodejs_eventloop_lag_p99_seconds`）を一緒に見ます。
4. 毎秒の回数はほとんど変わらず、p50 だけが短くなります。執筆の環境で試した出力です。

   ```
   http://127.0.0.1:9867/cpu  同時 1・5 秒
     134 回（毎秒 27 回）、失敗 0 回
     p50 33.4ms  p95 50.1ms  p99 55.9ms  最大 100.4ms
   ```

   イベントループは、計算を1つずつしかできないので、同時に何本送っても、1秒にこなせる数（約 30 回）は増えません。同時 10 本にしても、10 本が行列になって自分の番を待つので、待ち時間（p50）が約 10 倍になるだけです。同時 1 本のほうが毎秒の回数が少し少ないのは、1 本だと、1 つが返ってから次を送るまでの間（ネットワークと負荷の道具の処理）、サーバが何もしていないからです。CPU を使う処理を速くするには、台（プロセス）を増やすか、計算そのものを速くします（5.2節）。
5. ログインの頼みを受けた台（たとえば a）のメモリにだけ、セッションが作られます。次の頼みが台 b に配られると、b はそのセッション ID を知らないので、ログインしていないことになり、ログインのページに戻されます。a と b に交互に配られると、ページを移るたびに、ログインしたりしなかったりします。セッションは、PostgreSQL（第10部の成果物）か Redis に置きます。
6. データベースにつながらない台にも、ロードバランサは頼みを配り続けます。その台に配られた頼みは、全部 500 になります。ロードバランサには、「頼みを受けられるか」を答える `/readyz`（データベースに届くかも確かめる。第60章 8節）を見させます。ただし、データベースそのものが止まったときは、全部の台の `/readyz` が 503 になり、配れる台が無くなります。`/healthz`（プロセスが生きているか）は、起動し直すかどうかを決めるのに使い、データベースのことは含めません。データベースが止まっただけで、全部の台を起動し直しても直らないからです。

## 問題5 ヒストグラムと、分位数の推定

```ts
const rank = q * this.#count;
for (let i = 0; i < buckets.length; i += 1) {
  const b = buckets[i];
  if (!b || b.count < rank) continue;
  if (b.le === Infinity) return this.#bounds.at(-1) ?? 0;
  const lower = i === 0 ? 0 : (this.#bounds[i - 1] ?? 0);
  const below = i === 0 ? 0 : (buckets[i - 1]?.count ?? 0);
  const inBucket = b.count - below;
  if (inBucket === 0) return lower;
  return lower + (b.le - lower) * ((rank - below) / inBucket);
}
```

- ヒストグラムは、値そのものを覚えず、バケツごとの数だけを覚えます。何億回の頼みでも、覚えるのはバケツの数（ここでは 6 つ）と合計だけなので、メモリが増えません。その代わり、パーセンタイルは**推定**になります。
- 推定の誤差は、バケツの幅で決まります。テストの3つ目では、本当はどれも 0.15 なのに、p90 は 0.19 と出ました。知らせる条件の境目（たとえば「p95 が 1 秒」）の近くに区切りを置いておくと、その境目の前後を正しく見分けられます。
- 何台ものアプリのヒストグラムは、バケツごとの数を**足すだけ**でまとめられます。各台の p95 を平均しても、全体の p95 にはなりません。これが、パーセンタイルをアプリの中で計算して出すより、ヒストグラムで出すほうが好まれる理由です。

## 問題6 Express で、ルートの形ごとに数える

```ts
function routeOf(req: express.Request): string {
  const r: unknown = req.route;
  return typeof r === 'object' && r !== null && 'path' in r && typeof r.path === 'string' ? `${req.baseUrl}${r.path}` : 'unmatched';
}
```

- `req.route.path` だけだと、ルーターの下のルートは `/:id` になり、`/api/tasks/:id` と `/api/users/:id` が同じ `/:id` に数えられてしまいます。`req.baseUrl`（ルーターを `app.use` した道）を前に付けます。
- ルートに合わなかった頼みを `unmatched` にまとめるのは、問題4の2のとおり、知らない URL をラベルにしないためです。だれかが、ありえない URL を何百万種類も送ってきても、数えるものは増えません。
- 時間を `now` で受け取ったので、テストでは偽の時計で「30ms・300ms・3 秒」を作れました（第11部 第56章の「今」を引数で）。本物の時計で `setTimeout` して確かめると、遅いうえに、Mac が忙しいと落ちる不安定なテストになります。
- 本番では、`prom-client` のようなパッケージの `Counter`・`Histogram` を使い、この関数の中身はそれに置き換えます。ルートの形を使う、URL を書かない、という考え方は同じです。

## 問題7 台を選ぶ・続けて失敗した台を休ませる

```ts
reportFailure(target) {
  const s = find(target);
  if (!s) return;
  s.failures += 1;
  if (s.failures >= options.failThreshold) {
    s.downUntil = now() + options.cooldownMs;
    s.failures = options.failThreshold - 1;
  }
},
```

- 1 回の失敗ですぐ休ませないのは、ネットワークのたまたまの失敗で、元気な台を外さないためです。
- 休みが明けた台の失敗の数を `failThreshold - 1` にしておくと、明けた後の最初の1回で失敗したら、すぐまた休みます（半開き）。0 に戻すと、まだ直っていない台に、また `failThreshold` 回ぶんの頼みを送って、利用者にエラーを見せてしまいます。成功すれば `reportSuccess` で 0 に戻ります。
- 休んでいるかを、`up` という印ではなく `downUntil`（いつまで休むか）の時刻で持ったので、「休みが明けたら戻す」ためのタイマーが要りません。`pick` のたびに、今の時刻と比べるだけです。
- 本文の `balancer.ts` は、1 秒ごとに `/healthz` を聞く「アクティブ」なヘルスチェックでした。この問題は、本物の頼みの成功・失敗で決める「パッシブ」なヘルスチェックです。本物のロードバランサ（nginx、Envoy、クラウドのもの）は、両方を組み合わせます。

## 問題8 台をまたいで知らせを配る

```ts
async publish(userId, event) {
  await publisher.publish(channel, JSON.stringify({ userId, event }));
},
```

- 自分の台の客にも、直接配らずに Redis を通して届けます。直接配って、さらに Redis からも受け取ると、自分の台の客にだけ2回届きます。「全部の台が、同じ道（Redis）で受け取る」形にしておくと、台が1つでも10でも、同じコードで動きます。
- Redis から受け取ったものは、Zod で形を確かめました。同じ Redis を使うほかのプログラムや、古い版のアプリが、同じチャンネルに違う形のものを流すことがあるからです（外から来るものは確かめる。第7部 第38章）。
- Pub/Sub は「今つながっている人に流すだけ」で、残りません（第6部 第34章 6節）。台が再起動している間に流れた知らせは、その台の客には届きません。SSE の客は、つなぎ直したときに一覧を読み直す（第8部 第43章の `invalidateQueries`）ので、知らせが1つ消えても、画面は正しくなります。知らせを必ず届けたいなら、Redis Streams やジョブの列（第64章）を使います。
- `RedisClient` を、node-redis の型そのものではなく、「使う3つの関数だけの形」にしました。node-redis の `createClient()` の型は、モジュールや RESP の版で細かく変わり、ほかの所で作った接続を渡すと、型が合わないことがあるからです。使う所だけの形にしておくと、テストで偽物を渡すのも簡単になります。
