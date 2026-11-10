# 第25章 模範解答

| 問題 | 解答のファイル | 確かめ方（`~/dev/part05/ch25-rest-api-design/exercises` で実行） |
| --- | --- | --- |
| 1 | [problem-json.mjs](problem-json.mjs) | `MODULE=../solutions/problem-json.mjs node --test problem-json.test.mjs` |
| 2 | [task-schema.mjs](task-schema.mjs) | `MODULE=../solutions/task-schema.mjs node --test task-schema.test.mjs` |
| 3 | [limit.mjs](limit.mjs) | `MODULE=../solutions/limit.mjs node --test limit.test.mjs` |
| 4 | このページ | — |
| 5 | [problem.mjs](problem.mjs) | `MODULE=../solutions/problem.mjs node --test problem.test.mjs` |
| 6 | [query.mjs](query.mjs) | `MODULE=../solutions/query.mjs node --test query.test.mjs` |
| 7 | [cursor.mjs](cursor.mjs) | `MODULE=../solutions/cursor.mjs node --test cursor.test.mjs` |
| 8 | [preconditions.mjs](preconditions.mjs) | `MODULE=../solutions/preconditions.mjs node --test preconditions.test.mjs` |
| 9 | [design-api.mjs](design-api.mjs) | `bash check-design.sh ../solutions/design-api.mjs` |

`MODULE=ファイル` を前に付けると、テストが読み込むファイルを、自分のものから模範解答に切り替えられます。

---

## 問題1 Problem Details の本文を作る

```js
import http from 'node:http';

export function problem(status, { detail, instance } = {}) {
  const body = { type: 'about:blank', title: http.STATUS_CODES[status] ?? 'Error', status };
  if (detail !== undefined) body.detail = detail;
  if (instance !== undefined) body.instance = instance;
  return body;
}

export function toErrors(issues) {
  return issues.map((issue) => ({
    pointer: '#/' + issue.path.join('/'),
    detail: issue.message,
  }));
}
```

- `{ detail, instance } = {}` は、2つ目の引数が無いときに `{}` を使い、その中から `detail` と `instance` を取り出す書き方です。
- `detail: undefined` のままキーを入れても、`JSON.stringify` は出しません。それでもキーを入れないのは、テストや画面のコードで「キーがあるか」を見たときに迷わないためです。
- 名前に `/` や `~` を含むときの正しい書き方（`~1`・`~0`）は、問題5で扱います。

## 問題2 タスクを作るときの入力を zod で書く

```js
import { z } from 'zod';

export const CreateTask = z.strictObject({
  title: z.string().trim().min(1, 'title を入力してください').max(100, 'title は 100 文字までです'),
  status: z.enum(['todo', 'doing', 'done']).default('todo'),
  dueDate: z.iso.date().optional(),
  tags: z.array(z.string().trim().min(1)).max(5).default([]),
});
```

- `.trim()` は確かめる**前**に空白を取ります。だから `'   '` は空になり、`min(1)` で断られます。
- `z.iso.date()` は形（`YYYY-MM-DD`）だけでなく、`2026-13-01` のような無い日付も断ります。
- 確かめた後は、`safeParse` の `data`（空白を取り、既定の値を入れたもの）だけを使います（本文5.4節）。

## 問題3 `limit` を確かめ、次のページの URL を作る

```js
export function parseLimit(value) {
  if (value === undefined) return { ok: true, value: 20 };
  if (typeof value !== 'string' || !/^[1-9][0-9]{0,2}$/.test(value)) return { ok: false };
  const n = Number(value);
  return n <= 100 ? { ok: true, value: n } : { ok: false };
}

export function nextLink(pathname, query, nextCursor) {
  if (nextCursor === null) return null;
  const params = new URLSearchParams(query);
  params.set('cursor', nextCursor);
  return `${pathname}?${params}`;
}
```

- `typeof value !== 'string'` で、`?limit=1&limit=2` の配列も断れます。
- `params.set` は、同じ名前があれば置き換え、無ければ後ろに足します。`append` だと、古い `cursor` も残って2つになります。
- 問題6の `parseListQuery` は、同じことを zod のスキーマで、ほかのクエリといっしょに確かめます。

## 問題4 API の設計をレビューして、直す

