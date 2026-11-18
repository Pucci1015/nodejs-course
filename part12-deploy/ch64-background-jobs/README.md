# 第64章 バックグラウンドジョブ

登録の確認メールを送る、消したタスクの添付ファイルを消す、毎朝お知らせを送る。こうした仕事を、客の頼みに答える処理の中でやると、応答が遅くなり、外のサービスが失敗すると客の頼みまで失敗します。この章では、仕事を**列（キュー）**に入れて、別のプロセス（**ワーカー**）に後ろでやらせる方法を学びます。PostgreSQL の表と `FOR UPDATE SKIP LOCKED` で自分で列を作り、次に BullMQ（Redis）を使い、再試行・二重に実行されても困らない作り・定期実行・ワーカーの止め方を、手を動かして確かめます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 4〜5時間 |
| 前提 | 第62・63章、第6部 第30・32・34章（トランザクション・`FOR UPDATE`・Redis）、第10部 第53章（メールと、送るのを待たない `deliver`） |
| この章のゴール | どんな仕事を後ろに回すかを決められる / PostgreSQL の表で、2つのワーカーが同じ仕事を取らない列を作れる / 失敗した仕事を、待つ時間を延ばしながら再試行し、だめならあきらめられる / 仕事は2回動くことがある前提で、2回動いても困らないように作れる / BullMQ で、仕事を入れる・処理する・再試行する・定期的に入れることができる / ワーカーを、処理中の仕事を終えてから止められる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | PostgreSQL の列（`pg-queue.ts` など）、BullMQ の列・ワーカー・定期実行 |
| [exercises/](exercises/) | 練習問題（テストで確かめる） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、`~/dev/part12/ch64-background-jobs/` で実行します（`cd ~/dev/part12/ch64-background-jobs`）。
> - 第6部の `compose.yaml` の PostgreSQL（127.0.0.1:5433）と Redis（127.0.0.1:6380）を使います（`(cd ~/dev/part06 && docker compose up -d --wait)`）。PostgreSQL の表は、データベース taskapi の中の、スキーマ `ch64` に作ります（成果物の表とはぶつかりません）。
> - この章のサンプルはポートで待ちません。ワーカーを2つ同時に動かすので、ターミナルを2〜3個使います。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| `FOR UPDATE SKIP LOCKED` の列（3節） | 第13部（Redis を使わずに列を作るとき） |
| 再試行・待つ時間・あきらめる（4節） | 第66章（失敗を見張る）、成果物 |
| 2回動いても困らない作り（4節） | 成果物（毎朝のお知らせを 1 日 1 通） |
| BullMQ・定期実行・ワーカーの止め方（5〜7節） | 成果物（メールの列とワーカー、毎朝のお知らせ）、第66章（列の長さを見張る） |

---

## 1. どんな仕事を後ろに回すか

| 後ろに回す | 理由 |
| --- | --- |
| メールを送る | SMTP は遅く（数百ミリ秒〜数秒）、ときどき失敗する（第10部 第53章） |
| 外の API を呼ぶ（決済の後の処理、通知など） | 相手が遅い・止まっていると、客を待たせる |
| ファイルを消す・画像を縮める | 時間がかかる。失敗してもやり直せばよい |
| 定期的な仕事（毎朝のお知らせ、古いものの掃除） | 客の頼みと関係なく、時刻で動く |

逆に、**客がすぐ結果を知りたいもの**（タスクを作った、ログインできたか）は、後ろに回しません。

**Flask では**: 後ろの仕事には、**Celery**（Python のジョブのライブラリ）と Redis を使うのが定番でした。関数に `@celery.task` を付け、`send_mail.delay(user_id)` と呼ぶと、仕事が Redis の列に入り、別に起動した `celery worker` のプロセスがそれを取り出して動かします。定期実行は **Celery beat** という別のプロセスでした。この章の BullMQ は、Node.js での Celery にあたります。

### 1.1 いちばん簡単な「後ろ」の困る所

第10部 第53章では、メールを送る `deliver` を、`await` せずに呼んで、応答を先に返しました。これも「後ろでやる」ですが、困る所があります。

