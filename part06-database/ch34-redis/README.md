# 第34章 キャッシュと Redis 入門

第5部では、回数の制限（第24章）、セッション（第24章の express-session）、SSE のハブ（第27章）を、サーバの**メモリ**に置きました。メモリに置いたものは、サーバを止めると消え、サーバを2台にすると、台ごとに別々になってしまいます。
この章では、そうしたものを置く場所として **Redis**（レディス）を使います。Redis は、キーと値の組をメモリに置く、とても速いデータベースです。キャッシュ、回数の制限、セッション、Pub/Sub（知らせを配る）を、手を動かして作ります。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 4〜5時間 |
| 前提 | 第32章（Docker と Compose、`compose.yaml`）、第5部 第24章（ミドルウェア、回数の制限、express-session）、第4部 第22章（Cookie とセッション） |
| この章のゴール | Redis が何に向いていて、何に向いていないかを説明できる / redis-cli で文字列・期限（TTL）・数・ハッシュを扱える / Node.js から Redis を使える / cache-aside でキャッシュを作り、データが変わったら消せる / `INCR` と期限で、サーバが何台でも正しく回数を制限できる / セッションを Redis に置き、2台のサーバで共有できる / Pub/Sub で、プロセスの間に知らせを配れる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形（`redis.mjs`・`first-redis.mjs`・`cache-try.mjs`・`counter-race.mjs`・`rate-limit-try.mjs`・`session-store.mjs`・`server.mjs`・`pubsub.mjs`） |
| [exercises/](exercises/) | 練習問題（テストは Redis を使う） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、`~/dev/part06/ch34-redis/` で実行します。手を動かして作るファイルは、このフォルダの直下に置きます。
>
>   ```sh
>   $ cd ~/dev/part06/ch34-redis
>   ```
>
> - Redis は、第32章の `compose.yaml` に、もう書いてあります。`docker compose up -d --wait` で、PostgreSQL と一緒に動きます。Mac の **6380** 番で待っています。
> - 5節で、ポート **9457** と **9458** で、同じサーバを2つ動かします。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| キャッシュ（3節） | 第12部 第65章（CDN と `Cache-Control`。キャッシュをどこに置くか）、第12部 第66章（計測してから速くする） |
| `INCR` と回数の制限（4節） | 第10部（ログインを何度も試されないように）、第12部（サーバを複数台にする） |
| セッションを Redis に（5節） | 第10部 第52章（ログインとセッション）、第12部（複数台） |
| Pub/Sub（6節） | 第12部 第64章（BullMQ で仕事の列。中で Redis を使う）、第12部 第66章（複数台で SSE を配る） |

---

## 0. Redis とは

| | PostgreSQL（第32章） | Redis（この章） |
| --- | --- | --- |
| データの形 | 表と行。SQL で探す | キーと値の組。キーを知っていれば、すぐ取り出せる |
| 置き場所 | ディスク（メモリはキャッシュとして使う） | メモリ（ディスクへの保存は、おまけ） |
| 速さ | 1回の SQL で 0.1〜数ミリ秒 | 1回のコマンドで 0.1 ミリ秒ほど |
| 期限 | 無い（自分で消す） | キーごとに「何秒後に消す」を付けられる（TTL） |
| 向いているもの | なくなっては困るデータ（タスク、ユーザー、注文） | なくなっても作り直せるもの、短い間だけのもの（キャッシュ、回数、セッション、知らせ） |

Redis の大事な性質:

- **コマンドは1つずつ順番に動きます**。ほかのコマンドが途中に割り込まないので、`INCR`（1 増やす）のようなコマンドは、何台のサーバから同時に送っても、数がずれません（4節）。
- **メモリに置く**ので、入れられる量はメモリの大きさまでです。いっぱいになったときの動き（古いものから消す、など）は設定で決めます。
- サーバを止めたときに、データをディスクに残す設定もありますが、**なくなっては困るデータの置き場所にはしません**。この教材の `compose.yaml` の Redis は、コンテナを消すとデータも消えると考えてください。

## 1. redis-cli で触る

`redis-cli` は、Redis にコマンドを打つための道具です。Redis のコンテナの中に入っています（第32章の psql と同じ考え方です）。

### 1.1 手を動かす: 文字列・期限・数

```sh
$ docker compose up -d --wait
$ docker compose exec redis redis-cli
127.0.0.1:6379>
```

`127.0.0.1:6379>` が出たら、コマンドを打てます（コンテナの中では、Redis は 6379 番で待っています）。

```text
127.0.0.1:6379> PING
PONG
127.0.0.1:6379> SET greeting hello
OK
127.0.0.1:6379> GET greeting
"hello"
127.0.0.1:6379> GET nothing
(nil)
127.0.0.1:6379> SET otp:alice 123456 EX 30
OK
127.0.0.1:6379> TTL otp:alice
(integer) 27
127.0.0.1:6379> TTL greeting
(integer) -1
127.0.0.1:6379> TTL nothing
(integer) -2
127.0.0.1:6379> INCR views:task:2
(integer) 1
127.0.0.1:6379> INCR views:task:2
(integer) 2
127.0.0.1:6379> INCRBY views:task:2 10
(integer) 12
127.0.0.1:6379> EXISTS greeting nothing
(integer) 1
```

