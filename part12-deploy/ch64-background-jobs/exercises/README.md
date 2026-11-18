# 第64章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part12/ch64-background-jobs/exercises/` で行います。最初に `cd exercises` で移動してください。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | 再試行までの待ち時間と、再試行してよい失敗か | [backoff.ts](backoff.ts)、[backoff.test.ts](backoff.test.ts) | 4.1 |
| 2 | 基本 | 仕事のデータを Zod で確かめる | [job-schema.ts](job-schema.ts)、[job-schema.test.ts](job-schema.test.ts) | 5.4 |
| 3 | 基本 | 「毎日 8 時」の次の時刻と、その地域の日付 | [next-run.ts](next-run.ts)、[next-run.test.ts](next-run.test.ts) | 6 |
| 4 | 基本 | 考えて答える（調べる問題） | [predict.md](predict.md) | 1〜7 |
| 5 | 応用 | PostgreSQL の列に、待ってからの再試行とあきらめを足す | [pg-jobs.ts](pg-jobs.ts)、[pg-jobs.test.ts](pg-jobs.test.ts) | 3・4.1 |
| 6 | 応用 | 2回送らないメールの処理（BullMQ） | [mail-processor.ts](mail-processor.ts)、[mail-processor.test.ts](mail-processor.test.ts) | 4.2・5.3 |
| 7 | 応用 | 止める合図で、今の仕事を終えてから止まるループ | [run-worker.ts](run-worker.ts)、[run-worker.test.ts](run-worker.test.ts) | 3.2・7.1 |
| 8 | 発展 | 毎朝のお知らせを、1人1日1通だけ送る | [daily-digest.ts](daily-digest.ts)、[daily-digest.test.ts](daily-digest.test.ts) | 4.2・6 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

## テストの使い方

問題4以外は、ファイルを書いて、`node --test ○○.test.ts` ですべてのテストが通れば完成です。書く前に失敗するテストの数は、それぞれの問題に書いてあります。模範解答で試すには、`MODULE=../solutions/○○.ts` を付けます（例: `MODULE=../solutions/backoff.ts node --test backoff.test.ts`）。

- 問題5・8のテストは、第6部の compose の PostgreSQL（127.0.0.1:5433）を使います。テストごとに新しいスキーマ（`test_…`）を作り、終わったら消します（[pg-test.ts](pg-test.ts)）。本文で作った `ch64` のスキーマには触りません。
- 問題6のテストは、第6部の compose の Redis（127.0.0.1:6380）で、本物の BullMQ の列とワーカーを動かします。キーの頭を `test:…` にして、終わったら消します。
- 問題1・2・3・7は、データベースも Redis も使いません。
- [pg-test.ts](pg-test.ts) と [typecheck.ts](typecheck.ts) は、テストの部品です。書き換えなくてかまいません。どのテストも最後に、書いたファイルに `tsc` のエラーが無いことを確かめます。

---

## 基本

### 問題1 再試行までの待ち時間と、再試行してよい失敗か

[backoff.ts](backoff.ts) に、2つの関数を書いてください（本文 4.1節）。

**`retryDelay(attempt, { baseMs, maxMs, random })`**: `attempt` 回目（1 から数える）の失敗の後に、何ミリ秒待つかを返します。

- 上限 = `baseMs × 2^(attempt - 1)`。ただし `maxMs` を超えない
- 待ち時間 = 上限 × `random()` を切り捨てたもの（0 から上限の間のどこか。本文の「ジッター」）
- `attempt` が 1 以上の整数でなければ、`attempt` を含む文で例外

**`isRetryable(err)`**: 再試行してよい失敗なら `true` を返します。上から順に調べます。