| 困る所 | 例 |
| --- | --- |
| プロセスが止まると消える | デプロイの `SIGTERM` で止めたら、送る途中のメールは送られない |
| 再試行が無い | SMTP が一瞬止まっていたら、そのメールは届かない |
| 台数を増やしても、分けられない | 頼みを受けた台が、全部自分でやる |
| 失敗に気づけない | どの仕事が失敗したかの記録が無い |

仕事を**データベースか Redis に書いておけば**、プロセスが止まっても残り、別のプロセスが取り出せます。これが「列」です。

## 2. 列とワーカーの言葉

| 言葉 | 意味 |
| --- | --- |
| **ジョブ**（job、仕事） | 1つの「やること」。種類（`send-mail`）とデータ（`{ to: … }`）を持つ |
| **キュー**（queue、列） | ジョブを入れておく場所。入れた順（か、時刻の順）に取り出す |
| **プロデューサー**（producer） | ジョブを入れる側。ふつうは API のサーバ |
| **ワーカー**（worker） | ジョブを取り出して処理するプロセス。API とは別に起動する |
| **少なくとも1回**（at-least-once） | ふつうの列が約束するのは「1回以上は動く」こと。ちょうど1回は約束できない（4.2節） |

## 3. PostgreSQL の表を列にする

すでに PostgreSQL を使っているなら、表を1つ足すだけで列が作れます。仕事を入れるのと、データを書き換えるのを、**1つのトランザクションにできる**のが大きな良い所です（「タスクを作ったら、お知らせの仕事も入れる」が、片方だけになることがない）。

### 3.1 表と、取り出す SQL

[samples/pg-queue.ts](samples/pg-queue.ts) です。表はこうです。

```sql
CREATE TABLE IF NOT EXISTS ch64.jobs (
  id           bigserial PRIMARY KEY,
  kind         text NOT NULL,
  payload      jsonb NOT NULL,
  run_at       timestamptz NOT NULL DEFAULT now(),  -- この時刻を過ぎたら取ってよい
  locked_until timestamptz,                         -- だれかが処理中なら、その期限
  attempts     integer NOT NULL DEFAULT 0,
  done_at      timestamptz,
  last_error   text
);
```

ワーカーは、次の SQL で「まだ終わっていない・時刻が来た・だれも処理していない」仕事を1つ取り、`locked_until` を書いて「処理中」にします。

```sql
UPDATE ch64.jobs
   SET locked_until = now() + make_interval(secs => $1), attempts = attempts + 1
 WHERE id = (
   SELECT id FROM ch64.jobs
    WHERE done_at IS NULL AND run_at <= now() AND (locked_until IS NULL OR locked_until < now())
    ORDER BY run_at, id
    LIMIT 1
    FOR UPDATE SKIP LOCKED
 )
 RETURNING id, kind, payload, attempts
```

| 書き方 | 意味 |
| --- | --- |
| `UPDATE … WHERE id = (SELECT …)` | 中の `SELECT` で選んだ1行を、外の `UPDATE` で書き換える。1つの SQL なので、1回のやりとりで「選ぶ」と「印を付ける」ができる |
| `FOR UPDATE` | 選んだ行にロックをかける（第6部 第32章 6節）。ほかのトランザクションは、その行を書き換えられない |
| **`SKIP LOCKED`** | ほかがロックしている行は、待たずに**飛ばして**次の行を選ぶ。2つのワーカーが、別々の仕事を取れる |
| `locked_until` | 処理中の印に、期限を付ける。ワーカーが途中で落ちても、期限が過ぎれば、ほかのワーカーがまた取れる |
| `make_interval(secs => $1)` | 秒の数から、時間の長さを作る PostgreSQL の関数 |
| `RETURNING` | 書き換えた行を返す（第6部 第31章） |

### 3.2 手を動かす: 2つのワーカーで分ける

仕事を6個入れます（表が無ければ作ります）。

```sh
$ node samples/pg-enqueue.ts --reset
仕事の表を空にしました
$ node samples/pg-enqueue.ts 6
6 個の仕事を入れました
```