| コマンド | 意味 |
| --- | --- |
| `PING` | つながっているか確かめる。`PONG` が返る |
| `SET キー 値` | キーに値を入れる（前の値は上書き） |
| `GET キー` | 値を読む。無ければ `(nil)`（JavaScript では `null`） |
| `SET キー 値 EX 秒` | 期限付きで入れる。秒がたつと、Redis が自動で消す |
| `TTL キー` | 消えるまでの残りの秒数。**`-1` は期限なし、`-2` はキーが無い** |
| `EXPIRE キー 秒` | 今あるキーに期限を付ける（付け直す） |
| `INCR キー`・`INCRBY キー 数` | 数を 1（か、その数）増やして、増やした後の数を返す。無いキーは 0 から |
| `EXISTS キー …` | あるキーの数 |
| `DEL キー …` | 消す。消した数を返す |

- Redis の値は、いつも**文字列**です。`INCR` は、文字列を数として読んで、1 増やして、また文字列で入れます。
- キーの名前は、`views:task:2` のように `:` で区切るのが習わしです（`種類:何の:どれ`）。Redis にとっては、ただの文字列です。

### 1.2 手を動かす: ハッシュ

1つのキーの中に、名前と値の組をいくつも入れられる**ハッシュ**もあります。

```text
127.0.0.1:6379> HSET user:alice name alice visits 1
(integer) 2
127.0.0.1:6379> HINCRBY user:alice visits 1
(integer) 2
127.0.0.1:6379> HGETALL user:alice
1) "name"
2) "alice"
3) "visits"
4) "2"
127.0.0.1:6379> SCAN 0 MATCH user:*
1) "0"
2) 1) "user:alice"
127.0.0.1:6379> DEL greeting otp:alice views:task:2 user:alice
(integer) 4
127.0.0.1:6379> QUIT
```

| コマンド | 意味 |
| --- | --- |
| `HSET キー 名前 値 …` | ハッシュに入れる。新しく足した名前の数を返す |
| `HINCRBY キー 名前 数` | ハッシュの中の数を増やす |
| `HGETALL キー` | 名前と値を、交互に全部返す |
| `SCAN 0 MATCH パターン` | パターンに合うキーを、少しずつ探す。1つ目の数（カーソル）が `0` に戻るまで、その数を渡して続ける |
| `QUIT` | redis-cli を終わる |

`KEYS パターン` という、キーを一度に全部探すコマンドもありますが、キーがたくさんあると、その間 Redis がほかのコマンドを受け付けなくなる（1つずつ順番に動くため）ので、本番では使いません。`SCAN` を使います。

Redis には、ほかにもリスト（`LPUSH`・`LRANGE`）、集合（`SADD`）、順位付きの集合（`ZADD`。ランキングに使う）などの型があります。この章では、文字列とハッシュだけを使います。

## 2. Node.js から Redis を使う

Node.js から Redis を使うパッケージは **redis**（node-redis）です。`setup-part06.sh` で、`~/dev/part06/node_modules` に入っています。

### 2.1 手を動かす: つなぐ部品

`redis.mjs` を作ります（完成形は [samples/redis.mjs](samples/redis.mjs)）。

```js
import { createClient } from 'redis';

// compose.yaml の Redis は、Mac の 127.0.0.1:6380 で待っている
export const REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6380';

export async function createRedis() {
  const redis = createClient({
    url: REDIS_URL,
    socket: {
      // 切れたら 0.5 秒ごとにつなぎ直す。5 回続けて失敗したらあきらめる（何もしないと、いつまでも試し続ける）
      reconnectStrategy: (retries) => (retries >= 5 ? new Error(`Redis につながりません（${REDIS_URL}）`) : 500),
    },
  });
  // error のイベントを受け取らないと、つながらないときに Node.js のプロセスが落ちる
  redis.on('error', (err) => console.error('Redis のエラー:', err.message));
  await redis.connect();
  return redis;
}
```

| 書いたもの | 意味 |
| --- | --- |
| `createClient({ url })` | Redis の接続を作る。`redis://ホスト:ポート` |
| `reconnectStrategy` | 切れたときに、何ミリ秒後につなぎ直すか。`Error` を返すと、あきらめる |
| `redis.on('error', …)` | 接続のエラーを受け取る。受け取らないと、プロセスが落ちる |
| `await redis.connect()` | つなぐ |
| `await redis.close()` | 送ったコマンドの返事を待ってから、閉じる |

