# 第66章 監視とパフォーマンス

公開したアプリは、だれも見ていない夜中にも動いています。遅くなった、エラーが増えた、メモリが増え続けている。こうしたことに、利用者に言われる前に気づき、どこが悪いかを調べられるようにするのが**監視**（monitoring）です。この章では、ログ・数（メトリクス）・負荷をかけて計る・CPU プロファイルで原因を探す、を手を動かして確かめ、最後に、台を増やしたときに起きることと、その直し方を学びます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 4〜5時間 |
| 前提 | 第5部 第26章 6節（pino の構造化ログ）、第3部 第13章 7節（イベントループの遅れ）、第10部 第55章 10節（`errorId`）、第60〜62章、第6部 第34章（Redis） |
| この章のゴール | 何を見張るか（遅さ・量・エラー・混み具合）を説明できる / 構造化ログを `errorId`・`reqId` で探せる / リクエストの数とかかった時間を数え、`/metrics` で出せる / 負荷をかけて、平均でなくパーセンタイルで遅さを計れる / CPU プロファイルで、時間を使っている関数を見つけて直せる / 台を増やしたときに、メモリに持った状態が分かれることを説明し、Redis で直せる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 見張れるようにしたアプリ（`app.ts`）、数える部品、ログを探す・負荷をかける・プロファイルをまとめる道具、小さなロードバランサ |
| [exercises/](exercises/) | 練習問題（テストで確かめる） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、`~/dev/part12/ch66-monitoring/` で実行します（`cd ~/dev/part12/ch66-monitoring`）。
> - アプリは **9867**（2台目は 9868）、7節のロードバランサは **9860** で待ちます。ターミナルを2〜4個使います。
> - 7節と練習問題8で、第6部の compose の Redis（127.0.0.1:6380）を使います（`(cd ~/dev/part06 && docker compose up -d --wait)`）。
> - 本物の監視のサービス（Grafana、Datadog、Sentry など）は使いません。8節で、選び方だけを説明します。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| 構造化ログと `errorId`（2節） | 成果物（問い合わせに答える）、第13部 |
| メトリクスと `/metrics`（3節） | 成果物、第13部 |
| 負荷をかけて計る・プロファイル（4・5節） | 第13部（自分のアプリが遅いとき） |
| 台を増やす・状態を Redis に（7節） | 成果物（SSE を Redis の Pub/Sub で全台に配る） |

---

## 1. 何を見張るか

### 1.1 3つの手がかり

| 手がかり | 中身 | 答えられる問い |
| --- | --- | --- |
| **ログ**（logs） | 出来事を1つずつ書いたもの（第5部 第26章の1行1つの JSON） | 「このエラーは、どの頼みで、なぜ起きたか」 |
| **メトリクス**（metrics） | 数（1秒あたりの頼みの数、かかった時間の分布、メモリ） | 「いつから遅くなったか」「エラーは何 % か」 |
| **トレース**（traces） | 1つの頼みが、どのサービス・どの SQL にどれだけ時間を使ったか | 「遅い頼みの、どこが遅いか」（この章では名前だけ。OpenTelemetry で集める） |

ログは詳しいけれど量が多く、メトリクスは数だけだけれど軽くて長く残せます。ふだんはメトリクスで見張り、おかしいと分かったらログで原因を探します。

### 1.2 4つの数

Web のアプリでは、まず次の4つを見ます（Google の SRE の本の「4つのゴールデンシグナル」）。

| 数 | 例 |
| --- | --- |
| **遅さ**（latency） | かかった時間の p50・p95・p99（4節） |
| **量**（traffic） | 1秒あたりの頼みの数 |
| **エラー**（errors） | 500 の割合 |
| **混み具合**（saturation） | CPU・メモリ・イベントループの遅れ・データベースの接続の空き・ジョブの列の長さ（第64章） |

## 2. ログで探す

### 2.1 アプリを起動する

[samples/app.ts](samples/app.ts) は、この章で見張るアプリです。

| パス | すること |
| --- | --- |
| `/fast` | すぐ返す |
| `/io` | 50 ミリ秒待ってから返す（データベースを待つつもり。待つ間、ほかの頼みを受けられる） |
| `/cpu` | 30 ミリ秒ほど計算してから返す（素数を数える。計算の間、イベントループは止まる） |
| `/boom` | わざと例外を投げる |
| `/metrics` | 数を出す（3節） |
| `/visits` | 訪問の数（7節） |
| `/healthz` | 元気かどうか |

