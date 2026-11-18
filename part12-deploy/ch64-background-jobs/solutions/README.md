# 第64章 模範解答

練習問題（[../exercises/README.md](../exercises/README.md)）の模範解答です。動かすときは、`exercises/` で `MODULE=../solutions/○○.ts` を付けてテストを動かします。問題5・8は PostgreSQL、問題6は Redis（どちらも第6部の compose）を動かしておきます。

| 問題 | ファイル | 確かめ方（`exercises/` で） |
| --- | --- | --- |
| 1 | [backoff.ts](backoff.ts) | `MODULE=../solutions/backoff.ts node --test backoff.test.ts` |
| 2 | [job-schema.ts](job-schema.ts) | `MODULE=../solutions/job-schema.ts node --test job-schema.test.ts` |
| 3 | [next-run.ts](next-run.ts) | `MODULE=../solutions/next-run.ts node --test next-run.test.ts` |
| 4 | このファイルの「問題4」 | |
| 5 | [pg-jobs.ts](pg-jobs.ts) | `MODULE=../solutions/pg-jobs.ts node --test pg-jobs.test.ts` |
| 6 | [mail-processor.ts](mail-processor.ts) | `MODULE=../solutions/mail-processor.ts node --test mail-processor.test.ts` |
| 7 | [run-worker.ts](run-worker.ts) | `MODULE=../solutions/run-worker.ts node --test run-worker.test.ts` |
| 8 | [daily-digest.ts](daily-digest.ts) | `MODULE=../solutions/daily-digest.ts node --test daily-digest.test.ts` |

---

## 問題1 再試行までの待ち時間と、再試行してよい失敗か

```ts
const cap = Math.min(options.maxMs, options.baseMs * 2 ** (attempt - 1));
return Math.floor(cap * options.random());
```

- `random` を引数で受け取るのは、テストで決まった値にするためです（第11部 第56章の「今」を引数で、と同じ考え方）。本番では `random: Math.random` を渡します。
- `2 ** 49` のような大きな数になっても、`Math.min` で `maxMs` に抑えるので困りません。
- 「0 から上限の間のどこか」（full jitter）にすると、待ち時間の平均は半分になりますが、同時に失敗した 100 のワーカーが、100 通りの時刻にばらけます。本文の参考資料の AWS の記事に、比べた結果があります。
- `isRetryable` は、「分からない失敗は再試行する」にしました。再試行しすぎても回数の上限（`attempts`）で止まりますが、直る失敗をあきらめると、メールが届かないままになるからです。「直らない」と**はっきり分かるもの**（`PermanentError`、400 番台、SMTP の 5xx）だけを `false` にします。
- 429（多すぎる）は 400 番台ですが、「少し待てば受け付ける」という意味なので再試行します。相手が `Retry-After` を返していれば、その時間を待つのがもっと良いです（第5部 第24章）。
- `err` は `unknown` なので、`'code' in err && typeof err.code === 'string'` のように、項目があるか・型は何かを順に確かめます。`as` は使いません。

## 問題2 仕事のデータを Zod で確かめる

```ts
export const JobSchema = z.discriminatedUnion('name', [
  z.strictObject({ name: z.literal('send-mail'), to: z.email(), subject: z.string().min(1).max(200), text: z.string().min(1) }),
  z.strictObject({ name: z.literal('delete-file'), key: z.string().startsWith('files/') }),
  z.strictObject({ name: z.literal('daily-digest'), day: z.iso.date() }),
]);

const input = typeof data === 'object' && data !== null ? { ...data, name } : { name };
const r = JobSchema.safeParse(input);
```

- BullMQ では、仕事の名前（`queue.add` の1つ目の引数）とデータが別々なので、確かめる前に `{ ...data, name }` で1つにします。こうすると、`JobData` の型は `name` で絞り込める判別できるユニオンになり、ワーカーの中で `switch (job.name)` と書けます。
- `delete-file` の `key` を `files/` で始まるものに限るのは、仕事のデータを書き換えられても（手で入れた、古い版のバグ）、ほかの人のファイルや、別の用途のオブジェクトを消さないためです。消す仕事は、取り返しがつきません。
- `data` がオブジェクトでないとき `{ ...data }` を使わないのは、文字列を広げると `{ 0: 'x' }` になって、分かりにくい失敗になるからです。