- PostgreSQL の `pg` と違い、**プールは要りません**。node-redis は、1本の接続に、コマンドを次々と送り、返事を順に受け取ります（Redis がコマンドを1つずつ順番に動かすので、1本で足ります）。
- Redis が動いていないと、`Redis のエラー: connect ECONNREFUSED 127.0.0.1:6380` が何回か出た後、`Redis につながりません` で終わります。`docker compose up -d --wait` を確かめてください。

### 2.2 手を動かす: コマンドを送る

`first-redis.mjs` を作ります（完成形は [samples/first-redis.mjs](samples/first-redis.mjs)）。

```js
import { createRedis } from './redis.mjs';

const redis = await createRedis();

// 文字列: SET と GET。値は、いつも文字列で返る
await redis.set('greeting', 'こんにちは');
console.log('GET greeting:', await redis.get('greeting'));
console.log('無いキー:', await redis.get('no-such-key'));

// 期限付き: setEx(キー, 秒, 値)。ttl は残りの秒数（-1 は期限なし、-2 はキーが無い）
await redis.setEx('otp:alice', 30, '123456');
console.log('TTL otp:alice:', await redis.ttl('otp:alice'), ' TTL greeting:', await redis.ttl('greeting'), ' TTL 無いキー:', await redis.ttl('no-such-key'));

// 数: INCR は「読んで 1 足して書く」を1つのコマンドで行う。無いキーは 0 から
await redis.del('views:task:2');
console.log('INCR:', await redis.incr('views:task:2'), await redis.incr('views:task:2'), await redis.incr('views:task:2'));
console.log('GET で読むと文字列:', JSON.stringify(await redis.get('views:task:2')));

// オブジェクトは JSON の文字列にして入れる
const task = { id: 2, title: '本を返す', dueDate: '2026-11-12' };
await redis.set('task:2', JSON.stringify(task));
console.log('JSON で戻す:', JSON.parse(await redis.get('task:2')));

// ハッシュ: 1つのキーの中に、名前と値の組をいくつも持つ（値はやはり文字列）
await redis.hSet('user:alice', { name: 'alice', visits: 1 });
await redis.hIncrBy('user:alice', 'visits', 1);
console.log('HGETALL:', await redis.hGetAll('user:alice'));

// 消す。del は消した数を返す
console.log('DEL:', await redis.del(['greeting', 'otp:alice', 'views:task:2', 'task:2', 'user:alice']));

await redis.close();
```

```sh
$ node first-redis.mjs
GET greeting: こんにちは
無いキー: null
TTL otp:alice: 30  TTL greeting: -1  TTL 無いキー: -2
INCR: 1 2 3
GET で読むと文字列: "3"
JSON で戻す: { id: 2, title: '本を返す', dueDate: '2026-11-12' }
HGETALL: { name: 'alice', visits: '2' }
DEL: 5
```

| redis-cli | node-redis |
| --- | --- |
| `SET k v` | `await redis.set('k', 'v')` |
| `GET k` | `await redis.get('k')`（無ければ `null`） |
| `SET k v EX 30` | `await redis.setEx('k', 30, 'v')` |
| `TTL k`・`EXPIRE k 30` | `await redis.ttl('k')`・`await redis.expire('k', 30)` |
| `INCR k` | `await redis.incr('k')`（**number** で返る） |
| `HSET k a 1 b 2` | `await redis.hSet('k', { a: 1, b: 2 })` |
| `HGETALL k` | `await redis.hGetAll('k')`（オブジェクト。値は文字列。無ければ `{}`） |
| `DEL k1 k2` | `await redis.del(['k1', 'k2'])` |

- コマンドの名前は、`hSet`・`hGetAll` のように、2語目から大文字にした名前の関数です。
- オブジェクトは `JSON.stringify` で文字列にして入れ、`JSON.parse` で戻します。`Date` は文字列になるので、戻しても `Date` にはなりません（第5部 第25章の JSON と同じ）。

## 3. キャッシュ

**キャッシュ**は、作るのに時間のかかる結果を、近くの速い場所に取っておき、次から使い回すことです。

### 3.1 手を動かす: cache-aside

いちばんよく使われる形は **cache-aside**（キャッシュを脇に置く）です。

```text
読む:  1. Redis にあるか見る ──ある──▶ それを返す
                  │無い
                  ▼
       2. データベースから読む → 3. Redis に期限付きで入れる → 4. 返す
書く:  1. データベースを変える → 2. Redis のキャッシュを消す
```

`cache-try.mjs` を作ります（完成形は [samples/cache-try.mjs](samples/cache-try.mjs)）。データベースの代わりに、300 ミリ秒かかる関数を使います。