頼みが終わるたびに、ログを1行書きます。1行1つの JSON です。

```ts
res.once('finish', () => {
  const seconds = (performance.now() - start) / 1000;
  // …（3節で数える）
  logger.info({ reqId, method: req.method, url: req.originalUrl, status: res.statusCode, ms: Math.round(seconds * 1000) }, 'request');
});
```

500 のときは、中身を見せずに `errorId` を返し、ログには詳しく書きます（第10部 第55章 10節）。

```ts
app.use((err: unknown, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  const errorId = crypto.randomUUID();
  logger.error({ reqId: res.getHeader('X-Request-Id'), errorId, err }, 'unhandled error');
  res.status(500).json({ title: 'サーバの中でエラーが起きました', errorId });
});
```

### 2.2 手を動かす: ログをファイルにも残す

本番では、アプリはログを標準出力に書くだけにして、PaaS やログのサービスが集めます（ファイルに書くと、コンテナを入れ替えたときに消えるため。第62章 2節）。ここでは、画面に出しながらファイルにも残すため、**`tee`** を使います。`コマンド | tee ファイル` は、受け取ったものを、画面とファイルの両方に書きます。

```sh
$ node samples/app.ts | tee app.log
{"level":30,"time":1795014150121,"app":"ch66","instance":"a","port":9867,"msg":"起動しました"}
```

別のターミナルで、頼みを送ります。

```sh
$ curl -s http://127.0.0.1:9867/cpu
{"primes":25997}
$ curl -s http://127.0.0.1:9867/boom
{"title":"サーバの中でエラーが起きました","errorId":"bdd918fa-f3fc-4364-a5f3-1869abf36f82"}
```

### 2.3 手を動かす: ログを探す道具

利用者から「`bdd918fa-…` というエラーが出ました」と言われたとします。`samples/log-query.ts` を作って、標準入力から読んだログのうち、条件に合う行だけを出します。

```ts
import readline from 'node:readline';
import { parseArgs } from 'node:util';

const { values } = parseArgs({ options: { slow: { type: 'string' }, id: { type: 'string' } } });
const slowMs = values.slow === undefined ? undefined : Number(values.slow);

const rl = readline.createInterface({ input: process.stdin });
for await (const line of rl) {
  let entry: unknown;
  try {
    entry = JSON.parse(line);
  } catch {
    continue; // JSON でない行は飛ばす
  }
  if (typeof entry !== 'object' || entry === null) continue;
  const ms = 'ms' in entry ? entry.ms : undefined;
  if (slowMs !== undefined && !(typeof ms === 'number' && ms >= slowMs)) continue;
  if (values.id !== undefined) {
    const ids = ['errorId' in entry ? entry.errorId : undefined, 'reqId' in entry ? entry.reqId : undefined];
    if (!ids.includes(values.id)) continue;
  }
  console.log(line);
}
```

| 書き方 | 意味 |
| --- | --- |
| `readline.createInterface({ input: process.stdin })` と `for await` | 標準入力を1行ずつ読む（第3部 第15章） |
| `parseArgs` | `--slow 25` のような引数を読む（第3部 第16章） |
| `'ms' in entry` | JSON に `ms` があるか。`entry` は `unknown` なので、確かめてから使う（第7部 第36章） |
| `continue` | 合わないので、次の行へ |

`< ファイル` で、ファイルを標準入力に渡します（第1部 第1章）。まず `errorId` で探します。

```sh
$ node samples/log-query.ts --id bdd918fa-f3fc-4364-a5f3-1869abf36f82 < app.log
{"level":50,"time":1795014150793,"app":"ch66","instance":"a","reqId":"75f93ca0-7bdb-4dc0-8716-d5a4976a4e38","errorId":"bdd918fa-f3fc-4364-a5f3-1869abf36f82","err":{"type":"Error","message":"データベースにつながりません（わざと）","stack":"…"},"msg":"unhandled error"}
```

（`stack` の中身は長いので `…` にしました。）エラーの行に `reqId` があるので、その頼みのログを全部出せます。