## 問題3 「毎日 8 時」の次の時刻と、その地域の日付

```ts
const offset = at.utcOffsetMinutes * MINUTE;
const local = now.getTime() + offset;              // その地域の時刻を「UTC のふり」に
const startOfDay = Math.floor(local / DAY) * DAY;  // その地域の今日の 0:00
let run = startOfDay + (at.hour * 60 + at.minute) * MINUTE;
if (run <= local) run += DAY;                      // 過ぎていたら（同じ時刻も）次の日
return new Date(run - offset);                     // 本当の UTC に戻す
```

- `<=`（`<` ではない）にしたのは、ちょうど 8:00 に計算したとき、「今」をもう一度返すと、同じ仕事を2回入れてしまうからです。
- この計算は、ずれがいつも同じ地域（日本）でしか正しくありません。夏時間のある地域（`America/New_York` など）では、年に2回ずれが1時間変わります。BullMQ の `tz` は、地域の名前から、その日のずれを調べてくれます。自分で計算するのは、テストや、日付のキー（`localDay`）を作るときだけにします。
- `localDay` は、毎朝の仕事の「1 日 1 回」のキー（問題8の `day`）に使います。サーバの時刻（UTC）の日付を使うと、日本の朝 8 時は UTC では前の日の 23 時なので、1 日ずれます。

## 問題4 考えて答える

1. 1つ目: 送っている途中で、デプロイ（`SIGTERM`、そして `SIGKILL`）やエラーでプロセスが止まると、そのメールは消えます。どこにも記録が無いので、だれも気づきません。2つ目: メールのサーバが一時的に失敗しても、再試行がありません。利用者は確認メールが来ないまま、待ち続けます（ほかに: 遅いメールのサーバが、同じプロセスの API の処理と、メモリや接続を取り合う）。
2. `locked` が `true` のまま残り、だれも取らなくなります。その仕事は永久に処理されません（人が見つけて、手で `false` に戻すまで）。期限を付けておけば、期限が過ぎたら、ほかのワーカーが取り直せます。
3. 「終わった」と書かれていないので、ロック（BullMQ なら既定で 30 秒。執筆時点）が切れた後、ほかのワーカーが `stalled` の仕事として取り直し、もう一度メールを送ります。利用者には、同じメールが2通届きます。減らすには、送った直後に「この仕事の ID で送った」と記録し、送る前に記録を見ます（練習問題6）。記録より前に殺されると、まだ2通になりえますが、その間はほんの一瞬です。また、`SIGTERM` で `worker.close()` して、処理中の仕事を終えてから止まるようにすれば、デプロイで `SIGKILL` まで行くことは、ほとんど無くなります（7.1節）。
4. 4回始まり、2回目は1回目の失敗から 0.5 秒後、3回目は 1 秒後、4回目は 2 秒後です。4回目も失敗すると、`attempts` を使い切ったので、もう再試行されず、「失敗」（failed）の仕事として Redis に残ります（`removeOnFail: 500` なので、新しい 500 個まで）。執筆の環境で試した出力です。

   ```
   列 mail を待っています
   1.0s 仕事 2 を始めます（1 回目）: {"to":"user1@example.com"}
   1.0s 仕事 2 が失敗: メールのサーバにつながりません（わざと）
   1.5s 仕事 2 を始めます（2 回目）: {"to":"user1@example.com"}
   1.5s 仕事 2 が失敗: メールのサーバにつながりません（わざと）
   2.5s 仕事 2 を始めます（3 回目）: {"to":"user1@example.com"}
   2.5s 仕事 2 が失敗: メールのサーバにつながりません（わざと）
   4.6s 仕事 2 を始めます（4 回目）: {"to":"user1@example.com"}
   4.6s 仕事 2 が失敗: メールのサーバにつながりません（わざと）
   ```

   `attempts` は「最初の1回をふくめた回数」です。Celery の `max_retries`（再試行の回数）とは1つずれるので、気をつけます（本文 9節）。