```js
import { setTimeout as sleep } from 'node:timers/promises';
import { createRedis } from './redis.mjs';

const redis = await createRedis();
const KEY = 'cache:tasks:open';

// データベースの代わり。読むのに 300 ミリ秒かかる、と考える
const table = [
  { id: 2, title: '本を返す' },
  { id: 5, title: '報告書を書く' },
];
async function loadFromDb() {
  await sleep(300);
  return table.map((t) => ({ ...t }));
}

// cache-aside: まずキャッシュを見る。無ければデータベースから読み、キャッシュに入れてから返す
async function listOpenTasks() {
  const hit = await redis.get(KEY);
  if (hit !== null) return { from: 'キャッシュ', tasks: JSON.parse(hit) };
  const tasks = await loadFromDb();
  await redis.setEx(KEY, 60, JSON.stringify(tasks)); // 60 秒たったら、Redis が自動で消す
  return { from: 'データベース', tasks };
}

async function measure(label) {
  const start = performance.now();
  const { from, tasks } = await listOpenTasks();
  console.log(`${label}: ${from}から ${(performance.now() - start).toFixed(1)} ミリ秒`, tasks.map((t) => t.title));
}

await redis.del(KEY);
await measure('1回目');
await measure('2回目');
await measure('3回目');

// データを変えたのに、キャッシュを消さないと……
table.push({ id: 6, title: '窓を拭く' });
await measure('変えた後（消さない）');

// 変えたら、キャッシュを消す（次に読んだ人が、新しいものを入れ直す）
await redis.del(KEY);
await measure('変えた後（消した）');

console.log('残りの秒数:', await redis.ttl(KEY));
await redis.del(KEY);
await redis.close();
```

```sh
$ node cache-try.mjs
1回目: データベースから 302.2 ミリ秒 [ '本を返す', '報告書を書く' ]
2回目: キャッシュから 0.6 ミリ秒 [ '本を返す', '報告書を書く' ]
3回目: キャッシュから 0.4 ミリ秒 [ '本を返す', '報告書を書く' ]
変えた後（消さない）: キャッシュから 0.3 ミリ秒 [ '本を返す', '報告書を書く' ]
変えた後（消した）: データベースから 301.7 ミリ秒 [ '本を返す', '報告書を書く', '窓を拭く' ]
残りの秒数: 60
```

（ミリ秒の数は、動かすたびに少し変わります。）

- 2回目からは、300 ミリ秒が 1 ミリ秒もかからなくなりました。
- 「変えた後（消さない）」では、データベースには「窓を拭く」があるのに、古い一覧が返っています。キャッシュを使うと、**古いものを見せてしまう**ことがあります。

### 3.2 キャッシュの決まり

| 決まり | 理由 |
| --- | --- |
| いつも期限（TTL）を付ける | 消し忘れても、期限が来れば新しくなる。使われないものが、メモリに残り続けない |
| データを変えたら、そのキャッシュを消す（先にデータベースを変えてから） | 次に読んだ人が、新しいもので作り直す。キャッシュを「書き換える」より、消す方が、まちがいが少ない |
| 古くても困らないものだけをキャッシュする | 一覧、人気のもの、外部の API の結果などは向いている。残高、在庫の数のように、いつも正しくないと困るものは向いていない |
| 人ごとに違うものは、キーに人を入れる | `cache:tasks:alice` のように。入れ忘れると、ほかの人のデータを見せてしまう |
| まず測ってから入れる | キャッシュは、古いデータ・消し忘れ・メモリという手間を増やす。遅くないものには要らない（第12部 第66章） |

- 期限がそろって切れた瞬間に、たくさんのリクエストが同時にデータベースへ行くことがあります（キャッシュの**スタンピード**）。人の多いサービスでは、期限を少しずつずらす、1人だけが作り直す、などの工夫をします。この教材では扱いません。
- 第4部 第19章の `Cache-Control` や、第5部 第25章の `ETag` は、**ブラウザ**に結果を取っておかせる仕組みでした。この章のキャッシュは、**サーバ**の中のキャッシュです。両方を組み合わせて使えます（第12部 第65章）。

## 4. 数を数える

### 4.1 手を動かす: 読んで足して書くと、数がずれる

`counter-race.mjs` を作ります（完成形は [samples/counter-race.mjs](samples/counter-race.mjs)）。

```js
import { createRedis } from './redis.mjs';

const redis = await createRedis();
await redis.del(['count:slow', 'count:incr']);

// 1. GET で読み、JavaScript で 1 足して、SET で書く。100 個を同時に動かす
await Promise.all(
  Array.from({ length: 100 }, async () => {
    const n = Number((await redis.get('count:slow')) ?? 0);
    await redis.set('count:slow', String(n + 1));
  }),
);
console.log('GET して SET:', await redis.get('count:slow'));

// 2. INCR は、Redis の中で「読んで足して書く」を1つのコマンドで行う
await Promise.all(Array.from({ length: 100 }, () => redis.incr('count:incr')));
console.log('INCR:        ', await redis.get('count:incr'));

await redis.del(['count:slow', 'count:incr']);
await redis.close();
```

```sh
$ node counter-race.mjs
GET して SET: 1
INCR:         100
```