| 失敗 | 結果 |
| --- | --- |
| `PermanentError`（同じファイルにあるクラス）のインスタンス | `false` |
| オブジェクトでない（文字列など） | `true` |
| `name` が `'TimeoutError'`（`AbortSignal.timeout` の時間切れ） | `true` |
| `code` が `'ECONNREFUSED'`・`'ECONNRESET'`・`'ETIMEDOUT'`・`'EAI_AGAIN'` のどれか | `true` |
| `status`（HTTP の状態）が数 | 429 か 500 以上なら `true`、ほかは `false` |
| `responseCode`（SMTP の応答。第10部 第53章）が数 | 500 未満（4xx の「後でもう一度」）なら `true`、5xx なら `false` |
| それ以外（分からない失敗） | `true`（回数の上限で止まる） |

```sh
$ node --test backoff.test.ts       # 書く前は 8 個が失敗
```

ヒント: `2 ** n` で 2 の n 乗です。`err` は `unknown` なので、`typeof err === 'object' && err !== null` で絞り込んでから、`'code' in err && typeof err.code === 'string'` のように1つずつ確かめます（第7部 第36章）。

### 問題2 仕事のデータを Zod で確かめる

[job-schema.ts](job-schema.ts) の `JobSchema` を、3種類の仕事の `z.discriminatedUnion('name', …)` にし（本文 5.4節）、`parseJob(name, data)` を書いてください。

| `name` | 項目 |
| --- | --- |
| `'send-mail'` | `to`（メールアドレス）、`subject`（1〜200 文字）、`text`（1 文字以上） |
| `'delete-file'` | `key`（`files/` で始まる文字列。`z.string().startsWith('files/')`） |
| `'daily-digest'` | `day`（`YYYY-MM-DD`。`z.iso.date()`。第5部 第25章） |

- 知らない項目があれば失敗（`z.strictObject`）
- `parseJob` は、`data` に `name` を足したオブジェクトを `safeParse` し、成功なら `{ ok: true, job }`、失敗なら `{ ok: false, error }` を返す。`error` は「最初の問題の項目の名前: メッセージ」（`to: Invalid email address` など）。名前は Zod の `issue.path` を `.` でつないだもの（知らない `name` なら `name`）。`path` が空（知らない項目があるなど）なら `(全体)`
- `data` がオブジェクトでなくても（`null`・文字列・`undefined`）例外にせず、`ok: false` を返す

```sh
$ node --test job-schema.test.ts    # 書く前は 7 個が失敗
```

ヒント: オブジェクトに項目を足すのは `{ ...data, name }` です。`data` がオブジェクトでないときは `{ name }` だけを確かめれば、項目が足りずに失敗します。

### 問題3 「毎日 8 時」の次の時刻と、その地域の日付

[next-run.ts](next-run.ts) に、2つの関数を書いてください（本文 6節の `tz` を、自分で計算します）。

- `nextDailyRun(now, { hour, minute, utcOffsetMinutes })`: `now` より後（同じ時刻はふくまない）で、いちばん近い「その地域の `hour:minute`」を `Date` で返す。`utcOffsetMinutes` は UTC からのずれ（分。日本は `540`、UTC-5 は `-300`）
- `localDay(time, utcOffsetMinutes)`: その時刻が、その地域で何日か（`YYYY-MM-DD`）
- `hour` が 0〜23 の整数でなければ `hour` を含む文で、`minute` が 0〜59 の整数でなければ `minute` を含む文で例外

```sh
$ node --test next-run.test.ts      # 書く前は 7 個が失敗
```

テストの例: 2026-11-18 07:30（日本時間）= `2026-11-17T22:30:00Z` のとき、次の 8:00 は `2026-11-17T23:00:00.000Z` です。

ヒント: `getTime()` にずれ（ミリ秒）を足すと、「その地域の時刻を、UTC のふりをした数」になります。それを 1 日（`24 * 60 * 60_000`）で割って切り捨てて掛け直すと、その地域の 0:00 になります。最後にずれを引いて戻します。`localDay` は、ずれを足した `Date` の `toISOString()` の先頭 10 文字です（第8部 第46章でも日付を `Date.UTC` で数えました）。