[samples/pg-worker.ts](samples/pg-worker.ts) は、取る → 0.3 秒かけて処理する → 終わったと書く、を繰り返すワーカーです。仕事が3秒無ければ終わります。2つのターミナルで、ほぼ同時に起動します。

```sh
$ node samples/pg-worker.ts A
[A] 仕事 2 を取りました（send-mail、1 回目）
[A] 仕事 4 を取りました（send-mail、1 回目）
[A] 仕事 5 を取りました（send-mail、1 回目）
[A] 終わります
```

```sh
$ node samples/pg-worker.ts B
[B] 仕事 1 を取りました（send-mail、1 回目）
[B] 仕事 3 を取りました（send-mail、1 回目）
[B] 仕事 6 を取りました（send-mail、1 回目）
[B] 終わります
```

6個の仕事が、重ならずに2つに分かれました（どちらがどれを取るかは、動かすたびに変わります）。ワーカーの中心は、次のループです。

```ts
while (!stopping) {
  const job = await claimNext(pool, 30, lock);
  if (job === undefined) {
    if (Date.now() - idleSince > 3000) break;
    await sleep(200); // 仕事が無いときは、少し待ってから聞き直す（ポーリング）
    continue;
  }
  idleSince = Date.now();
  console.log(`[${name}] 仕事 ${job.id} を取りました（${job.kind}、${job.attempts} 回目）`);
  await sleep(300); // メールを送るつもり
  await complete(pool, job.id);
}
```

`Ctrl+C` を押すと、`stopping` が `true` になり、今の仕事を終えてから、ループを抜けます（7節）。

### 3.3 手を動かす: ロックが無いと

`SKIP LOCKED` が本当に要るのかを、[samples/pg-race.ts](samples/pg-race.ts) で確かめます。仕事を 20 個入れ、2つの接続から**同時に** `claimNext` を呼ぶことを、仕事が無くなるまで繰り返します。

```sh
$ node samples/pg-race.ts
ロック: FOR UPDATE SKIP LOCKED
11 回で、のべ 20 個を取りました。2回取られた仕事: なし
$ LOCK=none node samples/pg-race.ts
ロック: なし
20 回で、のべ 38 個を取りました。2回取られた仕事: 3, 4, 5, 6, 7, 8, 9, 10, 11, 12, 13, 14, 15, 16, 17, 18, 19, 20
```

ロックが無いと、2つの `SELECT` が同時に同じ行を選び、両方の `UPDATE` がその行を書き換えるので、18 個の仕事が2回取られました。メールなら、2通届きます。`FOR UPDATE` だけ（`SKIP LOCKED` なし）にすると、2回は取られませんが、2つ目のワーカーは、1つ目のロックが外れるまで**待たされ**ます。ワーカーを増やしても速くならないので、列には `SKIP LOCKED` を使います。

## 4. 失敗と再試行

### 4.1 待つ時間を延ばす・散らす

外のサービスの失敗の多くは、一時的です。少し待ってからやり直せば、うまくいきます。ただし、すぐにやり直すと、止まりかけている相手に、さらに負担をかけます。

| やり方 | 待つ時間の例（基準 1 秒） |
| --- | --- |
| 決まった時間（fixed） | 1 秒、1 秒、1 秒… |
| **指数バックオフ**（exponential backoff） | 1 秒、2 秒、4 秒、8 秒…（上限で止める）。第3部 第12章の `retry` と同じ |
| 指数バックオフ + **ジッター**（jitter、ばらつき） | 上の時間の、0 から上限の間のどこか。たくさんのワーカーが同時に失敗しても、同時にやり直さない |

そして、**何回まで**やるかを決めます。回数を使い切った仕事は「あきらめた」（**dead**、デッドレター）として残し、人が見て、直してからやり直します。

**再試行しても無駄な失敗**もあります。データの形が違う、宛先のメールアドレスが無い（SMTP の 550）、相手が 400 番台を返した、などです。これは何回やっても直らないので、すぐにあきらめます（練習問題1・6）。

### 4.2 2回動いても困らないように

列は「少なくとも1回」しか約束しません。次のようなとき、同じ仕事が2回動きます。