```sh
$ node samples/log-query.ts --id 75f93ca0-7bdb-4dc0-8716-d5a4976a4e38 < app.log
{"level":50,…,"reqId":"75f93ca0-7bdb-4dc0-8716-d5a4976a4e38","errorId":"bdd918fa-…","err":{…},"msg":"unhandled error"}
{"level":30,"time":1795014150794,"app":"ch66","instance":"a","reqId":"75f93ca0-7bdb-4dc0-8716-d5a4976a4e38","method":"GET","url":"/boom","status":500,"ms":2,"msg":"request"}
```

（1行目は上と同じ行なので、途中を `…` にしました。）`/boom` への GET で、「データベースにつながりません」で失敗した、と分かりました。`--slow 25` なら、25 ミリ秒以上かかった頼みだけが出ます。うまく動かないときは、[samples/log-query.ts](samples/log-query.ts) と比べてください。

本番では、こうした探し方を、ログのサービス（8節）の検索の欄でします。だからこそ、ログを**決まった名前の項目を持つ JSON** で書いておくことが大事です。文の中に id を埋め込むと、こうは探せません。ログには、パスワード・Cookie・トークン・メールの本文を書きません（第5部 第26章 6.3節）。

## 3. 数を数える（メトリクス）

### 3.1 カウンタとヒストグラム

| 種類 | 中身 | 例 |
| --- | --- | --- |
| **カウンタ**（counter） | 増えるだけの数。「1分でいくつ増えたか」を後で計算する | 頼みの数、エラーの数 |
| **ゲージ**（gauge） | 今の値。増えも減りもする | メモリ、列の長さ、イベントループの遅れ |
| **ヒストグラム**（histogram） | 値を、決めた区切り（バケツ）ごとに数える | かかった時間（10ms 以下がいくつ、50ms 以下がいくつ…） |

かかった時間を「平均」だけで持つと、遅い人がいても隠れます（第3部 第13章 7節）。ヒストグラムなら、後で p95・p99 を推定できます（練習問題5）。

### 3.2 手を動かす: カウンタを書く

ラベル（`method`・`route`・`status` など）の組ごとに数えるカウンタを、`samples/my-counter.ts` に書いてみます（完成形は [samples/metrics.ts](samples/metrics.ts) の `Counter`）。

```ts
class Counter {
  readonly name: string;
  readonly #values = new Map<string, number>();
  constructor(name: string) {
    this.name = name;
  }

  inc(labels: Record<string, string>): void {
    const key = '{' + Object.entries(labels).map(([k, v]) => `${k}="${v}"`).join(',') + '}';
    this.#values.set(key, (this.#values.get(key) ?? 0) + 1);
  }

  render(): string {
    return [...this.#values].map(([key, v]) => `${this.name}${key} ${v}`).join('\n');
  }
}

const c = new Counter('http_requests_total');
c.inc({ method: 'GET', status: '200' });
c.inc({ method: 'GET', status: '200' });
c.inc({ method: 'GET', status: '500' });
console.log(c.render());
```

```sh
$ node samples/my-counter.ts
http_requests_total{method="GET",status="200"} 2
http_requests_total{method="GET",status="500"} 1
```

| 書き方 | 意味 |
| --- | --- |
| `#values` | クラスの外から見えない項目（第7部 第36章） |
| ラベルを `{method="GET",status="200"}` の文字列にして、`Map` のキーにする | 同じラベルの組は、同じキーになる |
| `名前{ラベル} 数` の行 | **Prometheus**（よく使われるメトリクスの集め方）の文字の形。集める側が、決まった間隔で `/metrics` を読みに来る |

### 3.3 手を動かす: /metrics を見る

`app.ts` は、頼みが終わるたびに、カウンタとヒストグラムに数えています。

```ts
const r: unknown = req.route; // ルートが決まったときだけある（Express の型では any なので unknown で受ける）
const route = typeof r === 'object' && r !== null && 'path' in r && typeof r.path === 'string' ? r.path : 'unmatched'; // URL ではなくルートの形で数える
requests.inc({ method: req.method, route, status: String(res.statusCode) });
duration.observe(seconds);
```

