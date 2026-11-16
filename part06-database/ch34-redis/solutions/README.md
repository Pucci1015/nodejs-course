# 第34章 模範解答

| 問題 | 解答のファイル | 確かめ方（`~/dev/part06/ch34-redis/exercises` で実行） |
| --- | --- | --- |
| 1 | [kv.mjs](kv.mjs) | `MODULE=../solutions/kv.mjs node --test kv.test.mjs` |
| 2 | [cached.mjs](cached.mjs) | `MODULE=../solutions/cached.mjs node --test cached.test.mjs` |
| 3 | [hit.mjs](hit.mjs) | `MODULE=../solutions/hit.mjs node --test hit.test.mjs` |
| 4 | このページ | — |
| 5 | [session-store.mjs](session-store.mjs) | `MODULE=../solutions/session-store.mjs node --test session-store.test.mjs` |
| 6 | [cached-repo.mjs](cached-repo.mjs) | `MODULE=../solutions/cached-repo.mjs node --test cached-repo.test.mjs` |
| 7 | [broadcaster.mjs](broadcaster.mjs) | `MODULE=../solutions/broadcaster.mjs node --test broadcaster.test.mjs` |
| 8 | [redis-rate-limit.mjs](redis-rate-limit.mjs) | `MODULE=../solutions/redis-rate-limit.mjs node --test redis-rate-limit.test.mjs` |

`MODULE=ファイル` を前に付けると、テストが読み込むファイルを、自分のものから模範解答に切り替えられます。どのテストも、先に `docker compose up -d --wait` で Redis を動かしておきます。`redis-test.mjs` は `exercises/` と同じものです。

---

## 問題1 JSON・数・残りの秒数

```js
export async function setJson(redis, key, value, ttlSec) {
  const json = JSON.stringify(value);
  if (ttlSec === undefined) await redis.set(key, json);
  else await redis.setEx(key, ttlSec, json);
}

export async function getJson(redis, key) {
  const json = await redis.get(key);
  // 無いキーは null。null を入れた（"null" という文字列がある）ときと区別するため、無いときは undefined にする
  return json === null ? undefined : JSON.parse(json);
}

export async function countUp(redis, key) {
  // incr は number で返る（get で読むと文字列）
  return redis.incr(key);
}

export async function secondsLeft(redis, key) {
  // TTL は、期限なしなら -1、キーが無ければ -2 を返す
  const ttl = await redis.ttl(key);
  if (ttl === -2) return null;
  if (ttl === -1) return Infinity;
  return ttl;
}
```

- `getJson` で、無いキーを `null` で返すと、`null` を入れたときと区別できません。`undefined` にしておくと、`if (value === undefined)` で「無かった」と分かります。
- `countUp` は、`get` してから `set` すると、同時に呼ばれたときに数えもれます（本文4.1節）。

## 問題2 cache-aside の関数

```js
export async function cached(redis, key, ttlSec, loader) {
  const hit = await redis.get(key);
  if (hit !== null) return JSON.parse(hit);
  // loader が例外を投げたら、そのまま呼んだ側へ（キャッシュには何も入れない）
  const value = await loader();
  // undefined は JSON にできない（JSON.stringify(undefined) は undefined）ので、入れずに返す
  if (value !== undefined) await redis.setEx(key, ttlSec, JSON.stringify(value));
  return value;
}
```

- 「キャッシュが無い」を表すのは `redis.get` の `null` だけです。`if (hit)` ではなく `hit !== null` と書きます（`if (hit)` だと、たとえば空の文字列が返ったときに、無いものとして扱ってしまいます）。
- `loader` の例外を `try … catch` で握りつぶすと、データベースが止まっていることに気づけなくなります。

## 問題3 窓の中の回数を数える

```js
export async function hit(redis, key, { limit, windowSec }) {
  // MULTI … EXEC で、3つのコマンドを割り込まれずに続けて動かす
  const [count, , ttl] = await redis
    .multi()
    .incr(key)
    .expire(key, windowSec, 'NX') // 期限が無いときだけ付ける。毎回付け直すと、窓が終わらなくなる
    .ttl(key)
    .exec();
  return { allowed: count <= limit, remaining: Math.max(0, limit - count), retryAfter: ttl };
}
```

- `expire` を `'NX'` なしで毎回呼ぶと、テストの「窓は最初の1回から数える」が失敗します（来るたびに窓が延びる）。
- `INCR` と `EXPIRE` を MULTI でまとめずに別々に `await` しても、ふつうは動きます。ただ、その間でプロセスが止まると期限の無いキーが残ります。`'NX'` にしておけば、次の1回で期限が付きます（テストの4つ目）。