1つ目は、100 回足したのに 1 です。100 個が、みな `GET` で `0` を読んでから、`SET` で `1` を書いたからです（第32章 6.2節の「読んでから書く」と同じ問題です）。`INCR` は、Redis の中で「読んで足して書く」を1つのコマンドで行い、Redis はコマンドを1つずつ順番に動かすので、ずれません。サーバが何台あっても同じです。

### 4.2 手を動かす: 回数の制限

第24章 5.3節の回数の制限を、Redis で数えます。「10 秒の窓の中で 5 回まで」です。`rate-limit-try.mjs` を作ります（完成形は [samples/rate-limit-try.mjs](samples/rate-limit-try.mjs)）。

```js
import { createRedis } from './redis.mjs';

const redis = await createRedis();
const LIMIT = 5; // 窓の中で 5 回まで
const WINDOW_SEC = 10; // 窓は 10 秒

async function hit(who) {
  const key = `rate:login:${who}`;
  // MULTI … EXEC: 中のコマンドを、ほかのコマンドに割り込まれずに、続けて動かす
  const [count, , ttl] = await redis
    .multi()
    .incr(key) // 数を 1 増やす（無ければ 1）
    .expire(key, WINDOW_SEC, 'NX') // 期限がまだ無いときだけ、10 秒の期限を付ける（窓の始まり）
    .ttl(key) // 窓が終わるまでの秒数
    .exec();
  return { count, allowed: count <= LIMIT, retryAfter: ttl };
}

await redis.del(['rate:login:alice', 'rate:login:bob']);
for (let i = 1; i <= 7; i++) {
  console.log(`alice の ${i} 回目:`, await hit('alice'));
}
console.log('bob の 1 回目:', await hit('bob'));
await redis.del(['rate:login:alice', 'rate:login:bob']);
await redis.close();
```

```sh
$ node rate-limit-try.mjs
alice の 1 回目: { count: 1, allowed: true, retryAfter: 10 }
alice の 2 回目: { count: 2, allowed: true, retryAfter: 10 }
alice の 3 回目: { count: 3, allowed: true, retryAfter: 10 }
alice の 4 回目: { count: 4, allowed: true, retryAfter: 10 }
alice の 5 回目: { count: 5, allowed: true, retryAfter: 10 }
alice の 6 回目: { count: 6, allowed: false, retryAfter: 10 }
alice の 7 回目: { count: 7, allowed: false, retryAfter: 10 }
bob の 1 回目: { count: 1, allowed: true, retryAfter: 10 }
```

| 書いたもの | 意味 |
| --- | --- |
| `redis.multi()…exec()` | MULTI と EXEC。間に並べたコマンドを、ほかのコマンドに割り込まれずに続けて動かし、結果を配列で返す |
| `.expire(key, 10, 'NX')` | 期限が**まだ無いときだけ**、10 秒の期限を付ける。窓の1回目で期限が付き、2回目からは付け直さない |
| `const [count, , ttl] = …` | 配列の1つ目と3つ目を取り出す（2つ目は使わないので、名前を書かない） |

- 期限を毎回付け直すと、試し続ける限り窓が終わらず、ずっと 429 のままになります。`'NX'` はそれを防ぎます。
- `INCR` と `EXPIRE` を別々に送ると、その間でプログラムが止まったとき、期限の無いキーが残り、その人はずっと制限されたままになります。MULTI でまとめて送り、さらに `'NX'` にしておけば、次の1回で期限が付きます。
- メモリで数えた第24章の版と違い、数は Redis にあるので、サーバを再起動しても、何台あっても、合わせて数えられます（5.2節で確かめます）。

## 5. セッションを Redis に

### 5.1 手を動かす: セッションの置き場所

第22章 4節では、セッションの中身を `Map` に置きました。それを Redis に置き換えます。`session-store.mjs` を作ります（完成形は [samples/session-store.mjs](samples/session-store.mjs)）。

```js
import crypto from 'node:crypto';

export function createSessionStore(redis, { ttlSec = 1800, prefix = 'sess:' } = {}) {
  const key = (id) => prefix + id;
  return {
    // 新しいセッションを作り、推測できない ID を返す（第22章 4.1節と同じ作り方）
    async create(data) {
      const id = crypto.randomBytes(32).toString('base64url');
      await redis.setEx(key(id), ttlSec, JSON.stringify(data));
      return id;
    },
    // 無い・期限切れなら null
    async get(id) {
      if (typeof id !== 'string' || id === '') return null;
      const json = await redis.get(key(id));
      return json === null ? null : JSON.parse(json);
    },
    async destroy(id) {
      if (typeof id === 'string' && id !== '') await redis.del(key(id));
    },
  };
}
```

- キーは `sess:` + ID です。中身は JSON にして、期限付きで入れます。期限が来れば、Redis が消してくれます（第22章の `Map` では、古いものを自分で消す必要がありました）。
- ID の作り方は、第22章 4.1節と同じ、推測できない 32 バイトのでたらめな値です。

