# 第34章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part06/ch34-redis/exercises/` で行います。最初に `cd exercises` で移動してください。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | JSON・数・残りの秒数 | [kv.mjs](kv.mjs)、[kv.test.mjs](kv.test.mjs) | 1, 2 |
| 2 | 基本 | cache-aside の関数 | [cached.mjs](cached.mjs)、[cached.test.mjs](cached.test.mjs) | 3 |
| 3 | 基本 | 窓の中の回数を数える | [hit.mjs](hit.mjs)、[hit.test.mjs](hit.test.mjs) | 4 |
| 4 | 基本 | Redis に置くもの・置かないもの（調べる問題） | このページ | 0, 3, 6, 7 |
| 5 | 応用 | 使うたびに延びるセッション | [session-store.mjs](session-store.mjs)、[session-store.test.mjs](session-store.test.mjs) | 5 |
| 6 | 応用 | リポジトリにキャッシュをかぶせる | [cached-repo.mjs](cached-repo.mjs)、[cached-repo.test.mjs](cached-repo.test.mjs) | 3 |
| 7 | 応用 | Pub/Sub の部品 | [broadcaster.mjs](broadcaster.mjs)、[broadcaster.test.mjs](broadcaster.test.mjs) | 6 |
| 8 | 発展 | 回数の制限のミドルウェア（Redis 版） | [redis-rate-limit.mjs](redis-rate-limit.mjs)、[redis-rate-limit.test.mjs](redis-rate-limit.test.mjs) | 4.2, 5.2 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

## テストの使い方

- テストは Redis を使います。先に `docker compose up -d --wait` で動かしておきます。動いていないと、`Redis につながりません` というエラーになります。
- テストは、テストごとに、キーの頭に付ける文字列（`test:` で始まる。テストの中では `prefix`）を決め、関数にはその頭で始まるキーを渡します。テストが終わると、その頭で始まるキーを全部消します。本文で作ったキーには触りません（[redis-test.mjs](redis-test.mjs)。書き換えなくてよいファイルです）。
- テストが渡す `redis` は、本文2.1節の `createRedis()` が返すものと同じように使えます（`redis.get`・`redis.setEx`・`redis.multi()` …）。
- 問題4以外は、`○○.mjs` の「ここを書く」を埋め、`node --test ○○.test.mjs` ですべてのテストが通れば完成です。期限を確かめるテストは、1〜3 秒ほど待つので、少し時間がかかります。

---

## 基本

### 問題1 JSON・数・残りの秒数

[kv.mjs](kv.mjs) に、4つの関数を書いてください（本文1・2節）。

| 関数 | 仕様 |
| --- | --- |
| `setJson(redis, key, value, ttlSec)` | `value` を JSON の文字列にして `key` に入れる。`ttlSec`（秒）が渡されたときだけ、期限を付ける |
| `getJson(redis, key)` | `key` の JSON を元の値に戻して返す。キーが無ければ **`undefined`**（`null` を入れたときと区別するため） |
| `countUp(redis, key)` | `key` の数を 1 増やし、増やした後の数を **number** で返す。無ければ `1` |
| `secondsLeft(redis, key)` | 消えるまでの秒数。期限が無ければ `Infinity`、キーが無ければ `null` |

```sh
$ node --test kv.test.mjs
ℹ pass 4
ℹ fail 0
```

ヒント:

- `ttlSec === undefined` かどうかで、`redis.set` と `redis.setEx` を使い分けます。
- `redis.ttl` は、期限が無いと `-1`、キーが無いと `-2` を返します（本文1.1節）。

### 問題2 cache-aside の関数

本文3.1節の `listOpenTasks` を、どんなものにも使える関数にします。[cached.mjs](cached.mjs) の `cached(redis, key, ttlSec, loader)` を書いてください。

- `key` にキャッシュがあれば、それを（JSON から戻して）返します。`loader` は呼びません。
- 無ければ `await loader()` で値を作り、`ttlSec` 秒の期限付きで入れてから返します。
- `0`・`''`・`false`・`null` もキャッシュします（2回目は `loader` を呼びません）。
- `loader` が例外を投げたら、そのまま投げます。何もキャッシュしません。
- `loader` が `undefined` を返したら、キャッシュせずに `undefined` を返します。

```js
const tasks = await cached(redis, 'cache:tasks:open', 60, () => repo.list());
```

```sh
$ node --test cached.test.mjs
ℹ pass 5
ℹ fail 0
```

ヒント:

- 「キャッシュがあるか」は、`redis.get` が `null` かどうかで分かります。`null` をキャッシュしたときは、Redis には `'null'` という文字列が入っているので、`null` は返りません。
- `JSON.stringify(undefined)` は文字列ではなく `undefined` を返し、Redis に入れられません。

### 問題3 窓の中の回数を数える

