# 第57章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part11/ch57-api-db-testing/exercises/` で行います。最初に `cd exercises` で移動してください。問題3・6・8 は PostgreSQL（第6部の compose、5433）を使います。

| 問題 | 種類 | 書くもの | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- | --- |
| 1 | 基本 | テスト | タスクの API の HTTP のテスト | [app.ts](app.ts)、[app.test.ts](app.test.ts) | 2・3 |
| 2 | 基本 | コード | テストで API を呼ぶ部品 | [api-client.ts](api-client.ts)、[api-client.test.ts](api-client.test.ts) | 2・3 |
| 3 | 基本 | コード | 偽物を、本物と同じ約束に合わせる | [memory-users.ts](memory-users.ts)、[memory-users.test.ts](memory-users.test.ts) | 5・6 |
| 4 | 基本 | 答え | 考えて答える | [predict.md](predict.md) | 3・5・6・9 |
| 5 | 応用 | テスト | サービスの単体テスト | [service.ts](service.ts)、[service.test.ts](service.test.ts) | 4 |
| 6 | 応用 | コード | 題名で探す SQL を、本物のデータベースで確かめる | [pg-search.ts](pg-search.ts)、[pg-search.test.ts](pg-search.test.ts) | 5 |
| 7 | 応用 | コード | 外の API を覚えておいて使う | [holiday-client.ts](holiday-client.ts)、[holiday-client.test.ts](holiday-client.test.ts) | 8 |
| 8 | 発展 | コード | テストで書いたものを、必ず取り消す部品 | [with-rollback.ts](with-rollback.ts)、[with-rollback.test.ts](with-rollback.test.ts) | 7 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

## テストの使い方

- **テストを書く問題（1・5）**は、第56章と同じです。`○○.test.ts` の `// ここを書く` にテストを書き足し、`node ../../tools/check-tests.ts ○○.test.ts` で「すべて成功しました」と出れば完成です（ミュータントは [mutants/](mutants/)）。最初は、問題1で6個、問題5で6個の確認が失敗します。
- **コードを書く問題（2・3・6・7・8）**は、`○○.ts` の `// ここを書く` を書き、`node --test ○○.test.ts` ですべて通れば完成です。模範解答は `MODULE=../solutions/○○.ts node --test ○○.test.ts` で試せます。
- このフォルダの [types.ts](types.ts)・[service.ts](service.ts)・[app.ts](app.ts)・[memory-repo.ts](memory-repo.ts)・[pg-repo.ts](pg-repo.ts)・[start-app.ts](start-app.ts)・[holidays.ts](holidays.ts)・[repo-contract.ts](repo-contract.ts) は、本文の samples のコピーです。[test-db.ts](test-db.ts) は、samples のものに、ほかの表も作れる引数 `extraSql` を足したものです。どれも書き換えなくてかまいません。
- [users.ts](users.ts)・[pg-users.ts](pg-users.ts)・[users-contract.ts](users-contract.ts) は、問題3で使うユーザーの形・本物・約束のテストです。

---

## 基本

### 問題1 タスクの API の HTTP のテスト

[app.ts](app.ts) の API のうち、本文で確かめていない所のテストを、[app.test.ts](app.test.ts) に書き足してください。アプリの起動と片付け（`beforeEach`・`afterEach`）と、頼むための関数（`api`・`send`・`createTask`）は、もう書いてあります。

| 道 | 決まり |
| --- | --- |
| `GET /api/tasks` | 200 と `{ items: [タスク, …] }`（作った順） |
| `PUT /api/tasks/:id/status` | 本文 `{ "status": "todo" \| "doing" \| "done" }`。変えたタスクを 200 で返す。無いタスクは 404。知らない状態は 422（`errors[].pointer` が `/status`）で、タスクは変わらない。`doing` が3つあるときに4つ目を `doing` にすると 409 |
| `DELETE /api/tasks/:id` | 204 で本文は空。その後 `GET /api/tasks/:id` は 404。無いタスクは 404 |