1. ワーカーがメールを送った
2. 「終わった」と書く前に、ワーカーが落ちた（デプロイの `SIGKILL`、メモリが足りない）
3. ロックの期限が過ぎ、ほかのワーカーが同じ仕事を取って、もう一度送る

これを完全に防ぐことはできません（送ったことと、終わったと書くことを、1つのトランザクションにできないため）。だから、**2回動いても結果が同じになる**（**冪等**。第2部 第10章、第5部 第25章 8節）ように作ります。

| 仕事 | 冪等にするやり方 |
| --- | --- |
| ファイルを消す | もともと冪等（無いものを消しても成功。第63章） |
| メールを送る | 送ったら「仕事の ID で送った」と記録し、送る前に記録を見る（練習問題6）。記録の前に落ちると2通になりうるが、ずっと減る |
| 毎朝のお知らせ | 「この人に、この日」の行を、一意の制約のある表に先に入れ、入れられたワーカーだけが送る（練習問題8） |
| 外の API の決済など | 相手が受け付ける**冪等キー**（`Idempotency-Key`。第5部 第25章 8節）に、仕事の ID を渡す |

## 5. BullMQ を使う

PostgreSQL の列は、仕組みが見えて良いのですが、再試行・定期実行・止まった仕事の見張り・同時に動かす数などを、全部自分で書くことになります。**BullMQ** は、Redis の上に、それらを全部持った列のライブラリです。

### 5.1 つなぐ

BullMQ 6 は、第6部 第34章で使った node-redis の接続を、そのまま渡せます（[samples/bull-connection.ts](samples/bull-connection.ts)）。

```ts
import { createClient } from 'redis';
export const REDIS_URL = process.env.REDIS_URL ?? 'redis://127.0.0.1:6380';
export function redisConnection() {
  return createClient({ url: REDIS_URL });
}
```

渡した接続は、BullMQ がつなぎますが、**閉じはしません**。`queue.close()`・`worker.close()` の後で、自分で `connection.close()` を呼びます。呼ばないと、接続が残って、プロセスが終わりません（執筆時点の bullmq 6.5.4 で確かめました）。

### 5.2 手を動かす: 仕事を入れる

[samples/bull-add.ts](samples/bull-add.ts) です。

```ts
const connection = redisConnection();
const queue = new Queue('mail', { connection });
const job = await queue.add(
  'welcome',
  { to: `user${i}@example.com` },
  {
    attempts: 4,
    backoff: { type: 'exponential', delay: 500 },
    removeOnComplete: 100,
    removeOnFail: 500,
  },
);
// …
await queue.close();
await connection.close();
```

| 書き方 | 意味 |
| --- | --- |
| `new Queue('mail', …)` | 列「mail」。Redis には `bull:mail:…` のキーで置かれる |
| `queue.add(名前, データ, 設定)` | 仕事を入れる。データは JSON にして置かれるので、Date などは文字列になる。取り出す側で、Zod で確かめる（練習問題2） |
| `attempts: 4` | 失敗したら、合わせて4回まで |
| `backoff` | 待つ時間。`exponential` は 0.5 秒、1 秒、2 秒…。`fixed` は毎回同じ |
| `removeOnComplete`・`removeOnFail` | 終わった・あきらめた仕事を、何個まで Redis に残すか。残さないと Redis のメモリが増え続ける |

```sh
$ node samples/bull-add.ts 3
入れました: 仕事 1（welcome）
入れました: 仕事 2（welcome）
入れました: 仕事 3（welcome）
```

### 5.3 手を動かす: ワーカーと再試行

[samples/bull-worker.ts](samples/bull-worker.ts) です。

```ts
const worker = new Worker(
  'mail',
  async (job) => {
    console.log(`${t()} 仕事 ${job.id} を始めます（${job.attemptsMade + 1} 回目）: ${JSON.stringify(job.data)}`);
    if (job.attemptsMade < failTimes) throw new Error('メールのサーバにつながりません（わざと）');
    await new Promise((r) => setTimeout(r, workMs)); // 送るつもり
    return { sentAt: new Date().toISOString() };
  },
  { connection, concurrency: 2 },
);
worker.on('completed', (job) => console.log(`${t()} 仕事 ${job.id} が終わりました`));
worker.on('failed', (job, err) => console.log(`${t()} 仕事 ${job?.id} が失敗: ${err.message}`));
```