```sh
$ curl -s http://127.0.0.1:9867/metrics
# HELP http_requests_total リクエストの数
# TYPE http_requests_total counter
http_requests_total{method="GET",route="/cpu",status="200"} 1
http_requests_total{method="GET",route="/boom",status="500"} 1
# HELP http_request_duration_seconds リクエストにかかった秒数
# TYPE http_request_duration_seconds histogram
http_request_duration_seconds_bucket{le="0.01"} 1
http_request_duration_seconds_bucket{le="0.05"} 2
http_request_duration_seconds_bucket{le="0.1"} 2
http_request_duration_seconds_bucket{le="0.25"} 2
http_request_duration_seconds_bucket{le="0.5"} 2
http_request_duration_seconds_bucket{le="1"} 2
http_request_duration_seconds_bucket{le="+Inf"} 2
http_request_duration_seconds_sum 0.03596712899999989
http_request_duration_seconds_count 2
# HELP nodejs_eventloop_lag_p99_seconds 前に聞かれてからの、イベントループの遅れの 99 パーセンタイル（秒）
# TYPE nodejs_eventloop_lag_p99_seconds gauge
nodejs_eventloop_lag_p99_seconds 0.011624447
# HELP nodejs_heap_used_bytes 使っているヒープ
# TYPE nodejs_heap_used_bytes gauge
nodejs_heap_used_bytes 20297144
```

（`app.ts` を起動し直して、`/cpu` と `/boom` を1回ずつ送った後の出力です。数は、それまでに送った頼みで変わります。）

| 行 | 意味 |
| --- | --- |
| `_bucket{le="0.05"} 2` | 0.05 秒**以下**だったものが 2 つ（`le` は less than or equal。下の区切りの分も含めた、累積の数） |
| `_bucket{le="+Inf"}` | 全部の数（`_count` と同じ） |
| `_sum` | かかった時間の合計。`_sum ÷ _count` で平均 |

ラベルに **URL そのもの**（`/tasks/123`）を入れてはいけません。タスクの数だけラベルの組ができ、集める側のメモリがあふれます（**カーディナリティ**の爆発）。`req.route.path`（`/tasks/:id`）のような、ルートの形を使います（練習問題6）。

## 4. 負荷をかけて計る

### 4.1 手を動かす: 小さな負荷の道具

同時に何本も頼みを送り続け、かかった時間を全部記録する道具を、`samples/load.ts` に作ります。

```ts
const [url = 'http://127.0.0.1:9867/fast', c = '10', s = '5'] = process.argv.slice(2);
const concurrency = Number(c);
const endAt = performance.now() + Number(s) * 1000;
const times: number[] = [];
let errors = 0;

async function worker() {
  while (performance.now() < endAt) {
    const start = performance.now();
    try {
      const res = await fetch(url, { signal: AbortSignal.timeout(10_000) });
      await res.arrayBuffer(); // 本文を最後まで読む
      if (!res.ok) errors += 1;
    } catch {
      errors += 1;
    }
    times.push(performance.now() - start);
  }
}

await Promise.all(Array.from({ length: concurrency }, () => worker()));

times.sort((a, b) => a - b);
const pick = (p: number) => times[Math.min(times.length - 1, Math.ceil((p / 100) * times.length) - 1)] ?? 0;
console.log(`${url}  同時 ${concurrency}・${s} 秒`);
console.log(`  ${times.length} 回（毎秒 ${(times.length / Number(s)).toFixed(0)} 回）、失敗 ${errors} 回`);
console.log(`  p50 ${pick(50).toFixed(1)}ms  p95 ${pick(95).toFixed(1)}ms  p99 ${pick(99).toFixed(1)}ms  最大 ${pick(100).toFixed(1)}ms`);
```

| 書き方 | 意味 |
| --- | --- |
| `performance.now()` | 細かい時刻（ミリ秒、小数あり）。時間を計るのに使う。`Date.now()` は時計を合わせ直すと飛ぶことがある |
| `Array.from({ length: 10 }, () => worker())` | `worker()` を 10 回呼んで、10 個の Promise の配列を作る。10 本が同時に頼みを送る |
| `times.sort((a, b) => a - b)` | 小さい順に並べる（数として比べる。第3部 第11章） |
| `pick(95)` | 小さい方から 95 % の位置の値 = **p95**（95 パーセンタイル）。100 人中 95 人は、これ以下の時間で返ってきた |

### 4.2 手を動かす: 3つのパスを比べる

`app.ts` を動かしたまま、3つのパスに、同時 10 本で 5 秒ずつ負荷をかけます。