### 問題4 考えて答える

[predict.md](predict.md) の 6 つの問いに答えてください。問い4は、予想してから、本文のサンプルで試します。

---

## 応用

### 問題5 PostgreSQL の列に、待ってからの再試行とあきらめを足す

[pg-jobs.ts](pg-jobs.ts) に、`createPgJobs(pool, schema)` を書いてください。本文 3.1節の `pg-queue.ts` を、`schema` の中の `jobs` の表を使うように変え、失敗の扱いを足します（コピーしてから直すと楽です）。

- `schema` が `/^[a-z_][a-z0-9_]*$/` に合わなければ、`schema` を含む文で例外（表の名前はプレースホルダにできないので、決まった形だけを SQL に埋め込む。第6部 第31章）
- `setup()`: 表を作る（`CREATE TABLE IF NOT EXISTS`。2回呼んでも失敗しない）。本文の列に、`max_attempts`（既定 5）と `dead_at`（あきらめた時刻）を足す
- `enqueue(kind, payload, { maxAttempts })`: 入れて、`id` を返す（`bigserial` の `id` は、pg では文字列になる。第6部 第32章）
- `claimNext(lockSeconds)`: 本文と同じ（`FOR UPDATE SKIP LOCKED`、`attempts` を 1 増やす、ロックの期限が切れたものも取る）。ただし、あきらめた仕事は取らない。戻り値は `{ id, kind, payload, attempts }` か `undefined`
- `complete(id)`: 終わったと書く
- `fail(job, error, delayMs)`: `last_error` を書き、ロックを外す。`attempts` が `max_attempts` より少なければ、`run_at` を `delayMs` 後にして `'retry'`。そうでなければ `dead_at` を書いて `'dead'`
- `listDead()`: あきらめた仕事を、新しいものから `{ id, kind, attempts, lastError }` の配列で

```sh
$ node --test pg-jobs.test.ts       # 書く前は 7 個が失敗
```

ヒント: `fail` は、1つの `UPDATE` の中で `CASE WHEN attempts < max_attempts THEN … ELSE … END` を使うと、「回数を見て決める」と「書く」を同時にできます。`RETURNING dead_at IS NOT NULL AS dead` で、どちらになったかが返ります。`delayMs` は秒にして `make_interval(secs => $3)` に渡します。列の名前 `last_error` を `lastError` で返すには、`SELECT last_error AS "lastError"` と書きます。

### 問題6 2回送らないメールの処理（BullMQ）

[mail-processor.ts](mail-processor.ts) に、`createMailProcessor({ mailer, sent, afterSend })` を書いてください。BullMQ の `Worker` に渡す、処理の関数を返します（本文 4.2節・5.3節）。

- `job.data` を Zod で確かめる（`to` はメールアドレス、`subject` は 1 文字以上、`text` は文字列、知らない項目は失敗）。違えば **`UnrecoverableError`** を投げる（再試行しても直らないので）
- キーは `` `mail:${job.id}` ``。`await sent.has(key)` が `true` なら、送らずに次へ（戻り値 `'skipped'`）
- 送っていなければ `mailer.send(データ)` で送り、**すぐに** `sent.add(key)` で覚える（戻り値 `'sent'`）
- `mailer.send` の失敗の `responseCode` が 500 以上（SMTP の 5xx、宛先が無いなど）なら `UnrecoverableError` を投げる。ほかの失敗は、そのまま投げる（BullMQ が再試行する）
- 最後に、`afterSend` があれば `await afterSend(to)` を呼ぶ（送ったときも、送らなかったときも）

```sh
$ node --test mail-processor.test.ts   # 書く前は 5 個が失敗
```

テストは、本物の列に仕事を入れて（`attempts: 3`、待ち時間 50 ミリ秒）、終わるのを待ちます。`afterSend` が1回目だけ失敗するテストでは、2回目の実行で `'skipped'` になり、メールは1通だけになるはずです。