| 書き方 | 意味 |
| --- | --- |
| 2つ目の引数の関数 | 仕事ごとに呼ばれる。成功で終われば完了、例外を投げれば失敗（`attempts` が残っていれば、待ってから再試行） |
| `job.attemptsMade` | これまでに失敗した回数（最初は 0） |
| `concurrency: 2` | 1つのワーカーで、同時に2つまで処理する（I/O を待つ仕事なら、数を増やすと速くなる） |
| `on('completed')`・`on('failed')` | 終わった・失敗したときに呼ばれる。ログや見張り（第66章）に使う |

`FAIL=2` を付けて、どの仕事も最初の2回はわざと失敗させます。

```sh
$ FAIL=2 node samples/bull-worker.ts
列 mail を待っています
0.1s 仕事 1 を始めます（1 回目）: {"to":"user1@example.com"}
0.1s 仕事 2 を始めます（1 回目）: {"to":"user2@example.com"}
0.1s 仕事 1 が失敗: メールのサーバにつながりません（わざと）
0.1s 仕事 2 が失敗: メールのサーバにつながりません（わざと）
0.1s 仕事 3 を始めます（1 回目）: {"to":"user3@example.com"}
0.1s 仕事 3 が失敗: メールのサーバにつながりません（わざと）
0.6s 仕事 1 を始めます（2 回目）: {"to":"user1@example.com"}
0.6s 仕事 2 を始めます（2 回目）: {"to":"user2@example.com"}
0.6s 仕事 1 が失敗: メールのサーバにつながりません（わざと）
0.6s 仕事 2 が失敗: メールのサーバにつながりません（わざと）
0.6s 仕事 3 を始めます（2 回目）: {"to":"user3@example.com"}
0.6s 仕事 3 が失敗: メールのサーバにつながりません（わざと）
1.6s 仕事 1 を始めます（3 回目）: {"to":"user1@example.com"}
1.6s 仕事 2 を始めます（3 回目）: {"to":"user2@example.com"}
1.8s 仕事 1 が終わりました
1.8s 仕事 2 が終わりました
1.8s 仕事 3 を始めます（3 回目）: {"to":"user3@example.com"}
2.0s 仕事 3 が終わりました
```

1回目の失敗の 0.5 秒後に2回目、2回目の失敗の 1 秒後に3回目と、待つ時間が倍になりました。`Ctrl+C` で止めます。

直らない失敗のときは、`bullmq` の **`UnrecoverableError`** を投げます。`attempts` が残っていても、再試行せずにすぐあきらめます（練習問題6）。

### 5.4 手を動かす: 取り出したデータを確かめる

列に入れたデータは、JSON になって Redis に置かれ、ワーカーが取り出します。入れたのが古い版のアプリだったり、手で入れた仕事だったりすると、形が違うことがあります。API の入力（第7部 第38章）と同じく、**取り出したところで Zod で確かめます**。仕事の種類ごとに形が違うので、`name` の値で形を選ぶ **`z.discriminatedUnion`** を使います。`samples/job-data.ts` を作って、次を書きます。

```ts
import { z } from 'zod';

// name の値で、どの形かを見分けるユニオン
const JobData = z.discriminatedUnion('name', [
  z.strictObject({ name: z.literal('welcome'), to: z.email() }),
  z.strictObject({ name: z.literal('cleanup'), olderThanDays: z.number().int().min(1) }),
]);

const inputs: unknown[] = [
  { name: 'welcome', to: 'alice@example.com' },
  { name: 'welcome', to: 'alice' },
  { name: 'cleanup', olderThanDays: 30, dryRun: true },
  { name: 'unknown' },
];
for (const input of inputs) {
  const r = JobData.safeParse(input);
  if (r.success) {
    console.log('OK  ', r.data);
  } else {
    const issue = r.error.issues[0];
    console.log('だめ', issue?.path.join('.') || '(全体)', issue?.code, issue?.message);
  }
}
```