```sh
$ node samples/load.ts http://127.0.0.1:9867/fast 10 5
http://127.0.0.1:9867/fast  同時 10・5 秒
  45788 回（毎秒 9158 回）、失敗 0 回
  p50 0.8ms  p95 2.0ms  p99 9.3ms  最大 68.7ms
$ node samples/load.ts http://127.0.0.1:9867/io 10 5
http://127.0.0.1:9867/io  同時 10・5 秒
  952 回（毎秒 190 回）、失敗 0 回
  p50 51.6ms  p95 54.3ms  p99 76.2ms  最大 123.8ms
$ node samples/load.ts http://127.0.0.1:9867/cpu 10 5
http://127.0.0.1:9867/cpu  同時 10・5 秒
  176 回（毎秒 35 回）、失敗 0 回
  p50 233.9ms  p95 505.4ms  p99 568.7ms  最大 844.9ms
```

（数は Mac の速さで変わります。執筆の環境の値です。）

| パス | 1つにかかる時間 | 同時 10 本のとき | なぜ |
| --- | --- | --- | --- |
| `/io` | 50ms | p50 は 51.6ms のまま。毎秒 190 回（≒ 10 本 ÷ 0.05 秒） | 待っている間、ほかの頼みを受けられる。10 本が並んで待つ |
| `/cpu` | 30ms | p50 は 233.9ms。毎秒 35 回（≒ 1 ÷ 0.03 秒） | 計算の間はイベントループが止まるので、1つずつしか進まない。10 本は**行列**になり、自分の番を待つ |

### 4.3 手を動かす: 重い頼みは、ほかの人も遅くする

もっと困るのは、`/cpu` が動いていると、**すぐ返るはずの `/fast` まで遅くなる**ことです。2つのターミナルで、ほぼ同時に動かします。

```sh
$ node samples/load.ts http://127.0.0.1:9867/cpu 5 5
```

```sh
$ node samples/load.ts http://127.0.0.1:9867/fast 5 4
http://127.0.0.1:9867/fast  同時 5・4 秒
  106 回（毎秒 27 回）、失敗 0 回
  p50 179.2ms  p95 341.6ms  p99 703.2ms  最大 819.0ms
```

ひとりで 0.8ms だった `/fast` の p50 が、179.2ms になりました。そのとき `/metrics` を見ると、イベントループの遅れも大きくなっています。

```sh
$ curl -s http://127.0.0.1:9867/metrics | grep lag
…
nodejs_eventloop_lag_p99_seconds 0.255066111
```

もう1つ大事なことがあります。`app.ts` のログの `ms`（サーバが計った時間）を見ると、`/cpu` はいつも 30ms 前後で、`/fast` は数 ms です。サーバは「頼みを受け取ってから返すまで」しか計れないので、**イベントループが止まっていて、受け取るまで待たされた時間**は、どこにも出てきません。利用者が感じる遅さは、負荷の道具（外から計った時間）とイベントループの遅れで見ます。

## 5. 計測してから直す

### 5.1 手を動かす: CPU プロファイルを取る

遅い所を、勘で直してはいけません。まず、どの関数が時間を使っているかを計ります（第3部 第13章 7節で名前だけ出した **CPU プロファイル**）。`app.ts` を `Ctrl+C` で止め、`--cpu-prof` を付けて起動し直します。

| オプション | 意味 |
| --- | --- |
| `--cpu-prof` | 動いている間、どの関数が動いているかを、細かい間隔で記録する。終わるときに `.cpuprofile` のファイルに書く |
| `--cpu-prof-dir=prof` | ファイルを書くフォルダ |

```sh
$ node --cpu-prof --cpu-prof-dir=prof samples/app.ts
```

別のターミナルで負荷をかけてから、1つ目のターミナルで `Ctrl+C` を押して止めます（止めるときにファイルが書かれます）。

```sh
$ node samples/load.ts http://127.0.0.1:9867/cpu 5 3
```

[samples/cpu-top.ts](samples/cpu-top.ts) は、`.cpuprofile` を読んで、時間を使った関数の上位を出す道具です（中身は読まなくてよい）。

```sh
$ ls prof
CPU.20261118.150113.18715.0.001.cpuprofile
$ node samples/cpu-top.ts prof/CPU.20261118.150113.18715.0.001.cpuprofile
合わせて 4764ms
   3071ms  64.5%  countPrimes app.ts:56
   1436ms  30.1%  (idle)
     16ms   0.3%  __require index:8
     16ms   0.3%  wrapSafe loader:1819
     13ms   0.3%  compileForInternalLoader realm:383
      8ms   0.2%  Module
      8ms   0.2%  (garbage collector)
      7ms   0.1%  realpathSync node:fs:2781
```