[hit.mjs](hit.mjs) の `hit(redis, key, { limit, windowSec })` を書いてください（本文4.2節）。`key` の数を 1 増やし、次のオブジェクトを返します。

| 項目 | 意味 |
| --- | --- |
| `allowed` | 窓の中で `limit` 回目までなら `true`、超えたら `false` |
| `remaining` | あと何回通せるか。`0` より下にはしない |
| `retryAfter` | 窓が終わるまでの秒数 |

- 窓は、その `key` の最初の1回から `windowSec` 秒です。来るたびに延ばしません。
- 同時に何回来ても、通すのはちょうど `limit` 回です。
- 前に期限を付けそこねて、期限の無いキーが残っていても、期限を付けます。

```sh
$ node --test hit.test.mjs
ℹ pass 4
ℹ fail 0
```

ヒント: 本文4.2節の `rate-limit-try.mjs` の `hit` を、`key`・`limit`・`windowSec` を受け取るように変え、返すものを合わせます。

### 問題4 Redis に置くもの・置かないもの（調べる問題）

次の問いに、文章で答えてください（本文0・3・6・7節）。

1. 次のうち、Redis だけに置いてよいものはどれですか。それぞれ理由も書いてください。
   - A. タスクの一覧 API の結果（60 秒のキャッシュ）
   - B. ユーザーのパスワードのハッシュ
   - C. ログインを試した回数（1分ごと）
   - D. 注文の記録
   - E. ログインのセッション
2. 本文3.1節のキャッシュで、タスクの題名を変えたのに、キャッシュを消し忘れました。利用者には何が見えますか。それは、いつ直りますか。期限を付けていなかったら、どうなりますか。
3. 「ユーザーごとのタスクの一覧」を、キー `cache:tasks` 1つにキャッシュしてしまいました。何が起きますか。キーをどうすればよいでしょうか。
4. 本文6節の Pub/Sub で、「タスクができたらメールを送る」を作りました。メールを送るプロセスを、更新のために 30 秒止めている間にできたタスクのメールは、どうなりますか。どんな仕組みを使うべきでしょうか（本文6.2節）。
5. `docker compose exec redis redis-cli` で、`KEYS *` を打つと、キーが全部表示されます。本番の Redis で、このコマンドを使ってはいけないのはなぜですか。代わりに何を使いますか。
6. 本文5.2節のサーバで、Redis が止まると、ログインしている人はどうなりますか。回数の制限はどうなりますか。

---

## 応用

### 問題5 使うたびに延びるセッション

本文5.1節の `createSessionStore` は、作ってから 30 分で必ず切れます。使っている間は切れないように、使うたびに期限を延ばし、さらに `save` と `regenerate` を足してください（[session-store.mjs](session-store.mjs)）。

| メソッド | 仕様 |
| --- | --- |
| `create(data)` | 本文と同じ。推測できない ID（43 文字）を返す。キーは `prefix + ID`、期限は `ttlSec` 秒 |
| `get(id)` | 中身を返す。無い・期限切れ・ID が空や文字列でないなら `null`。**あったら、期限を `ttlSec` 秒に戻す**。無い ID のキーを作らない |
| `save(id, data)` | セッションがあれば、中身を `data` に置き換え、期限を `ttlSec` 秒に戻して `true`。**無ければ作らずに `false`** |
| `destroy(id)` | 消す。ID が変でも例外にしない |
| `regenerate(id)` | 中身はそのままで、新しい ID に移し、新しい ID を返す。古い ID は使えなくなる。無ければ `null`（第22章 6.2節の、ログインしたら ID を作り直す） |

```sh
$ node --test session-store.test.mjs
ℹ pass 5
ℹ fail 0
```

ヒント:

- `get` は、`redis.multi().get(キー).expire(キー, ttlSec).exec()` で、読むのと延ばすのを続けて送れます。無いキーへの `EXPIRE` は、何もしません。
- 「あるときだけ入れる」は、`redis.set(キー, 値, { condition: 'XX', expiration: { type: 'EX', value: 秒 } })` です（`SET キー 値 XX EX 秒`）。入れたら `'OK'`、入れなかったら `null` が返ります。ログアウトで消えたセッションを、`save` がうっかり作り直さないようにするためです。
- `regenerate` は、`this.get`・`this.create`・`this.destroy` を使って書けます。

### 問題6 リポジトリにキャッシュをかぶせる

第31〜33章のリポジトリ（`list`・`get`・`insert`・`update`・`remove`）に、Redis のキャッシュをかぶせる `createCachedRepo(repo, redis, { prefix, ttlSec })` を、[cached-repo.mjs](cached-repo.mjs) に書いてください（本文3節）。返すものも、同じ形のリポジトリです。