### 問題点

| # | 問題 | 何が困るか |
| --- | --- | --- |
| 1 | いつも 200 で、成功かどうかは `success` | 監視・ログ・プロキシ・`fetch` の `res.ok`・リトライの仕組みが、失敗に気づけない。キャッシュがエラーを「成功」として覚えることもある |
| 2 | URL が動詞（`/getTasks`・`/createTask`） | することはメソッドで表すので、URL は「もの（リソース）」にする。動詞にすると、エンドポイントの数がふくらみ、使う人が名前を覚えないといけない |
| 3 | `GET /deleteTask` | GET は「安全」（何も変えない）という約束。ブラウザの先読み、クローラ、リンクのプレビュー、`<img src>` が、勝手に消してしまう。CSRF（第2部 第9章）もしやすくなる |
| 4 | `POST /updateTask` で、送らなかった項目を空にする | 一部だけ変えたい人が、全部を送らないといけない。古い画面から送ると、他の人の変更を消す。部分の変更は PATCH、全部の置き換えは PUT にする |
| 5 | id を作る側が決める | 同じ id がぶつかる。数を推測されて、他人の id を使われる。サーバが決めて、`201` と `Location` で知らせる |
| 6 | `done: "yes"` | 文字列だと `"Yes"`・`"true"`・`"1"` も来る。真偽なら `true`／`false`。この API なら `status: "todo" \| "doing" \| "done"` |
| 7 | `sort` に SQL をそのまま書く | SQL インジェクション（第6部 第31章）。並べられる項目は、決めたもの（`title`・`-title` など）の中から選ばせる |
| 8 | `page` で 50 件ずつ（オフセット） | 読んでいる間に増えると、重なりや抜けが出る。件数が多いと、後ろのページほど遅い。カーソルにする（本文 6節）。件数の上限（`limit` の最大）も決める |
| 9 | 日付が `"2026/11/5 9:00"`（日本時間） | タイムゾーンが分からない。並べ替えや比べるのが難しい。ISO 8601（`2026-11-05T00:00:00Z`）にする |
| 10 | URL の入れ子が深い（`/users/5/projects/2/tasks/3/comments/7`） | コメントの id だけで1件に決まるなら、`/comments/7` でよい。深いと、途中の id を全部知らないと呼べない。入れ子は1段（`/tasks/3/comments`）までが目安 |
| 11 | エラーに `NullPointerException at …` | サーバの作り（言語、ファイル名、行番号）が外に見える。攻撃の手がかりになる。客には決めた形の文だけを返し、詳しいことはログに書く |
| 12 | `POST /tasks/3/complete` だけ、ほかと書き方が違う | 書き方がそろっていない。「完了にする」は `PATCH /tasks/3` で `{ "status": "done" }` で書ける。どうしても動詞が要るもの（「送信する」など）だけ、`POST /tasks/3/complete` のような形にする |
| 13 | 検索だけ `/tasks/search` | 一覧の絞り込みは、一覧の URL のクエリ（`GET /tasks?q=牛乳`）で書ける |
| 14 | バージョンの決めごとが無い | 後で形を変えたいとき、使っている人を壊してしまう（本文 9節） |

### 直した設計

| # | メソッドと URL | 成功 | 主なエラー |
| --- | --- | --- | --- |
| 1 | `GET /v1/tasks?status=todo&sort=-createdAt&limit=20&cursor=…` | 200 `{ items, nextCursor }` | 400（クエリの間違い） |
| 2 | `GET /v1/tasks/3` | 200（`ETag` 付き） | 404 |
| 3 | `POST /v1/tasks` ボディ `{ "title": "…", "dueDate": "2026-11-30" }` | 201、`Location: /v1/tasks/10` | 415、422 |
| 4 | `PATCH /v1/tasks/3` ボディ `{ "status": "done" }`、`If-Match: "4"` | 200（新しい `ETag`） | 404、412、415、422、428 |
| 5 | `DELETE /v1/tasks/3` | 204 | 404 |
| 6 | （4 の `PATCH` で `status: "done"`） | | |
| 7 | `GET /v1/tasks?q=牛乳&sort=-title` | 200 | 400（`sort` が決めたものでない） |
| 8 | `GET /v1/comments/7`、一覧は `GET /v1/tasks/3/comments` | 200 | 404 |