（ファイルの名前は、動かした日時で変わります。）`countPrimes` が CPU の時間の 64.5 % を使っていました（`(idle)` は何もしていなかった時間）。同じファイルを Chrome の DevTools の Performance パネルにドラッグすると、時間の流れに沿った図（フレームグラフ）で見られます。

### 5.2 手を動かす: 直して、もう一度計る

`countPrimes` は、数ごとに割り算を繰り返しています。`app.ts` には、同じ数を**エラトステネスのふるい**（小さい素数の倍数に、順に印を付けていく）で数える `countPrimesSieve` も入れてあります。`PRIMES=sieve` を付けて起動すると、`/cpu` がこちらを使います。

```ts
function countPrimesSieve(limit: number): number {
  const composite = new Uint8Array(limit + 1); // 0 なら素数の候補
  let count = 0;
  for (let n = 2; n <= limit; n += 1) {
    if (composite[n] === 1) continue;
    count += 1;
    for (let m = n * n; m <= limit; m += n) composite[m] = 1; // n の倍数に印を付ける
  }
  return count;
}
```

```sh
$ PRIMES=sieve node samples/app.ts
```

```sh
$ node samples/load.ts http://127.0.0.1:9867/cpu 10 5
http://127.0.0.1:9867/cpu  同時 10・5 秒
  1626 回（毎秒 325 回）、失敗 0 回
  p50 27.9ms  p95 62.6ms  p99 67.1ms  最大 75.5ms
```

毎秒 35 回が 325 回に、p50 が 233.9ms から 27.9ms になりました。直す方法は、いつも「速い書き方」とは限りません。

| 直し方 | 向いている場面 |
| --- | --- |
| 書き方を変える（この節） | 計算のやり方に無駄がある |
| 結果を覚える（第65章、第6部 第34章） | 同じ計算・同じ問い合わせを何度もする |
| Worker に任せる（第3部 第13章） | 重い計算を、どうしても頼みの中でする |
| ジョブにする（第64章） | 結果をすぐ返さなくてよい |
| データベースの索引（第6部 第30章） | 遅いのが SQL（`EXPLAIN` で確かめる） |

**直したら、同じ条件でもう一度計ります。**計らずに直すと、直ったかどうか分からず、関係の無い所を複雑にしてしまいます。

## 6. 本番で見張る

### 6.1 知らせる（アラート）

数を集めても、だれも見ていなければ意味がありません。決めた条件を超えたら、Slack やメールで知らせます。

| 知らせる条件の例 | 理由 |
| --- | --- |
| 5 分間、500 の割合が 1 % を超えた | 一瞬のエラーで夜中に起こされないよう、期間と割合で決める |
| 10 分間、p95 が 1 秒を超えた | 平均でなくパーセンタイル |
| 外からの `/healthz` が 3 回続けて失敗した | アプリが止まっている（外形監視。外のサービスから定期的に聞く） |
| ジョブの列（第64章）が 30 分減らない・dead の仕事が増えた | ワーカーが止まっている |
| データベースの接続の空きが無い | 第62章 4.2節の予算を超えた |

知らせるのは、「**利用者が困っていること**」を中心にします。CPU が 80 % でも、利用者が困っていなければ、夜中に起こす必要はありません。

### 6.2 エラーを集めるサービス

ログを探すほかに、例外を集めて「同じ例外が何回、いつから起きているか」をまとめて見せるサービスがあります（Sentry など）。アプリに SDK を入れると、例外・スタックトレース・そのときの頼みの情報を送ります。送る情報に、パスワードやトークンが入らないように設定します（執筆時点。必ず公式で確認）。

## 7. 台を増やす

### 7.1 ロードバランサ

1台で足りなくなったら、同じアプリを何台も動かし、前に**ロードバランサ**を置いて頼みを配ります。PaaS では、台数（インスタンスの数）を増やすだけで、PaaS のロードバランサが配ってくれます（第62章）。[samples/balancer.ts](samples/balancer.ts) は、その動きをまねた小さなロードバランサです。台を選ぶ所は、次のようになっています。