5. サーバの時刻（UTC）の 8 時に動くので、日本時間では 17 時（夕方 5 時）に届きます。日本は UTC より 9 時間進んでいるからです。`tz: 'Asia/Tokyo'` を書きます。
6. 終わった仕事とあきらめた仕事が、全部 Redis に残り続けます。半年で 1,800 万個の仕事のデータ（宛先などのメールの中身ごと）がたまり、Redis のメモリが足りなくなって、新しい仕事を入れられなくなったり（書き込みを断る設定のとき）、ほかのキーが消されたり（古いものから消す設定のとき）します。また、宛先のメールアドレスという個人の情報を、要らなくなった後も持ち続けることになります。終わった仕事は、数か期間（`removeOnComplete: { age: 秒 }`）で消します。

## 問題5 PostgreSQL の列に、待ってからの再試行とあきらめを足す

```sql
UPDATE jobs
   SET last_error = $2,
       locked_until = NULL,
       run_at = CASE WHEN attempts < max_attempts THEN now() + make_interval(secs => $3) ELSE run_at END,
       dead_at = CASE WHEN attempts < max_attempts THEN NULL ELSE now() END
 WHERE id = $1
RETURNING dead_at IS NOT NULL AS dead
```

- `attempts` は `claimNext` で増やしているので、`fail` の時点で「今の試みが何回目か」です。2回まで（`max_attempts = 2`）なら、1回目の失敗は `1 < 2` で再試行、2回目の失敗は `2 < 2` が偽なのであきらめ、になります。
- 回数を読む `SELECT` と、書く `UPDATE` を分けると、その間にほかの処理が割り込む余地ができます（第6部 第30章）。1つの `UPDATE` の中の `CASE` なら、その心配がありません。
- `claimNext` の条件に `dead_at IS NULL` を足し、索引の条件（`WHERE done_at IS NULL AND dead_at IS NULL`）にも足しました。あきらめた仕事が増えても、取る SQL は遅くなりません。
- 待ち時間は、問題1の `retryDelay` で決めて `delayMs` に渡す、という分け方にしました。列は「いつ取れるか」だけを知り、待ち時間の決め方は知りません。
- `listDead` は、人が見て直すための一覧です。直したら、`dead_at = NULL, attempts = 0, run_at = now()` に戻すと、また取られます（BullMQ では `job.retry()`）。

## 問題6 2回送らないメールの処理（BullMQ）

```ts
const key = `mail:${job.id ?? ''}`;
let result: 'sent' | 'skipped' = 'skipped';
if (!(await options.sent.has(key))) {
  try {
    await options.mailer.send(parsed.data);
  } catch (err) {
    if (typeof err === 'object' && err !== null && 'responseCode' in err && Number(err.responseCode) >= 500) {
      throw new UnrecoverableError(`送れません: ${err instanceof Error ? err.message : ''}`);
    }
    throw err;
  }
  await options.sent.add(key); // 送った直後に覚える
  result = 'sent';
}
await options.afterSend?.(parsed.data.to);
return result;
```

- `sent.add` を、`afterSend` より**前**、送った**直後**に置くのが大事な所です。`afterSend` の後に置くと、`afterSend` が失敗して再試行されたとき、記録が無いので、もう一度送ってしまいます（テストの3つ目がこれを確かめます）。
- キーに仕事の ID を使うので、「同じ仕事を2回処理する」は防げますが、「同じ人に同じメールを2つの仕事で頼む」は防げません。それを防ぎたいなら、キーを仕事の内容（`welcome:ユーザーの ID` など）で作ります。どちらが正しいかは、メールの種類で決めます（パスワードの再設定は、頼まれるたびに送る）。
- `UnrecoverableError` を投げると、BullMQ は `attempts` が残っていても、すぐに失敗にします（テストでは `attemptsMade` が 1）。
- 本番の `SentStore` は、Redis の `SET key 1 NX EX 秒`（無ければ置く、期限つき）や、PostgreSQL の一意の制約のある表にします。メモリ（`Set`）では、ワーカーが2台あると共有できません。