日付はすべて ISO 8601 の UTC（`"2026-11-05T00:00:00.000Z"`）、締め切りのような「日付だけ」は `"2026-11-30"` にします。

### エラーの本文の例

```http
HTTP/1.1 422 Unprocessable Content
Content-Type: application/problem+json

{
  "type": "about:blank",
  "title": "Unprocessable Content",
  "status": 422,
  "instance": "/v1/tasks",
  "errors": [
    { "pointer": "#/title", "detail": "title を入力してください" },
    { "pointer": "#/dueDate", "detail": "日付は YYYY-MM-DD の形です" }
  ]
}
```

## 問題5 エラーを Problem Details の形にそろえる

[problem.mjs](problem.mjs) を見てください。

- **`HttpProblem` の確かめ**: `new HttpProblem(200)` のような間違いを、その場で見つけます。投げた後で 200 のエラーが返ると、原因を探しにくくなります
- **値の無い項目は出さない**: `detail: undefined` を `JSON.stringify` すると消えますが、`null` は残ります。そろえるために、`send` で1つずつ足しています
- **zod は 422、body-parser は `err.type`**: Express は `express.json()` の失敗に `status`（400・413・415）を付けますが、`type`（`entity.parse.failed` など）で見分けると、日本語の `detail` を自分で決められます
- **知らない 400 番台の `detail` を出さない**: パッケージの例外の文には、中の作りや、客が送った値がそのまま入っていることがあります。`title`（`Bad Request`）だけで十分です
- **500 だけをログに**: 400 番台は客の間違いなので、ログに全部書くと、本当の失敗が埋もれます。数を知りたいなら、第26章のアクセスログ（ステータスつき）で数えます
- **`headersSent`**: 途中まで送った後に、別の本文を返すことはできません。`next(err)` で Express に渡すと、接続を切ります（第24章 練習問題7の `done` と同じ）

## 問題6 一覧のクエリを zod で確かめる

[query.mjs](query.mjs) を見てください。

- **`z.coerce.number()` を使わない**: `Number('')` は 0、`Number(' 20 ')` は 20、`Number('2e1')` と `Number('0x14')` も 20 です。「URL に書いてあった文字」と「使った値」が違うと、キャッシュのキーやログと、実際の動きがずれます。先に正規表現で形を決めてから、数にします
- **配列を断る**: Express 5 の `req.query` の値は、文字列か配列です。`?limit=1&limit=2` を考えずに `Number(['1','2'])` とすると `NaN`、`String(['a','b'])` は `'a,b'` になります。`z.string()` の前に確かめて、「1回だけ指定してください」と返します
- **`strictObject`**: `?pgae=2` のような打ち間違いを、黙って無視しないためです。黙って無視すると、使う人は「2ページ目が出ない」と悩みます
- **名前を分ける**: URL では `due_before`、コードでは `dueBefore` にしました。URL の名前は公開した約束で変えにくいので、コードの中の都合と分けておきます
- **同じ文を1つに**: `status=x,y` では、`x` と `y` のそれぞれで同じ文が出ます。1つにまとめて返します

## 問題7 カーソルでページを分ける

[cursor.mjs](cursor.mjs) を見てください。

- **並べ方を1通りに決める**: `createdAt` が同じものがあると、`sort` の結果の順番が決まらず、ページの境目で重なりや抜けが出ます。最後に `id` で並べると、どの2つも順番が決まります。SQL でも `ORDER BY created_at DESC, id DESC` と書きます
- **位置ではなく値で探す**: 「`id` 5 の次から」を `findIndex` で探すと、`id` 5 が消されたときに見つかりません。`(値, id)` より後ろのものを `filter` で探すので、消されていても続きから読めます。SQL では `WHERE (created_at, id) < ($1, $2)` で、索引を使って速く探せます（第6部 第30章）
- **1件多く見る**: `rest.length > limit` で、次のページがあるかが分かります。SQL なら `LIMIT limit + 1` で取って、1件多ければ次があります
- **署名**: カーソルの中身（値と id）は見られても困りませんが、作り変えられると、たとえば別の並べ方の値を混ぜて、思わない条件を作られます。署名をしておけば、自分が作ったカーソルだけを受け付けられます。`s`（sort）を入れておくのは、`sort=title` のカーソルを `sort=-createdAt` で使われると、値の意味が変わるからです