```ts
const targets = (process.env.TARGETS ?? 'http://127.0.0.1:9867,http://127.0.0.1:9868').split(',').map((t) => ({ url: new URL(t), up: true }));
let next = 0;

/** 次の台（元気なものだけ、順番に） */
function pick() {
  for (let i = 0; i < targets.length; i += 1) {
    const t = targets[(next + i) % targets.length];
    if (t?.up) {
      next = (next + i + 1) % targets.length;
      return t;
    }
  }
  return undefined;
}
```

| 書き方 | 意味 |
| --- | --- |
| `(next + i) % targets.length` | 次の台から順に、最後まで行ったら最初に戻って探す（**ラウンドロビン**） |
| `t?.up` | 元気な台だけを選ぶ。1 秒ごとに `/healthz` を聞いて `up` を決める（アクティブなヘルスチェック）。中継に失敗した台も、すぐ `up = false` にする（パッシブなヘルスチェック） |
| 全部だめなら `undefined` | ロードバランサは 503 を返す |

### 7.2 手を動かす: 2台に配る

4つのターミナルを使います。

```sh
$ node samples/app.ts                       # 1 つ目: 1 台目（a、9867）
$ PORT=9868 NAME=b node samples/app.ts      # 2 つ目: 2 台目（b、9868）
$ node samples/balancer.ts                  # 3 つ目: ロードバランサ（9860）
ロードバランサ: http://127.0.0.1:9860/ → 127.0.0.1:9867, 127.0.0.1:9868
```

4つ目のターミナルで、`/visits`（訪問の数）を4回聞きます。

```sh
$ for i in 1 2 3 4; do curl -s http://127.0.0.1:9860/visits; echo; done
{"instance":"a","visits":1}
{"instance":"b","visits":1}
{"instance":"a","visits":2}
{"instance":"b","visits":2}
```

a と b に交互に配られました。そして、**数がおかしい**ことに気づきます。4回訪問したのに、2 までしか数えていません。`/visits` は数を**それぞれの台のメモリ**に持っているので、台ごとに別々の数になるのです。

`?shared=1` を付けると、Redis の `INCR`（第6部 第34章）で数えます。

```sh
$ for i in 1 2 3 4; do curl -s 'http://127.0.0.1:9860/visits?shared=1'; echo; done
{"instance":"a","visits":1}
{"instance":"b","visits":2}
{"instance":"a","visits":3}
{"instance":"b","visits":4}
```

どちらの台に配られても、1つの数になりました。

次に、2つ目のターミナルで `Ctrl+C` を押して b を止めます。ロードバランサのターミナルに、こう出ます。

```
127.0.0.1:9868 は 答えません。配るのをやめます
```

その後は、全部 a に配られます（止めた直後の 1 秒の間に b に配られた頼みは、502 になることがあります）。b を起動し直すと、`戻りました` と出て、また交互になります。

### 7.3 メモリに持ってはいけないもの

台が2台以上になると、メモリに持ったものは、台ごとにばらばらになります。この教材で、メモリに持っていたものを振り返ります。

| メモリに持っていたもの | 2台にすると | 直し方 |
| --- | --- | --- |
| セッション（第4部 第22章の `SessionStore`、express-session の `MemoryStore`） | 別の台に配られると、ログインしていないことになる | PostgreSQL（第10部の成果物）か Redis に置く |
| 回数の制限（第5部 第24章の `rateLimit`） | 台の数だけ、上限が増える | Redis の `INCR`（第6部 第34章 4節） |
| SSE のハブ（第5部 第27章の `createEventHub`） | 台 a で起きた変更が、台 b につながっている人に届かない | Redis の Pub/Sub で全台に知らせ、それぞれの台が自分の客に送る（練習問題8、成果物） |
| アプリの中のキャッシュ（第65章 練習問題8） | 片方で消しても、もう片方に古いものが残る | Redis をキャッシュにするか、Pub/Sub で「消して」を知らせる |
| アップロードしたファイル（第63章） | 置いた台にしか無い | オブジェクトストレージ |

「どの台に配られても同じ結果になる」ように、状態はアプリの外（データベース・Redis・オブジェクトストレージ）に置きます。こうしたアプリを**ステートレス**（stateless）と呼びます。ロードバランサで「同じ人はいつも同じ台へ」（スティッキーセッション）とする方法もありますが、台が落ちたり入れ替わったりすると、結局ずれるので、まずステートレスにします。