### 5.2 手を動かす: 2台のサーバでセッションを共有する

`server.mjs` を作ります（完成形は [samples/server.mjs](samples/server.mjs)）。

```js
import express from 'express';
import { createRedis } from './redis.mjs';
import { createSessionStore } from './session-store.mjs';

const PORT = Number(process.env.PORT ?? 9457);
const redis = await createRedis();
const store = createSessionStore(redis, { ttlSec: 30 * 60 });

// Cookie の見出しから、名前が name の値を取り出す（第22章 2節の parseCookies を短くしたもの）
function readCookie(req, name) {
  for (const part of (req.headers.cookie ?? '').split(';')) {
    const [k, ...v] = part.trim().split('=');
    if (k === name) return decodeURIComponent(v.join('='));
  }
  return undefined;
}

// 回数の制限（4.2節）。数は Redis にあるので、サーバが何台あっても、合わせて数えられる
function rateLimit({ name, limit, windowSec }) {
  return async (req, res, next) => {
    const key = `rate:${name}:${req.ip}`;
    const [count, , ttl] = await redis.multi().incr(key).expire(key, windowSec, 'NX').ttl(key).exec();
    if (count > limit) {
      res.set('Retry-After', String(ttl));
      return res.status(429).json({ error: 'too many requests', retryAfter: ttl });
    }
    next();
  };
}

const app = express();
app.disable('x-powered-by');
app.use(express.json());

app.post('/login', rateLimit({ name: 'login', limit: 5, windowSec: 60 }), async (req, res) => {
  const name = req.body?.name;
  if (typeof name !== 'string' || !/^[a-z]{1,20}$/.test(name)) return res.status(422).json({ error: 'name は英小文字 1〜20 文字です' });
  // この教材では、パスワードの確かめは省く（第10部で扱う）
  await store.destroy(readCookie(req, 'sid')); // 前のセッションは消して、新しい ID にする（セッション固定化の対策。第22章 6.2節）
  const sid = await store.create({ name, loginAt: new Date().toISOString() });
  res.cookie('sid', sid, { httpOnly: true, sameSite: 'lax', maxAge: 30 * 60 * 1000 });
  res.json({ name, servedBy: PORT });
});

app.get('/me', async (req, res) => {
  const session = await store.get(readCookie(req, 'sid'));
  if (!session) return res.status(401).json({ error: 'ログインしていません' });
  // 全部のサーバで合わせた、このユーザーの /me の回数
  const visits = await redis.incr(`visits:${session.name}`);
  res.json({ ...session, visits, servedBy: PORT });
});

app.post('/logout', async (req, res) => {
  await store.destroy(readCookie(req, 'sid'));
  res.clearCookie('sid');
  res.sendStatus(204);
});

const server = app.listen(PORT, '127.0.0.1', () => console.log(`http://127.0.0.1:${PORT}/ で待っています（Ctrl+C で止める）`));