```sh
$ node samples/job-data.ts
OK   { name: 'welcome', to: 'alice@example.com' }
だめ to invalid_format Invalid email address
だめ (全体) unrecognized_keys Unrecognized key: "dryRun"
だめ name invalid_union Invalid discriminator value. Expected 'welcome' | 'cleanup'
```

| 書き方 | 意味 |
| --- | --- |
| `z.discriminatedUnion('name', [...])` | いくつかの形のどれか。`name` の値（`z.literal`）を見て、どの形で確かめるかを決める（第7部 第36章の「判別できるユニオン」の Zod 版） |
| `z.strictObject` | 知らない項目があれば失敗にする（第5部 第25章）。`dryRun` のような書き間違いに気づける |
| `z.email()`・`z.literal('welcome')` | メールアドレスの形・決まった値 |
| `issue.path` | どの項目が違うか（`['to']`）。全体の問題なら空の配列なので、`\|\| '(全体)'` で表示を作る |

成功したときの `r.data` は、`if (r.data.name === 'welcome')` で絞り込むと、その中で `r.data.to` が使えます（第7部 第36章 2節）。うまく動かないときは、[samples/job-data.ts](samples/job-data.ts) と比べてください。

## 6. 決まった時刻に動かす

毎朝のお知らせのような**定期実行**は、BullMQ の**ジョブスケジューラ**で、「決まった時刻・間隔で、列に仕事を入れる」ように登録します（[samples/bull-schedule.ts](samples/bull-schedule.ts)）。

```ts
await queue.upsertJobScheduler('heartbeat', { every: 2000 }, { name: 'heartbeat', data: {} });
await queue.upsertJobScheduler(
  'daily-digest',
  { pattern: '0 8 * * *', tz: 'Asia/Tokyo' },
  { name: 'daily-digest', data: {} },
);
```

| 書き方 | 意味 |
| --- | --- |
| `upsertJobScheduler(ID, いつ, 仕事のひな形)` | あれば直し、無ければ足す。同じ ID で何度呼んでも1つのまま。だから、アプリを起動するたびに呼んでよい |
| `every: 2000` | 2秒ごと |
| `pattern: '0 8 * * *'` | **cron** の書き方。左から「分 時 日 月 曜日」。`*` は「どれでも」。これは「毎日 8 時 0 分」 |
| `tz: 'Asia/Tokyo'` | どの地域の時刻で数えるか。書かないとサーバの時刻（PaaS ではたいてい UTC）なので、日本の朝 8 時のつもりが、夕方 5 時になる |

```sh
$ node samples/bull-schedule.ts
登録しました
$ node samples/bull-schedule.ts
登録しました
$ node samples/bull-schedule.ts --list
daily-digest: every=- pattern=0 8 * * * tz=Asia/Tokyo 次=2026-11-18T23:00:00.000Z
heartbeat: every=2000 pattern=- tz=- 次=2026-11-18T14:32:39.109Z
```

2回登録しても、2つのままです。`daily-digest` の次は `23:00:00.000Z`（UTC）、日本時間の翌朝 8:00 です。ワーカーを動かすと、2秒ごとに `heartbeat` の仕事が来ます。

```sh
$ node samples/bull-worker.ts
列 mail を待っています
0.1s 仕事 repeat:heartbeat:1795012359109 を始めます（1 回目）: {}
0.3s 仕事 repeat:heartbeat:1795012359109 が終わりました
0.6s 仕事 repeat:heartbeat:1795012361109 を始めます（1 回目）: {}
0.8s 仕事 repeat:heartbeat:1795012361109 が終わりました
2.6s 仕事 repeat:heartbeat:1795012363109 を始めます（1 回目）: {}
…
```

確かめたら、`Ctrl+C` でワーカーを止め、`node samples/bull-schedule.ts --remove` で登録を消します。

定期実行で気をつけることです。