ヒント: `UnrecoverableError` は `import { UnrecoverableError } from 'bullmq'`（ひな形にある）で、`new UnrecoverableError('理由')` のように投げます。

### 問題7 止める合図で、今の仕事を終えてから止まるループ

[run-worker.ts](run-worker.ts) に、`runWorker({ claim, handle, complete, fail, idleMs, signal })` を書いてください。本文 3.2節の `pg-worker.ts` のループを、データベースから切り離して、部品を受け取る形にしたものです。

- `signal.aborted` になるまで、`claim()` → `handle(job)` → `complete(job)` を繰り返す
- `handle` か `complete` が失敗したら、`fail(job, err)` を呼んで、次の仕事へ進む
- `claim()` が `undefined`（仕事が無い）なら、`idleMs` 待ってから聞き直す。**待っている間に `signal` が abort されたら、すぐ止まる**
- `claim()` そのものが失敗したら（データベースが止まった）、`idleMs` 待って続ける（ループを止めない）
- 処理中に止める合図が来ても、その仕事は最後まで終える。次は取らない
- 初めから abort されていたら、何も取らない
- 止まったら、`{ completed, failed }`（成功と失敗の数）を返す

```sh
$ node --test run-worker.test.ts    # 書く前は 6 個が失敗
```

ヒント: 待つのは、第3部 第12章の `node:timers/promises` の `setTimeout(ms, undefined, { signal })` です。abort されると例外（`AbortError`）で終わるので、`try` / `catch` で受け止めて、ループの条件（`while (!signal.aborted)`）で止めます。

---

## 発展

### 問題8 毎朝のお知らせを、1人1日1通だけ送る

[daily-digest.ts](daily-digest.ts) に、`sendDailyDigests(pool, schema, mailer, day)` を書いてください。成果物の毎朝のお知らせの中心です。表（`users`・`tasks`・`digest_log`）はテストが作ります。

```sql
CREATE TABLE users (id bigint PRIMARY KEY, email text NOT NULL);
CREATE TABLE tasks (id bigserial PRIMARY KEY, owner_id bigint NOT NULL REFERENCES users,
                    title text NOT NULL, status text NOT NULL, due_date date);
CREATE TABLE digest_log (user_id bigint NOT NULL, day date NOT NULL, sent_at timestamptz NOT NULL DEFAULT now(),
                         PRIMARY KEY (user_id, day));
```

- 期限（`due_date`）が `day` で、`status` が `'done'` でないタスクを持つ人ごとに、1通送る（人は ID の順）
- 件名は `今日が期限のタスク（N 件）`、本文は題名を1行ずつ `- 題名\n`（タスクの ID の順）
- **同じ日に2回動いても、2つのワーカーが同時に動いても、1人1日1通**。送る前に `digest_log` に `(user_id, day)` を入れ、入れられたときだけ送る。もう行があれば送らない（`skipped`）
- 送るのに失敗したら、`digest_log` のその行を消して、次に動いたときに送れるようにする（`failed`）。ほかの人には送り続ける
- 戻り値は `{ sent, skipped, failed }`
- `schema` は問題5と同じく、決まった形だけを受け付ける

```sh
$ node --test daily-digest.test.ts  # 書く前は 6 個が失敗
```

ヒント:

- 人ごとの題名の配列は、`array_agg(t.title ORDER BY t.id)` と `GROUP BY u.id, u.email` で、1つの SQL で集められます（第6部 第30章の `GROUP BY`）。
- 「入れられたら」は、`INSERT … ON CONFLICT DO NOTHING RETURNING user_id` の `rowCount` が 1 かどうかで分かります（第6部 成果物の冪等キーと同じ形）。2つのワーカーが同時に入れようとしても、主キーがあるので、片方だけが入れられます。