## 問題7 止める合図で、今の仕事を終えてから止まるループ

```ts
while (!deps.signal.aborted) {
  let job: J | undefined;
  try {
    job = await deps.claim();
  } catch {
    await idle(deps.idleMs, deps.signal);
    continue;
  }
  if (job === undefined) {
    await idle(deps.idleMs, deps.signal);
    continue;
  }
  try {
    await deps.handle(job);
    await deps.complete(job);
    stats.completed += 1;
  } catch (err) {
    await deps.fail(job, err);
    stats.failed += 1;
  }
}
```

- `idle` は、`setTimeout(ms, undefined, { signal })` を `try` / `catch` で包んだ関数です。abort されると、待ち時間の途中でも例外で戻ってくるので、`catch` で何もせずに戻り、`while` の条件で止まります。`sleep(1000)` を `signal` なしで待つと、止める合図から最大 1 秒、止まるのが遅れます（テストの4つ目）。
- `handle` には `signal` を渡していません。「処理中の仕事は最後まで終える」ためです。ただし、PaaS の猶予（多くは 30 秒前後。執筆時点）を超える仕事は、どのみち `SIGKILL` で切られるので、仕事を小さく分けます（本文 7.1節）。
- `claim` の失敗でループを止めないのは、データベースの再起動（マネージドの PostgreSQL の保守など）のたびに、ワーカーが落ちて PaaS に起動し直されるのを避けるためです。ただし、ずっと失敗し続けるなら、ログ（第66章）で気づけるようにします。
- 部品を引数で受け取る形にしたので、データベースも時計も使わずにテストできました（第11部 第56章の偽物）。本番では、`claim` に問題5の `claimNext`、`fail` に `retryDelay` を使った `fail` を渡します。

## 問題8 毎朝のお知らせを、1人1日1通だけ送る

```ts
const claim = await pool.query(
  `INSERT INTO ${schema}.digest_log (user_id, day) VALUES ($1, $2) ON CONFLICT DO NOTHING RETURNING user_id`,
  [r.user_id, day],
);
if (claim.rowCount === 0) {
  result.skipped += 1;
  continue;
}
try {
  await mailer.send({ … });
  result.sent += 1;
} catch {
  await pool.query(`DELETE FROM ${schema}.digest_log WHERE user_id = $1 AND day = $2`, [r.user_id, day]);
  result.failed += 1;
}
```

- 「送ったか調べる（`SELECT`）→ 送る → 記録する（`INSERT`）」の順にすると、2つのワーカーが同時に「まだ送っていない」と見て、2通送ります（第6部 第30章の、読んでから書く間の割り込み）。**先に記録を入れ、入れられた方だけが送る**と、主キーが「どちらか1つ」を決めてくれます。テストの4つ目が、これを確かめます。
- 送れなかったら行を消すので、次に動いたとき（BullMQ の再試行や、手でのやり直し）に送れます。消す前に落ちると、その人には、その日は届きません。「2通届く」と「1通も届かない」のどちらを選ぶかは、メールの大事さで決めます。毎朝のお知らせなら、届かない方を選びました。パスワードの再設定なら、逆です。
- 人ごとの題名を、`array_agg(t.title ORDER BY t.id)` で1つの SQL にまとめたので、人数が増えても、SQL の回数は「1 + 人数」（記録の `INSERT`）で済みます。タスクを人ごとに `SELECT` すると、N+1 になります（第6部 第33章）。
- 1 人に送れなくても、`try` / `catch` で受け止めて、ほかの人に送り続けます。1 人の宛先の失敗で、全員のお知らせが止まらないようにするためです。
- 人が何万人もいるなら、この関数の中で全員に送るのではなく、「人ごとの `send-mail` の仕事」を列に入れる形にします。1通ごとに再試行でき、ワーカーを増やせば速くなります。成果物では、この関数の形のまま、毎朝の仕事の中で呼びます。