## 問題4 Redis に置くもの・置かないもの（調べる問題）

1. - A（キャッシュ）: 置いてよい。消えても、データベースから作り直せます。
   - B（パスワードのハッシュ）: 置かない。消えると、だれもログインできなくなります。PostgreSQL に置きます。
   - C（ログインを試した回数）: 置いてよい。消えても、数え直しになるだけです。期限付きで、サーバが何台でも合わせて数えられるので、Redis に向いています。
   - D（注文の記録）: 置かない。なくなっては困る、いちばん大事なデータです。
   - E（セッション）: 置いてよい。消えると、ログインし直しになるだけです（困るけれど、データは失われない）。期限付きで、何台でも共有できるので、Redis によく置かれます。
2. 期限が来るまで、古い題名が見えます（本文3.1節の「変えた後（消さない）」）。期限が来て Redis がキャッシュを消せば、次に読んだ人が新しいものを入れ直すので、直ります。期限を付けていなければ、だれかが消すまで、ずっと古いままです。期限は「消し忘れたときの保険」でもあります。
3. 最初に読んだ人の一覧がキャッシュされ、ほかの人にも、その人のタスクが見えてしまいます（データがもれる）。キーに人を入れて、`cache:tasks:alice` のようにします。
4. Pub/Sub の知らせは、その瞬間に待っている人にだけ届き、残らないので、止めていた 30 秒の間のメールは**送られません**。知らせを残して、後から受け取れる仕組み（Redis Streams や、それを使う BullMQ のような仕事の列。第12部 第64章）を使います。
5. Redis はコマンドを1つずつ順番に動かすので、キーが何百万もあると、`KEYS *` が終わるまで、ほかのコマンド（ほかの人のセッションを読む、など）が全部待たされます。少しずつ探す `SCAN` を使います（本文1.2節）。
6. セッションを読む `redis.get` が例外を投げるので、`/me` は 500 になります（ログインしていた人も、使えなくなります）。`/login` も、回数の制限の `multi()…exec()` が例外を投げるので 500 です。さらに、本文の `redis.mjs` は、つなぎ直しを5回（約 2.5 秒）であきらめて接続を閉じるので、Redis が戻っても、サーバを再起動するまで直りません。本番では、あきらめずにつなぎ直し続ける設定にし、回数の制限は練習問題8のように、Redis が使えないときにどうするかを決めておきます。

## 問題5 使うたびに延びるセッション

```js
export function createSessionStore(redis, { ttlSec = 1800, prefix = 'sess:' } = {}) {
  const key = (id) => prefix + id;
  const isId = (id) => typeof id === 'string' && id !== '';
  return {
    async create(data) {
      const id = crypto.randomBytes(32).toString('base64url');
      await redis.setEx(key(id), ttlSec, JSON.stringify(data));
      return id;
    },
    async get(id) {
      if (!isId(id)) return null;
      // GET と EXPIRE を続けて送る。無いキーへの EXPIRE は何もしない（0 を返す）
      const [json] = await redis.multi().get(key(id)).expire(key(id), ttlSec).exec();
      return json === null ? null : JSON.parse(json);
    },
    async save(id, data) {
      if (!isId(id)) return false;
      // condition: 'XX' は「もうあるときだけ」。消えた（ログアウトした）セッションを、うっかり作り直さない
      const result = await redis.set(key(id), JSON.stringify(data), { condition: 'XX', expiration: { type: 'EX', value: ttlSec } });
      return result === 'OK';
    },
    async destroy(id) {
      if (isId(id)) await redis.del(key(id));
    },
    async regenerate(id) {
      const data = await this.get(id);
      if (data === null) return null;
      const newId = await this.create(data);
      await this.destroy(id);
      return newId;
    },
  };
}
```

- 使うたびに期限を延ばす方式を、スライディング（滑っていく）期限と呼びます。最後に使ってから 30 分たつと切れます。
- それでも、ログインしたままにできる長さには上限を付けるのがふつうです（たとえば、ログインから 7 日で、必ずログインし直し）。中身に `loginAt` を入れておけば、`get` の後で確かめられます。
- `regenerate` の中で、`get`（期限を延ばす）→ `create` → `destroy` の順にしています。先に `destroy` すると、`create` が失敗したときに、セッションが無くなってしまいます。

## 問題6 リポジトリにキャッシュをかぶせる