| 気をつけること | 理由・やり方 |
| --- | --- |
| ワーカーが止まっていた間の分 | スケジューラは「次の時刻」に1つ入れるだけ。止まっていた間の分を全部やり直したいなら、仕事の中で「前回からの分」を数える |
| 同じ日に2回動く | デプロイの重なり（第62章 6節）や手でのやり直しで起きうる。「この人に、この日」を一意の制約で守る（4.2節、練習問題8） |
| 日付の境目 | 「今日」は、`tz` の地域で数える（練習問題3） |
| PaaS の cron | Render の Cron Job など、決まった時刻にコマンドを1回動かす仕組みもある。Redis が要らないが、最短の間隔や、動かす時刻の正確さは PaaS 次第（執筆時点。必ず公式で確認） |

## 7. ワーカーを動かし続ける・止める

### 7.1 手を動かす: 処理中の仕事を終えてから止まる

ワーカーも、デプロイのたびに `SIGTERM` で止められます（第60章 5節）。`worker.close()` は、新しい仕事を取るのをやめ、処理中の仕事が終わるのを待ちます。

```ts
async function stop(signal: string) {
  console.log(`${t()} ${signal} を受けました。処理中の仕事を終えてから止まります`);
  await worker.close();
  await connection.close();
  console.log(`${t()} 止まりました`);
}
process.once('SIGINT', () => void stop('SIGINT'));
process.once('SIGTERM', () => void stop('SIGTERM'));
```

1つの仕事に3秒かかるようにして（`WORK_MS=3000`）、仕事の途中で `SIGTERM` を送ります。1つ目のターミナルでワーカーを起動し、2つ目のターミナルで仕事を入れ、すぐに `pkill` で `SIGTERM` を送ります。`pkill -TERM -f 文字列` は「コマンドの行にその文字列を含むプロセスに、`SIGTERM` を送る」コマンドです（`-f` は、コマンドの名前だけでなく、引数まで含めて探す）。

```sh
$ WORK_MS=3000 node samples/bull-worker.ts
```

```sh
$ node samples/bull-add.ts 1 && sleep 1 && pkill -TERM -f bull-worker.ts
```

1つ目のターミナルには、こう出ました。

```
列 mail を待っています
0.6s 仕事 1 を始めます（1 回目）: {"to":"user1@example.com"}
1.6s SIGTERM を受けました。処理中の仕事を終えてから止まります
3.6s 仕事 1 が終わりました
3.6s 止まりました
```

`SIGTERM` の後も、仕事が終わるまで待ってから止まりました。PaaS が `SIGKILL` を送るまでの猶予（多くは 30 秒前後。執筆時点）より長い仕事は、途中で切られます。長い仕事は、小さな仕事に分けます。

途中で `SIGKILL` で殺された仕事はどうなるでしょう。BullMQ は、処理中の仕事にロック（既定で 30 秒。執筆時点）を付け、ワーカーが生きている間は延ばし続けます。ワーカーが消えてロックが切れると、ほかのワーカーが「止まった仕事」（**stalled**）として見つけ、もう一度処理します。執筆の環境で、ロックを 4 秒にして確かめると、殺してから約 5 秒後に、別のワーカーが同じ仕事を `stalled` として取り直しました。3節の `locked_until` と同じ考え方で、4.2節の「2回動く」の理由の1つです。

### 7.2 どこで動かすか

ワーカーは、API と**同じイメージ**を、**別のコマンド**で起動するのがふつうです。

```yaml
# compose.yaml の例（成果物で使う形）
services:
  app:
    build: .
    command: ['node', 'src/server.ts']
  worker:
    build: .
    command: ['node', 'src/worker.ts']
```

| 場所 | 動かし方（執筆時点。必ず公式で確認） |
| --- | --- |
| Compose | 上のように、サービスを2つにする（第61章 9節） |
| Render | Web Service とは別に、**Background Worker** を作る（ポートで待たないサービス）。Cron Job もある |
| Fly.io | `fly.toml` の `[processes]` に、`app` と `worker` を書く |

API とワーカーを分けておくと、仕事が溜まったときにワーカーだけを増やせ、ワーカーが重い仕事で忙しくても、API の応答が遅くなりません。

## 8. 何を使うか