| メソッド | 仕様 |
| --- | --- |
| `list()` | キー `prefix + 'tasks'` にキャッシュ（`ttlSec` 秒）。あれば `repo.list()` を呼ばない |
| `get(id)` | キー `prefix + 'task:' + id` にキャッシュ。ただし `null`（無いタスク）はキャッシュしない |
| `insert(fields)` | `repo.insert` を呼び、一覧のキャッシュを消す |
| `update(id, fields, options)` | `repo.update` を呼び、変わったら（`null` でなければ）一覧と、そのタスクのキャッシュを消す |
| `remove(id, options)` | `repo.remove` を呼び、消えたら（`true` なら）一覧と、そのタスクのキャッシュを消す |

```sh
$ node --test cached-repo.test.mjs
ℹ pass 5
ℹ fail 0
```

ヒント:

- `list` と `get` は、どちらも「キャッシュを見て、無ければ読んで入れる」なので、問題2のような関数を1つ作って使い回せます。
- 消すのは、`repo` を変えた**後**です。先に消すと、変える前に別の人が古いものを読んで、キャッシュに入れ直してしまうことがあります。
- `redis.del([キー1, キー2])` で、2つ一度に消せます。

### 問題7 Pub/Sub の部品

[broadcaster.mjs](broadcaster.mjs) の `createBroadcaster(redis, channel)` を書いてください（本文6節）。第27章の SSE のハブを、サーバが何台でも使えるようにするための部品です。

| メソッド | 仕様 |
| --- | --- |
| `publish(event)` | `event`（オブジェクト）を JSON にして `channel` に配り、受け取った接続の数を返す |
| `subscribe(handler)` | `channel` に来た知らせを、オブジェクトに戻して `handler(event)` に渡す。JSON でない知らせは捨てる。**止める関数**（`async`）を返す |

- `subscribe` した後も、渡された `redis` で、ふつうのコマンド（`get` など）を送れるようにします。
- 止める関数を呼んだら、もう `handler` を呼びません。`subscribe` のために作った接続は閉じます。

```sh
$ node --test broadcaster.test.mjs
ℹ pass 4
ℹ fail 0
```

ヒント:

- `redis.duplicate()` は、同じ設定の、新しい接続（まだつながっていない）を作ります。`on('error', …)` を付けてから `connect()` し、そちらで `subscribe` します（本文6.2節）。
- 止める関数では、`unsubscribe(channel)` してから `close()` します。
- `JSON.parse` は、JSON でない文字列だと例外を投げます。`try … catch` で受け止めます。

---

## 発展

### 問題8 回数の制限のミドルウェア（Redis 版）

第24章の練習問題5の `rateLimit` は、メモリに数えていました。これを Redis に数える Express のミドルウェア `redisRateLimit(options)` にしてください（[redis-rate-limit.mjs](redis-rate-limit.mjs)。本文4.2・5.2節）。

```js
app.post('/login', redisRateLimit({ redis, limit: 5, windowSec: 60 }), login);
```

| `options` | 意味 |
| --- | --- |
| `redis` | Redis の接続 |
| `limit` | 窓の中で何回まで（正の整数） |
| `windowSec` | 窓の長さ（秒。正の整数） |
| `prefix` | キーの頭。決まりは `'rate:'` |
| `key` | 数える相手を決める関数。決まりは `(req) => req.ip`。キーは `prefix + key(req)` |

- `limit` か `windowSec` が正の整数でなければ、`redisRateLimit` を呼んだ時点で `TypeError` を投げます。
- 応答に、見出し `RateLimit-Limit`（`limit`）・`RateLimit-Remaining`（残り。0 より下にしない）・`RateLimit-Reset`（窓が終わるまでの秒数）を付けます（第24章と同じ）。
- `limit` を超えたら、後ろを動かさずに、**429** と `Retry-After`（秒）、本文 `{ "error": "too many requests" }` を返します。
- `OPTIONS` のリクエストは数えずに通します。
- サーバが2台でも（それぞれ別の接続でも）、合わせて数えます。
- **Redis が使えない**（コマンドが例外を投げる）ときは、`console.error` で知らせて、制限せずに通します。

```sh
$ node --test redis-rate-limit.test.mjs
ℹ pass 5
ℹ fail 0
```

ヒント:

- 数えるのは、問題3の `hit` と同じ、`multi()` の `incr`・`expire(…, 'NX')`・`ttl` です。
- Express 5 では、ミドルウェアを `async` にできます。`await` の例外を自分で `try … catch` しないと、エラーのハンドラ（500）に行きます。「Redis が止まっていても通す」ために、ここでは自分で受け止めます。
- Redis が止まったときに「通す」か「止める」かは、守りたいものによって選びます。ログインの総当たりを防ぐことがいちばん大事なら、止める方を選ぶこともあります。この問題では、サービスを止めない方を選びました。