process.on('SIGINT', () => {
  server.close(async () => {
    await redis.close();
    process.exit(0);
  });
});
```

| 書いたもの | 意味 |
| --- | --- |
| `Number(process.env.PORT ?? 9457)` | 環境変数 `PORT` があればその番号で、無ければ 9457 で待つ |
| `res.cookie('sid', sid, { httpOnly: true, sameSite: 'lax', maxAge })` | Express の、`Set-Cookie` を書く関数。属性の意味は第22章と同じ |
| `res.clearCookie('sid')` | Cookie を消す `Set-Cookie` を書く |
| `rateLimit({ name: 'login', limit: 5, windowSec: 60 })` | 4.2節の回数の制限を、ミドルウェアにしたもの。1分に5回まで |

2つのターミナルで、ポートを変えて2つ動かします。

```sh
# ターミナル1
$ node server.mjs
http://127.0.0.1:9457/ で待っています（Ctrl+C で止める）
# ターミナル2
$ PORT=9458 node server.mjs
http://127.0.0.1:9458/ で待っています（Ctrl+C で止める）
```

3つ目のターミナルで、9457 でログインし、9458 で `/me` を見ます。`-c cookies.txt` は受け取った Cookie をファイルに書き、`-b cookies.txt` はそのファイルの Cookie を送るオプションです（第22章）。

```sh
$ curl -s -c cookies.txt -b cookies.txt -H 'content-type: application/json' -d '{"name":"alice"}' http://127.0.0.1:9457/login
{"name":"alice","servedBy":9457}
$ curl -s -b cookies.txt http://127.0.0.1:9458/me
{"name":"alice","loginAt":"2026-11-11T09:09:58.548Z","visits":1,"servedBy":9458}
$ curl -s -b cookies.txt http://127.0.0.1:9457/me
{"name":"alice","loginAt":"2026-11-11T09:09:58.548Z","visits":2,"servedBy":9457}
$ curl -s -b cookies.txt -c cookies.txt -X POST -o /dev/null -w '%{http_code}\n' http://127.0.0.1:9458/logout
204
$ curl -s -b cookies.txt http://127.0.0.1:9457/me
{"error":"ログインしていません"}
```

- 9457 でログインしたのに、9458 でもログインしたままです。セッションの中身が、どちらのサーバのメモリでもなく、Redis にあるからです。`visits` も、2台を合わせて数えています。
- `-w '%{http_code}\n'` は、応答のステータスコードだけを表示するオプションです（`-o /dev/null` で本文は捨てます）。

回数の制限も、2台を合わせて数えます。9457 と 9458 に、かわるがわる `/login` を送ると、上の alice のログインと合わせて6回目で 429 になります。

```sh
$ for i in 1 2 3 4 5; do curl -s -o /dev/null -w '%{http_code} ' -H 'content-type: application/json' -d '{"name":"bob"}' http://127.0.0.1:945$((7 + i % 2))/login; done; echo
200 200 200 200 429
```

（`for i in 1 2 3 4 5; do …; done` は、`…` を5回くり返す sh の書き方です。`$((7 + i % 2))` は計算で、8・7・8・7・8 になります。）

1分たつと、また通るようになります。両方のサーバは Ctrl+C で止めます。

redis-cli で、Redis の中を見てみます。

```sh
$ docker compose exec redis redis-cli --scan --pattern 'sess:*'
$ docker compose exec redis redis-cli TTL rate:login:127.0.0.1
```

- `redis-cli コマンド` と続けて書くと、そのコマンドを1つ動かして、すぐ終わります（psql の `-c` と同じです）。`--scan --pattern` は、`SCAN` をカーソルが `0` に戻るまで続けてくれるオプションです。

本番では、自分で書かずに、express-session と、その置き場所を Redis にするパッケージ（connect-redis）を組み合わせるのがふつうです（第10部）。中でしていることは、5.1節とほぼ同じです。

## 6. Pub/Sub

### 6.1 手を動かす: プロセスの間に知らせを配る

**Pub/Sub**（publish / subscribe）は、チャンネルの名前を決めて、`PUBLISH` で送った知らせを、そのチャンネルを `SUBSCRIBE` しているすべての接続に配る仕組みです。第27章のSSE のハブ（1つのプロセスの中で配る）を、プロセスの間に広げたものです。

`pubsub.mjs` を作ります（完成形は [samples/pubsub.mjs](samples/pubsub.mjs)）。

```js
import { createRedis } from './redis.mjs';

const CHANNEL = 'events:tasks';
const [mode, ...words] = process.argv.slice(2);
const redis = await createRedis();