```sh
$ node --test app.test.ts
$ node ../../tools/check-tests.ts app.test.ts
```

ヒント: 1つのテストで1つの道を確かめます。「タスクは変わらない」は、422 の後で `GET /api/tasks/:id` を読んで、元のタスクと比べます。

### 問題2 テストで API を呼ぶ部品

テストの中で、`fetch` と `res.json()` を毎回書くのは手間です。[api-client.ts](api-client.ts) に、`createClient(base, { timeoutMs })` を書いてください。

- `get(path)`・`post(path, body)`・`put(path, body)`・`delete(path)` を持つオブジェクトを返す。どれも `{ status, headers, body }` を返す Promise
- `post`・`put` は、本文を JSON にし、`content-type: application/json` を付けて送る。`get`・`delete` は本文を送らない
- 応答の `body` は、本文が空なら `undefined`、`content-type` に `json` を含めば（`application/json`・`application/problem+json`）`JSON.parse` した値、ほかは文字列
- どのリクエストにも `AbortSignal.timeout(timeoutMs)` を付ける（既定 5000）

```sh
$ node --test api-client.test.ts
```

最初は 6 個のテストのうち 5 個が失敗します。

ヒント: 4つのメソッドの中身はほとんど同じなので、`async function request(method, path, body?)` を1つ書いて、4つから呼びます。本文は、`res.text()` で一度だけ読んでから、空か・JSON かを決めます（`res.json()` と `res.text()` は、どちらか1回しか呼べません）。

### 問題3 偽物を、本物と同じ約束に合わせる

[users.ts](users.ts) の `UserRepo` の、メモリの偽物を [memory-users.ts](memory-users.ts) に書いてください。約束は、[users-contract.ts](users-contract.ts) のテストです。テスト [memory-users.test.ts](memory-users.test.ts) は、同じ約束を、まず本物（[pg-users.ts](pg-users.ts)）に、次にあなたの偽物に動かします。

| メソッド | 約束 |
| --- | --- |
| `create({ email, name })` | `email` は小文字にして覚える。大文字・小文字だけが違う同じアドレスがあれば `ConflictError`。id は 1, 2, 3, … |
| `findByEmail(email)` | 大文字・小文字を区別せずに探す。無ければ `undefined` |
| `rename(id, name)` | 名前だけ変えて、変えたユーザーを返す。無い id は `undefined` |
| `list()` | id の順に、全部 |
| どれも | 返したユーザーを呼んだ側が書き換えても、中のデータは変わらない |

```sh
$ node --test memory-users.test.ts
```

最初は、本物の 6 個は通り、偽物の 6 個が失敗します。

ヒント: 本文の [../samples/memory-repo.ts](../samples/memory-repo.ts) が見本です。`Map<number, User>` に覚え、返すときは `{ ...user }` でコピーします。

### 問題4 考えて答える

[predict.md](predict.md) の4つの問いに答えてください。

---

## 応用

### 問題5 サービスの単体テスト

[service.ts](service.ts) の `createTaskService` の決まりを確かめるテストを、[service.test.ts](service.test.ts) に書き足してください。データはメモリの偽物、「今」は決まった日にします（本文4節）。

| 決まり | |
| --- | --- |
| 題名 | 前後の空白を除いて、1〜100 文字。外れたら `ValidationError` |
| 期限 | 日本時間の「今日」より前なら `ValidationError`。今日は作れる |
| `changeStatus(id, 'doing')` | `doing` が `maxDoing`（既定 3）個あれば `ConflictError` で、タスクは変わらない。ただし、すでに `doing` のタスクを `doing` にするときは、数に入れない |
| `changeStatus` で無いタスク | `undefined` を返す（例外にしない） |

```sh
$ node ../../tools/check-tests.ts service.test.ts
```

ヒント: 「日本時間の今日」を確かめるには、日本時間と UTC で日付が違う時刻（日本時間の 0 時〜9 時。たとえば `2026-12-09T15:30:00Z` は日本時間 12-10 の 0 時 30 分）を `now` にします。`doing` の数は、`createMemoryRepo([...])` の seed で、ちょうどの数を作ります。