## 問題8 `If-Match`・`If-None-Match` を正しく確かめる

[preconditions.mjs](preconditions.mjs) を見てください。

- **ETag の並びの読み方**: ETag の `"…"` の中には、`"` と空白と制御文字以外の、見える文字を書けます。`,` も書けるので、`split(',')` では `"a,b"` が2つに割れます。正規表現の `y`（sticky）フラグで、前から1つずつ取り出しました
- **強い比べ方と弱い比べ方**: 弱い ETag（`W/"…"`）は「意味としては同じ」という印で、バイトまで同じとは限りません。書き換えの前の確かめ（`If-Match`）には、バイトまで同じことを保証する強い ETag だけを使います。キャッシュの確かめ（`If-None-Match`）は、意味が同じなら十分なので、弱い比べ方です
- **Express の自動の ETag**: 本文のハッシュから作った弱い ETag（`W/"…"`）です。強い比べ方ではあてはまらないので、`If-Match` には使えません。サンプルのように `app.set('etag', false)` にして、`version` から強い ETag を自分で作ります
- **`If-None-Match: *` で「無いときだけ作る」**: `PUT /api/tasks/7` に `If-None-Match: *` を付けると、もう 7 があれば 412 になり、他の人が作ったものを上書きしません
- **順番**: RFC 9110 13.2.2 の順番は「`If-Match` → `If-Unmodified-Since` → `If-None-Match` → `If-Modified-Since`」です。この解答は ETag の2つだけを扱いました。日時の2つは、ETag のヘッダがあるときは見ない、と決まっています
- **412 と 409 の違い**: 412 は「送ってきた条件（見ていた版）があてはまらない」、409 は「今の状態では、その変更ができない」（たとえば「完了したタスクは、締め切りを変えられない」）です

## 問題9 ステータスコードと応答の形のバグを直す

[design-api.mjs](design-api.mjs) を見てください。直したところには `// 修正:`・`// 追加:` を付けました。

| バグ | 起きていたこと | 通る確認 |
| --- | --- | --- |
| `limit` を確かめていない | `abc` は `NaN` で空の 200、`1000` で全部を返す | 1, 2 |
| 無いタスクの GET が `res.json(null)` | 200 で本文が `null` | 4, 5, 6 |
| POST が `res.json` だけ | 200 で、`Location` が無い | 7, 8 |
| `CreateTask.parse` の `ZodError` を、エラーハンドラが 500 にしていた | 入力の間違いが 500。しかも zod の中の文を見せていた | 9, 10, 12 |
| `Content-Type` を確かめていない | `text/plain` のボディは `express.json()` に飛ばされ、`req.body` が `undefined` で 500 | 11, 12 |
| PATCH で、確かめた後の値ではなく `req.body` を使っていた | `z.object` は知らない項目を取り除いた値を返すが、それを使っていない。`{"id":1}` でタスク 2 の id が 1 になり、タスク 2 が見えなくなった | 14, 15 |
| PATCH の中身の間違いが 400 | URL ではなく、送った中身の間違いなので 422 | 16 |
| DELETE がいつも 200 `{ deleted: true }` | 無いものを消しても成功に見える。本文が要らないので 204 | 18, 19 |
| エラーハンドラが `application/json` で `err.message`、404 の受け皿が無い | エラーの形がそろわない。中の文が見える。どこにもないパスは HTML | 5, 12, 20 |

- 確認14・15が大事です。zod で確かめていても、**確かめた後の値を使わなければ**意味がありません。`safeParse` の `r.data` だけを使い、`req.body` には戻らない、を決まりにします。`strictObject` にしておけば、知らない項目が来た時点で 422 になり、送った人も間違いに気づけます
- 確認11: `express.json()` は、`Content-Type` が JSON でないボディを読まずに次へ進みます（第23章）。ボディが要るルートでは、自分で 415 を返します。`requireJson` を `app.use` ではなくルートに付けたのは、GET や DELETE（ボディの無いリクエスト）を断らないためです
- 確認3・13・17は、直す前から通ります。正しく動いている部分を壊していないかを確かめるためのものです