if (mode === 'listen') {
  // subscribe した接続は、知らせを待つ専用になり、ほかのコマンド（GET など）は送れない
  await redis.subscribe(CHANNEL, (message) => {
    const event = JSON.parse(message);
    console.log(`受け取った: ${event.type} 「${event.title}」 (${event.at})`);
  });
  console.log(`${CHANNEL} を待っています（Ctrl+C で止める）`);
  process.on('SIGINT', async () => {
    await redis.close();
    process.exit(0);
  });
} else if (mode === 'send') {
  const event = { type: 'task.created', title: words.join(' ') || '（題名なし）', at: new Date().toISOString() };
  // publish は、今その場で受け取った接続の数を返す。だれも待っていなければ 0（知らせは残らない）
  const receivers = await redis.publish(CHANNEL, JSON.stringify(event));
  console.log(`配りました。受け取った数: ${receivers}`);
  await redis.close();
} else {
  console.log('使い方: node samples/pubsub.mjs listen  か  node samples/pubsub.mjs send 題名');
  await redis.close();
}
```

ターミナルを3つ使います。

```sh
# ターミナル1（ターミナル2 でも同じものを動かしてみる）
$ node pubsub.mjs listen
events:tasks を待っています（Ctrl+C で止める）
受け取った: task.created 「本を返す」 (2026-11-11T09:09:58.830Z)
# ターミナル3
$ node pubsub.mjs send 本を返す
配りました。受け取った数: 2
```

| 書いたもの | 意味 |
| --- | --- |
| `process.argv.slice(2)` | コマンドの後ろに書いた言葉の配列（第3部 第14章） |
| `redis.subscribe(チャンネル, (message) => …)` | チャンネルを待ち、知らせが来るたびに関数を呼ぶ |
| `redis.publish(チャンネル, 文字列)` | 知らせを配る。受け取った接続の数を返す |

### 6.2 Pub/Sub の決まり

- `subscribe` した接続は、待つ専用になり、`GET` などのほかのコマンドを送れません。1つのプロセスで、待ちながらほかのコマンドも送るときは、`redis.duplicate()` で同じ設定の接続をもう1本作り、そちらで `subscribe` します（練習問題7）。
- 知らせは、**その瞬間に待っている人にだけ**届き、どこにも残りません。待っている人がいなければ消えます（`受け取った数: 0`）。止まっていたサーバは、止まっていた間の知らせを受け取れません。
- 「必ず1回は処理したい」仕事（メールを送る、など）には、Pub/Sub ではなく、残る仕組み（Redis Streams や、それを使う BullMQ。第12部 第64章）を使います。
- サーバを複数台にして SSE を配るときは、どこかのサーバで起きたことを Pub/Sub で全部のサーバに配り、それぞれのサーバが、自分につながっているブラウザに SSE で送ります（第12部 第66章）。

## 7. Redis を使うときに気をつけること

| 気をつけること | 理由・どうするか |
| --- | --- |
| なくなっては困るデータを置かない | メモリに置くので、止まり方によっては消える。本当のデータは PostgreSQL に置き、Redis には「作り直せるもの」を置く |
| いつも期限を付ける（セッション・キャッシュ・回数） | 付け忘れたキーは、だれも消さないので、メモリを使い続ける |
| キーの名前を決めておく | `cache:`・`rate:`・`sess:` のように、用途ごとに頭をそろえる。`SCAN` で探しやすく、ほかの用途のキーとぶつからない |
| `KEYS` を使わない | キーが多いと、その間 Redis が止まる。`SCAN` を使う |
| ネットワークに出さない | この教材の Redis は、パスワードが無い。`compose.yaml` で `127.0.0.1:6380` にしているので、この Mac からしかつなげない。本番では、パスワード（ACL）を付け、外からつなげないようにする（第12部） |
| Redis が止まったときを考える | キャッシュや回数の制限なら、Redis が止まっても、遅くなるだけで動くようにできる（練習問題8）。セッションは、全員がログアウトしたことになる |

## 8. Flask との対応

| やりたいこと | Flask（Python） | この章 |
| --- | --- | --- |
| Redis につなぐ | redis-py の `redis.Redis.from_url('redis://…')` | node-redis の `createClient({ url })` |
| 期限付きで入れる | `r.set('k', 'v', ex=30)` | `redis.setEx('k', 30, 'v')` |
| キャッシュ | Flask-Caching の `@cache.cached(timeout=60)`（置き場所に Redis を選べる） | cache-aside を自分で書く（3節） |
| 回数の制限 | Flask-Limiter の `@limiter.limit('5 per minute')`（`storage_uri='redis://…'`） | `INCR` と `EXPIRE` で自分で書く（4.2節） |
| セッションを Redis に | Flask-Session の `SESSION_TYPE = 'redis'` | 5.1節の `createSessionStore`。本番は express-session と connect-redis |
| Pub/Sub | `p = r.pubsub(); p.subscribe('ch')`・`r.publish('ch', msg)` | `redis.subscribe('ch', fn)`・`redis.publish('ch', msg)` |

Flask の拡張は、デコレータを1行書くだけで使えますが、中では、この章で書いたことと同じことをしています。

## まとめ

- Redis は、キーと値をメモリに置く、速いデータベース。コマンドは1つずつ順番に動く。なくなっても作り直せるもの、短い間だけのものを置く。
- `SET`・`GET`・`SET … EX 秒`（`setEx`）・`TTL`（-1 は期限なし、-2 はキーが無い）・`INCR`・`DEL`・`HSET`・`HGETALL`・`SCAN`。値はいつも文字列なので、オブジェクトは JSON にする。
- cache-aside: まず Redis を見て、無ければデータベースから読み、期限付きで入れる。データを変えたら、キャッシュを消す。
- 数は `INCR` で増やす（読んで足して書くと、ずれる）。回数の制限は、`MULTI` で `INCR` と `EXPIRE … NX` をまとめて送る。
- セッションを Redis に置くと、サーバを止めても、何台あっても、同じセッションを使える。
- Pub/Sub は、待っている接続にだけ、その瞬間に配る。`subscribe` した接続は待つ専用になる。

## 練習問題

[exercises/README.md](exercises/README.md) に8問あります（基本4問・応用3問・発展1問）。テストは Redis を使うので、先に `docker compose up -d --wait` で動かしておきます。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- Redis 公式「Commands」: https://redis.io/docs/latest/commands/ （SET・EXPIRE・INCR・MULTI・SCAN・PUBLISH など）
- Redis 公式「Redis data types」: https://redis.io/docs/latest/develop/data-types/
- Redis 公式「Redis persistence」: https://redis.io/docs/latest/operate/oss_and_stack/management/persistence/
- node-redis（GitHub）: https://github.com/redis/node-redis
- Docker Hub「redis」: https://hub.docker.com/_/redis
- connect-redis（GitHub）: https://github.com/tj/connect-redis

---

前: [第33章 ORM とマイグレーション](../ch33-orm-drizzle/README.md) ／ 次: [第6部の成果物 タスク管理 API を PostgreSQL で](../project-task-api/README.md) ／ 部の目次: [第6部 データベース](../README.md)