```js
export function createCachedRepo(repo, redis, { prefix = 'cache:', ttlSec = 60 } = {}) {
  const LIST_KEY = `${prefix}tasks`;
  const taskKey = (id) => `${prefix}task:${id}`;

  // 読む: キャッシュにあればそれ、無ければ load() を呼んで入れる（null は入れない）
  async function read(key, load) {
    const hit = await redis.get(key);
    if (hit !== null) return JSON.parse(hit);
    const value = await load();
    if (value !== null) await redis.setEx(key, ttlSec, JSON.stringify(value));
    return value;
  }

  return {
    list: () => read(LIST_KEY, () => repo.list()),
    get: (id) => read(taskKey(id), () => repo.get(id)),

    async insert(fields) {
      const task = await repo.insert(fields);
      // 一覧が変わったので、一覧のキャッシュを消す（次に読んだ人が、新しいもので作り直す）
      await redis.del(LIST_KEY);
      return task;
    },

    async update(id, fields, options) {
      const task = await repo.update(id, fields, options);
      // 変わったときだけ消す。先にデータベースを変え、その後でキャッシュを消す
      if (task !== null) await redis.del([LIST_KEY, taskKey(id)]);
      return task;
    },

    async remove(id, options) {
      const removed = await repo.remove(id, options);
      if (removed) await redis.del([LIST_KEY, taskKey(id)]);
      return removed;
    },
  };
}
```

- 返すものが、元のリポジトリと同じ形なので、`server.mjs` では `const repo = createCachedRepo(createPgTaskRepo(pool), redis);` と1行変えるだけで、キャッシュが使えます（第31〜33章で、リポジトリの形をそろえておいたおかげです）。
- `null` をキャッシュしないのは、「まだ無いタスク」を覚えてしまうと、作られた後も 60 秒間 404 になるからです（id は増えていくだけなので、この API では起きにくいですが、題名で探すような場合には起きます）。

## 問題7 Pub/Sub の部品

```js
export function createBroadcaster(redis, channel) {
  return {
    async publish(event) {
      return redis.publish(channel, JSON.stringify(event));
    },

    async subscribe(handler) {
      // subscribe した接続は、ほかのコマンドを送れなくなる。渡された redis はそのまま使い続けたいので、
      // duplicate() で同じ設定の接続をもう1本作り、それを待つ専用にする
      const sub = redis.duplicate();
      sub.on('error', (err) => console.error('Redis（subscribe）のエラー:', err.message));
      await sub.connect();
      await sub.subscribe(channel, (message) => {
        let event;
        try {
          event = JSON.parse(message);
        } catch {
          return; // JSON でない知らせ（ほかのプログラムが送ったものなど）は捨てる
        }
        handler(event);
      });
      // 止める: 待つのをやめて、作った接続を閉じる
      return async () => {
        await sub.unsubscribe(channel);
        await sub.close();
      };
    },
  };
}
```

- `subscribe` のたびに接続が1本増えます。1つのプロセスで、いくつものチャンネルを待つなら、接続を1本だけ作って、そこで全部を `subscribe` する方が、接続の数を減らせます。
- 第27章の SSE のハブと組み合わせるときは、`subscribe` の `handler` で、そのサーバにつながっているブラウザに送ります。どのサーバで `publish` しても、全部のサーバのブラウザに届きます。

## 問題8 回数の制限のミドルウェア（Redis 版）

```js
export function redisRateLimit({ redis, limit, windowSec, prefix = 'rate:', key = (req) => req.ip }) {
  // 設定のまちがいは、作る時点で見つける（第24章 練習問題5と同じ）
  if (!Number.isInteger(limit) || limit <= 0) throw new TypeError('limit は正の整数にしてください');
  if (!Number.isInteger(windowSec) || windowSec <= 0) throw new TypeError('windowSec は正の整数（秒）にしてください');

  return async function rateLimit(req, res, next) {
    if (req.method === 'OPTIONS') return next(); // プリフライトはブラウザが自動で送るもの。数えない
    const k = prefix + String(key(req) ?? 'unknown');
    let count, ttl;
    try {
      [count, , ttl] = await redis.multi().incr(k).expire(k, windowSec, 'NX').ttl(k).exec();
    } catch (err) {
      // Redis が止まっていても、サービス全体は止めない（制限せずに通す。fail open）
      console.error('回数の制限: Redis のエラーなので通します:', err.message);
      return next();
    }
    res.set('RateLimit-Limit', String(limit));
    res.set('RateLimit-Remaining', String(Math.max(0, limit - count)));
    res.set('RateLimit-Reset', String(ttl));
    if (count > limit) {
      res.set('Retry-After', String(ttl));
      return res.status(429).json({ error: 'too many requests' });
    }
    next();
  };
}
```

- 第24章の版とくらべると、`Map` と古い記録の片付け（`prune`）が無くなりました。期限が来れば Redis が消します。
- Redis が止まったときは、見出しを付けずに通しています。止まっている間は制限がかからないので、ログが出たら、すぐに Redis を直します。