| やり方 | 向いている場面 |
| --- | --- |
| `await` しないで呼ぶ（1.1節） | 失ってもよい、小さな仕事（ログを送るなど）だけ |
| **PostgreSQL の列**（3節。ライブラリなら pg-boss、Graphile Worker など） | すでに PostgreSQL がある。仕事を入れるのを、データの書き換えと同じトランザクションにしたい。仕事の数が多すぎない |
| **BullMQ（Redis）** | 仕事が多い、定期実行・優先度・同時の数の制限などを使いたい。Redis を持てる |
| クラウドの列（Amazon SQS、Google Cloud Tasks など） | そのクラウドで動かしている。列そのものの面倒を見たくない |

どれでも、「少なくとも1回」「再試行」「冪等」「止め方」の考え方は同じです。成果物では、すでに Redis がある（第6部 第34章）ので BullMQ を使います。

## 9. Flask との対応

| Flask + Celery（Python） | この章（Node.js + BullMQ） |
| --- | --- |
| `@celery.task(bind=True, max_retries=3)` | `queue.add(名前, データ, { attempts: 4 })`（`attempts` は最初の1回も数える） |
| `send_mail.delay(user_id)` | `await queue.add('send-mail', { userId })` |
| `self.retry(countdown=2 ** self.request.retries)` | `backoff: { type: 'exponential', delay: … }` |
| `celery -A app worker --concurrency=2` | `new Worker('mail', 処理, { concurrency: 2 })` を動かす `node src/worker.ts` |
| Celery beat の `crontab(hour=8, minute=0)` | `queue.upsertJobScheduler(ID, { pattern: '0 8 * * *', tz: 'Asia/Tokyo' }, …)` |
| `acks_late=True`（終わってから「受け取った」と言う） | BullMQ はいつもこの形（終わるまでロックを持ち、終わったら完了にする） |

## まとめ

- 遅い・失敗しうる・時刻で動く仕事は、列に入れてワーカーにやらせる。`await` しないだけでは、止まると消え、再試行も無い。
- PostgreSQL の表は、`UPDATE … WHERE id = (SELECT … FOR UPDATE SKIP LOCKED)` で列になる。`SKIP LOCKED` が無いと、2つのワーカーが同じ仕事を取る。処理中の印には期限を付ける。
- 失敗は、指数バックオフ + ジッターで待ってから再試行し、回数を使い切ったらあきらめて残す。直らない失敗は、すぐあきらめる。
- 列は「少なくとも1回」。2回動いても困らないように、記録・一意の制約・冪等キーで守る。
- BullMQ は `Queue` で入れ、`Worker` で処理する。`attempts`・`backoff`・`concurrency`・`UnrecoverableError`。渡した node-redis の接続は、自分で閉じる。
- 定期実行は `upsertJobScheduler` と cron の `pattern`、`tz` を必ず書く。
- ワーカーは API と同じイメージを別のコマンドで動かし、`SIGTERM` で `worker.close()`（処理中の仕事を終えてから止まる）。

## 練習問題

[exercises/README.md](exercises/README.md) にあります。8問です。

## 参考資料

- BullMQ のドキュメント（Queues・Workers・Retrying failing jobs・Job Schedulers・Stalled Jobs・Graceful shutdown）: https://docs.bullmq.io/
- PostgreSQL「SELECT（The Locking Clause、SKIP LOCKED）」: https://www.postgresql.org/docs/current/sql-select.html#SQL-FOR-UPDATE-SHARE
- AWS Architecture Blog「Exponential Backoff And Jitter」: https://aws.amazon.com/blogs/architecture/exponential-backoff-and-jitter/
- crontab の書き方（crontab.guru）: https://crontab.guru/
- Render Docs「Background Workers」「Cron Jobs」: https://render.com/docs
- Celery のドキュメント（比べるため）: https://docs.celeryq.dev/

---

前の章: [第63章 ファイルの保存](../ch63-file-storage/README.md) ／ 第12部の目次: [../README.md](../README.md) ／ 次の章: [第65章 CDN とキャッシュ](../ch65-cdn-cache/README.md)