## 8. 監視のサービスを選ぶ

| 種類 | 例（執筆時点。必ず公式で確認） |
| --- | --- |
| PaaS に付いているもの | Render の Logs・Metrics、Fly.io の Grafana |
| ログを集めて探す | Better Stack、Grafana Loki、Datadog Logs |
| メトリクスを集めてグラフに・知らせる | Prometheus + Grafana、Grafana Cloud、Datadog |
| エラーを集める | Sentry |
| 外から生きているか聞く | UptimeRobot、Better Stack の Uptime |
| トレース | OpenTelemetry（集め方の標準）+ Grafana Tempo・Jaeger・Datadog APM |

まずは PaaS のログとメトリクス、エラーを集めるサービス、外からの `/healthz` の監視、の3つで始めるのがよいでしょう。アプリ側は、この章の形（1行1つの JSON のログ、`errorId`・`reqId`、`/metrics`、`/healthz`）にしておけば、どのサービスにもつなげられます。`/metrics` は、外から読めないようにします（合言葉を付ける、内側の道からだけ読ませる）。中の様子が分かってしまうからです。

## 9. Flask との対応

Flask は、`app.logger`（Python の `logging`）でログを書き、gunicorn のワーカーを増やして同時に処理します。gunicorn は1台の中でプロセスを増やし、それぞれが別のメモリを持つので、この章の 7.3節と同じことが、1台の中でも起きます。

| Flask（Python） | この章（Node.js） |
| --- | --- |
| `app.logger.info(...)`、`python-json-logger` で JSON に | pino（最初から1行1つの JSON） |
| `prometheus_flask_exporter` の `/metrics` | 自分で書いた `Counter`・`Histogram`（本番では `prom-client` がよく使われる） |
| `gunicorn --workers 4` | 台を増やす、`node:cluster`、PaaS のインスタンスの数 |
| `py-spy` で CPU のプロファイル | `node --cpu-prof` と Chrome の DevTools |
| `locust` で負荷をかける | 自作の `load.ts`（本番の計測では autocannon・k6 などの道具） |
| `sentry-sdk[flask]` | `@sentry/node` |

## まとめ

- 見張るのは、遅さ（p95・p99）・量・エラーの割合・混み具合（イベントループの遅れ、接続、列の長さ）。
- ログは1行1つの JSON で、`reqId`・`errorId` を項目として書く。利用者には `errorId` だけを返す。
- メトリクスはカウンタ・ゲージ・ヒストグラム。ラベルには URL でなくルートの形を使う。
- 遅さは平均でなくパーセンタイルで計る。サーバの中で計った時間には、イベントループで待たされた時間が入らない。
- CPU の重い頼みは、ほかの頼みも遅くする。`--cpu-prof` で計ってから直し、同じ条件で計り直す。
- 台を増やしたら、メモリに持った状態（セッション・回数の制限・SSE・キャッシュ・ファイル）はアプリの外に置く。
- 知らせる条件は、利用者が困っていることを中心に、期間と割合で決める。

## 練習問題

[exercises/README.md](exercises/README.md) にあります。8問です。

## 参考資料

- Node.js「--cpu-prof」: https://nodejs.org/api/cli.html#--cpu-prof
- Node.js「perf_hooks.monitorEventLoopDelay」: https://nodejs.org/api/perf_hooks.html#perf_hooksmonitoreventloopdelayoptions
- Node.js「Flame Graphs」（プロファイルの見方）: https://nodejs.org/en/learn/diagnostics/flame-graphs
- Prometheus「Exposition formats」「Metric types」「Histograms and summaries」: https://prometheus.io/docs/
- Google「Site Reliability Engineering」6章 Monitoring Distributed Systems（4つのゴールデンシグナル）: https://sre.google/sre-book/monitoring-distributed-systems/
- OpenTelemetry「JavaScript」: https://opentelemetry.io/docs/languages/js/
- The Twelve-Factor App「VI. Processes」「XI. Logs」: https://12factor.net/

---

前の章: [第65章 CDN とキャッシュ](../ch65-cdn-cache/README.md) ／ 第12部の目次: [../README.md](../README.md) ／ 次: [成果物 画像添付・メール通知つきで独自ドメインに公開](../project-task-deploy/README.md)