### 問題6 題名で探す SQL を、本物のデータベースで確かめる

[pg-search.ts](pg-search.ts) に、`searchTasks(db, text)` を書いてください。

- 題名に `text` を含むタスクを、id の順に、`Task` の形（`dueDate` は `'YYYY-MM-DD'` か `null`）で返す
- 大文字・小文字を区別しない（PostgreSQL の `ILIKE`）
- `text` の前後の空白は除く。除いて空なら、SQL を送らずに空の配列を返す
- `text` は必ずプレースホルダ（`$1`）で渡す。`'` を含んでもよい
- `%` と `_` と `\` は、ふつうの文字として探す

```sh
$ node --test pg-search.test.ts
```

最初は 7 個のテストのうち 6 個が失敗します。

ヒント: `LIKE`・`ILIKE` では、`%` は「何文字でも」、`_` は「どれか1文字」を表し、`\` を前に付けるとふつうの文字になります（`\` そのものは `\\`）。`text.replaceAll('\\', '\\\\')` のように、`\` を先に置き換えてから `%`・`_` の前に `\` を付けます。SQL の中では、`'%' || $1 || '%'` で前後に `%` を付けられます（`||` は文字列をつなぐ演算子）。

### 問題7 外の API を覚えておいて使う

休みの日の API は、1年分の一覧がめったに変わりません。毎回頼むのは無駄なので、覚えておいて（**キャッシュ**して）使う部品を、[holiday-client.ts](holiday-client.ts) に書いてください。API を呼ぶのは、本文の [holidays.ts](holidays.ts) の `fetchHolidays` です。

| `get(year)` の決まり | |
| --- | --- |
| 覚える | 読んだ一覧を、年ごとに覚える。読んでから `ttlMs` ミリ秒の間は、もう一度は頼まない（`now()` で時刻を読む） |
| 同時 | 同じ年を同時に頼まれても、API には1回だけ頼む（頼んでいる途中の Promise を共有する） |
| 失敗 | 頼み直しが `UpstreamError` になったら、覚えている古い一覧を返す。一度も読めていなければ、その例外を投げる（次に頼まれたら、もう一度頼む） |
| `isHoliday(date)` | `'YYYY-MM-DD'` の年の一覧に、その日があれば `true` |

```sh
$ node --test holiday-client.test.ts
```

最初は 8 個のテストのうち 7 個が失敗します。テストの中で、偽物の API のサーバが動いています（本文8節）。

ヒント: `Map<number, { holidays, fetchedAt }>` で覚え、もう1つの `Map<number, Promise<Holiday[]>>` に頼んでいる途中の Promise を入れます。頼み終わったら（成功しても失敗しても）途中の Map から消すので、`try` / `catch` / `finally` を使います。

---

## 発展

### 問題8 テストで書いたものを、必ず取り消す部品

本文7節の「テストごとにトランザクションを取り消す」を、部品にします。[with-rollback.ts](with-rollback.ts) に、`withRollback(pool, fn)` を書いてください。

- プールから接続を1つ借り（`pool.connect()`）、`BEGIN` し、`fn(接続)` を呼ぶ
- 最後に**必ず** `ROLLBACK` し、接続を返す（`release()`）
- `fn` の戻り値を返す。`fn` が例外を投げたら、取り消して返した後、**同じ例外**を投げる

```ts
// 使い方の例: この中で書いたものは、終わると消えている
await withRollback(pool, async (client) => {
  const repo = createPgRepo(client);
  await repo.insert({ title: '牛乳を買う', dueDate: null });
});
```

```sh
$ node --test with-rollback.test.ts
```

最初は 5 個のテストのうち 3 個が失敗します。

ヒント: `try { … return await fn(client); } finally { … }` の形にします。`return fn(client)`（`await` なし）と書くと、`fn` が終わる前に `finally` が動いて、取り消してしまいます。`ROLLBACK` 自体が失敗したときにも接続を返せるように、`finally` の中をもう一段 `try` / `finally` にすると安全です。
