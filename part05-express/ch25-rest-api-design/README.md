# 第25章 REST API の設計

第23・24章で、Express でルートとミドルウェアを書けるようになりました。この章では「何を書くか」、つまり API の**設計**を学びます。URL の決め方、メソッドとステータスコードの使い分け、エラーの形、入力の確かめ、ページ分け、同時の書き換え、送り直し——どれも、決めごとを1つ間違えると、使う人（画面を作る人、別のサーバ、未来の自分）が困ります。しかも、コードは「動いている」ので、間違いに気づきにくいところです。

この章のルールの多くは、HTTP の仕様（RFC 9110 など）に書かれています。「みんながそう書くから」ではなく、「ブラウザ・キャッシュ・プロキシ・ライブラリが、その約束を前提に動いているから」守る、という見方で読んでください。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 5〜6時間 |
| 前提 | 第23・24章、第2部 第6〜7章（HTTP のメソッド・ステータス・キャッシュ・ETag）、第4部 第20章（ボディと入力の確かめ）、第22章（署名） |
| この章のゴール | リソースと URL を設計できる / メソッドの「安全」「冪等」と、ステータスコードの使い分けを説明できる / エラーを Problem Details の形にそろえられる / zod で入力を確かめ、確かめた後の値だけを使える / オフセットとカーソルのページ分けの違いを説明し、カーソルで書ける / ETag と If-Match で同時の書き換えを見つけられる / 冪等キーで POST の送り直しに備えられる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | Problem Details、zod、`validate` ミドルウェア、ページ分け、ETag、冪等キー |
| [exercises/](exercises/) | 練習問題 |
| [solutions/](solutions/) | 模範解答（問題2の `problemHandler`、問題3の `paginate`、問題4の `parseListQuery` は、成果物でも使います） |

> この章のサンプルと練習問題は、`~/dev/part05/ch25-rest-api-design` の中で動かします（[第5部の README](../README.md) の「準備」）。

---

## 1. Flask で書いていた API

Flask で JSON を返す API を書くと、たとえば次のようになります。

```python
@app.get('/api/tasks/<int:task_id>')
def get_task(task_id):
    task = db.get(task_id)
    if task is None:
        abort(404)                       # 例外を投げて、404 の応答にしてもらう
    return jsonify(task)                 # 辞書を JSON にして、200 で返す

@app.post('/api/tasks')
def create_task():
    data = request.get_json()            # ボディの JSON を辞書にする（形が違えば 400 や 415）
    if not data.get('title'):
        return jsonify(error='title がありません'), 400   # (本文, ステータス) の組で返す
    task = db.create(data['title'])
    return jsonify(task), 201
```

- `<int:task_id>` は、URL の一部を整数として受け取る書き方です。数字でなければ、Flask が 404 を返します
- `abort(404)` は「このステータスで終わりにする」ための例外です。何も設定しなければ、Flask は**HTML の**エラーページを返します
- `return 本文, ステータス` で、ステータスを決めます。書かなければ 200 です
- 入力の確かめは、Flask 自体にはありません。`if` で書くか、marshmallow や pydantic などのライブラリを使います

Flask も Express も、「どの URL に、どのメソッドで、何を返すか」は**書く人が決める**ものです。フレームワークは、決めたものを書きやすくするだけです。だから、同じ Flask や Express でも、使いやすい API と、使いにくい API ができます。この章では、その「決め方」を扱います。

## 2. リソースと URL

### 2.1 URL は「もの」、メソッドは「すること」

REST の考え方では、API が扱うものを**リソース**と呼び、1つ1つに URL を付けます。することは、URL ではなくメソッドで表します。

| したいこと | よくない例 | よい例 |
| --- | --- | --- |
| 一覧を見る | `GET /getTasks` | `GET /tasks` |
| 1件を見る | `GET /getTask?id=3` | `GET /tasks/3` |
| 作る | `POST /createTask` | `POST /tasks` |
| 一部を変える | `POST /updateTask` | `PATCH /tasks/3` |
| 消す | `GET /deleteTask?id=3` | `DELETE /tasks/3` |

- 集まり（コレクション）は複数形の名詞（`/tasks`）、1件はその下に id（`/tasks/3`）にします
- URL は小文字とハイフン（`/task-lists`）にそろえることが多いです。JSON の項目名（`dueDate`）とは別の決めごとです
- 拡張子（`.json`）は付けません。形は `Content-Type` と `Accept` で伝えます

### 2.2 入れ子は1段まで

「タスク 3 のコメント」は `/tasks/3/comments` と書けます。でも、`/users/5/projects/2/tasks/3/comments/7` のように深くすると、コメント 7 を見るのに、途中の id を全部知っている必要があります。コメントの id だけで1件に決まるなら、`/comments/7` で十分です。

- 一覧と作る: `GET /tasks/3/comments`、`POST /tasks/3/comments`（どのタスクの下か、が意味を持つ）
- 1件: `GET /comments/7`、`DELETE /comments/7`

### 2.3 動詞がどうしても要るとき

「完了にする」は `PATCH /tasks/3` に `{ "status": "done" }` で書けます。一方、「メールを送り直す」「計算を始める」のように、リソースの状態を変えるだけでは表せない操作もあります。そのときは `POST /tasks/3/reminders` のように「作られるもの」を名詞にするか、`POST /tasks/3/send-reminder` のように動詞の URL を作ります。動詞の URL は例外として、数を少なくします。

### 2.4 絞り込み・並べ替え・ページはクエリで

一覧の絞り込みは、別の URL を作らず、一覧の URL のクエリで書きます。

```text
GET /tasks?status=todo,doing&sort=-dueDate&limit=20&cursor=…
```

`/tasks/search` や `/tasks/todo` のような URL を作ると、組み合わせ（「todo で、締め切りの順で、2ページ目」）が書けなくなります。

## 3. メソッドとステータスコード

### 3.1 安全と冪等

HTTP のメソッドには、2つの大事な性質があります（RFC 9110 9.2）。

| メソッド | 安全（何も変えない） | 冪等（何回送っても、1回と同じ結果） | この API での使い方 |
| --- | --- | --- | --- |
| GET・HEAD | ○ | ○ | 見る |
| PUT | × | ○ | 全部を置き換える（無ければ作る） |
| DELETE | × | ○ | 消す |
| PATCH | × | ×（書き方による） | 一部を変える |
| POST | × | × | 作る、ほかのどれにもあてはまらない操作 |

この性質は、HTTP の周りの仕組みが前提にしています。

- **安全**: ブラウザの先読み、検索エンジンのクローラ、チャットのリンクのプレビューは、GET を勝手に送ります。`GET /deleteTask?id=3` は、誰かが URL を貼っただけで消えてしまいます
- **冪等**: 通信が途中で切れたとき、HTTP のクライアントやプロキシは、冪等なリクエストなら送り直してよいと考えます。DELETE を2回送っても、消えている状態は同じです（2回目の応答は 404 でもかまいません。「状態」が同じなら冪等です）。POST は2回送ると2つできるので、勝手には送り直されません（8節）

PUT と PATCH の違いも、ここから分かります。PUT は「この URL を、送った内容そのものにする」なので、何回送っても同じです。PATCH は「この変更をあてる」で、`{ "count": "+1" }` のような変更なら、送るたびに変わります。この教材の PATCH は「送った項目だけを、その値にする」（JSON Merge Patch、RFC 7396 の考え方）なので、冪等になります。

### 3.2 ステータスコードの使い分け

よく使うものだけを挙げます。

| ステータス | 意味 | この API で使う場面 |
| --- | --- | --- |
| 200 OK | 成功。本文あり | GET、PATCH（変えた後のもの） |
| 201 Created | 作った | POST。`Location` に、できたものの URL |
| 204 No Content | 成功。本文なし | DELETE |
| 304 Not Modified | 変わっていない | `If-None-Match` があてはまった GET（7節） |
| 400 Bad Request | リクエストの形がおかしい | 壊れた JSON、クエリやパスの値の間違い |
| 401 Unauthorized | 誰か分からない | ログインしていない、トークンが無い（第10部） |
| 403 Forbidden | 誰かは分かるが、許されていない | 他の人のタスクを消そうとした（第10部） |
| 404 Not Found | 無い | 無い id、どのルートにもないパス |
| 409 Conflict | 今の状態では、できない | 同じ名前がもうある、完了したものは変えられない |
| 412 Precondition Failed | 送ってきた条件があてはまらない | `If-Match` の ETag が古い（7節） |
| 413 Content Too Large | ボディが大きすぎる | `express.json()` の上限を超えた |
| 415 Unsupported Media Type | ボディの形を受け付けない | JSON を待っているのに `text/plain` |
| 422 Unprocessable Content | 形は正しいが、中身が正しくない | `title` が空、日付が `2026-13-01` |
| 428 Precondition Required | 条件を付けて送ってほしい | `If-Match` の無い PATCH（7節） |
| 429 Too Many Requests | 送りすぎ | 第24章の `rateLimit` |
| 500 Internal Server Error | サーバの失敗 | 予想していない例外 |

大事なのは、**いつも 200 で返して、本文の `success: false` で失敗を知らせる**、という書き方をしないことです。`fetch` の `res.ok`、監視のツール、アクセスログの集計、リトライの仕組み、キャッシュは、どれもステータスを見ます。200 で失敗を返すと、全部が「成功」と思ってしまいます。

### 3.3 400 と 422

どちらも「客の間違い」ですが、この教材では次のように分けます。

- **400**: リクエストそのものが読めない、または URL の部分（クエリ・パス）が間違っている。壊れた JSON、`?limit=abc`
- **422**: ボディは JSON として読めたが、中身が決まりに合わない。`{ "title": "" }`

422 は、もとは WebDAV のためのステータスでしたが、今は RFC 9110 に入っています。400 にまとめる API もあり、どちらが正しいというものではありません。大事なのは、**API の中で1つに決めて、説明書に書く**ことです。

### 3.4 201 と Location、204

作ったら、201 と一緒に `Location` ヘッダで、できたものの URL を返します。id はサーバが決めるので、使う人はこれで「どこにできたか」を知ります。本文には、できたもの（サーバが足した `id`・`createdAt` など）を入れておくと、もう一度 GET しなくて済みます。

```js
app.post('/api/tasks', (req, res) => {
  const task = tasks.create(data);
  res.status(201).location(`/api/tasks/${task.id}`).json(task);
});
```

DELETE のように返すものが無いときは 204 にして、本文を送りません。`res.status(204).json({ deleted: true })` と書いても、Express は本文を捨てます（204 には本文を付けられないため）。`res.sendStatus(204)` か `res.status(204).end()` と書きます。

### 3.5 Express が決めないこと

Express 5 は、次のことを自分ではしません（第23章で確かめました）。

- 知らないメソッド（`DELETE /api/tasks` で、DELETE のルートが無い）は、405 ではなく 404 になる。405 が要るなら、自分で書く
- `express.json()` は、`Content-Type` が JSON でないボディを読まずに飛ばす（`req.body` は `undefined`）。415 が要るなら、自分で書く
- エラーと 404 の既定の応答は HTML。JSON の API なら、自分で書く（4節）

## 4. エラーの形をそろえる

### 4.1 Problem Details（RFC 9457）

エラーの本文の形がルートごとに違うと、使う人は、ルートごとに読み方を書かないといけません。

```json
{ "error": "not found" }
{ "message": "title is required", "code": 1001 }
{ "errors": ["..."] }
```

HTTP の API のエラーの形には、**Problem Details**（RFC 9457。前の版は RFC 7807）という標準があります。`Content-Type` を `application/problem+json` にして、次の項目を返します。

```http
HTTP/1.1 404 Not Found
Content-Type: application/problem+json

{
  "type": "about:blank",
  "title": "Not Found",
  "status": 404,
  "detail": "タスク 99 はありません",
  "instance": "/api/tasks/99"
}
```

| 項目 | 意味 |
| --- | --- |
| `type` | エラーの種類を表す URI。決まった種類が無ければ `about:blank`（そのときは `title` をステータスの名前にする） |
| `title` | 種類の短い説明。同じ `type` なら、いつも同じ文 |
| `status` | HTTP のステータス（本文だけを保存したときのため） |
| `detail` | 今回のエラーについての、人が読む説明 |
| `instance` | 今回のエラーが起きた場所（この教材では URL） |

これ以外の項目を足してもかまいません。この教材では、入力の間違いを `errors` に並べます。

```json
{
  "type": "about:blank",
  "title": "Unprocessable Content",
  "status": 422,
  "instance": "/api/tasks",
  "errors": [
    { "pointer": "#/title", "detail": "title を入力してください" },
    { "pointer": "#/tags/1", "detail": "空のタグは使えません" }
  ]
}
```

ボディの中の場所は、JSON Pointer（RFC 6901）で示します。`#/tags/1` は「`tags` の2番目（0から数える）」です。クエリやパスの間違いは、`{ "parameter": "limit", "detail": "…" }` のように名前で示します。どちらも RFC 9457 の例で使われている書き方です。

```sh
$ node samples/problem-demo.mjs
$ curl -si http://127.0.0.1:9320/api/tasks/99
$ curl -si -X POST -H 'Content-Type: application/json' -d '{"title":' http://127.0.0.1:9320/api/tasks
```

### 4.2 1か所にまとめる

エラーの形は、ルートごとに書かず、**最後のエラーハンドラ1つ**で作ります（第24章 3節）。ルートでは、ステータスと説明を持った例外を投げるだけにします。

```js
export class HttpProblem extends Error {
  constructor(status, { title, detail, errors, headers } = {}) {
    super(detail ?? title ?? `HTTP ${status}`);
    Object.assign(this, { status, title, detail, errors, headers });
  }
}

app.get('/api/tasks/:id', (req, res) => {
  const task = tasks.get(Number(req.params.id));
  if (!task) throw new HttpProblem(404, { detail: `タスク ${req.params.id} はありません` });
  res.json(task);
});

app.use(notFound());        // どのルートにもないもの
app.use(problemHandler());  // HttpProblem・ZodError・body-parser のエラー・それ以外を、problem+json にする
```

`problemHandler` の中では、エラーの種類ごとにステータスを決めます。

| 来たもの | 返すもの |
| --- | --- |
| `HttpProblem` | そのステータスと説明 |
| zod の `ZodError` | 422 と `errors` |
| `express.json()` の失敗（`err.type`） | 壊れた JSON は 400、大きすぎると 413、知らない文字コードは 415 |
| ほかの 400 番台（Express が付けたもの） | そのステータス。`detail` は出さない |
| それ以外 | 500。`detail` は出さず、ログに書く |

**500 のときは、例外の文を客に見せません。** 例外の文には、データベースの接続先、ファイルの場所、SQL の文などが入っていることがあります。客には決めた文だけを返し、詳しいことはサーバのログに書きます（第26章で、ログに `instance` やリクエストの id を書いて、客の問い合わせとつなげる方法を扱います）。

これを、きちんと作るのが練習問題2です。

## 5. 入力を確かめる（zod）

### 5.1 なぜライブラリを使うか

第4部 第20章では、入力の確かめを `if` で書きました。項目が増えると、`if` の列は長くなり、次のことを全部書き続けるのは大変です。

- 型（文字列か、数か、配列か）、長さ、形（日付、メール）、選べる値（`todo`・`doing`・`done`）
- 知らない項目が来たら断る
- 間違いを、最初の1つで止めずに、全部集める
- 前後の空白を取る、足りないものに既定の値を入れる

**zod** は、入力の「形」をスキーマとして書き、それに合うかを確かめるライブラリです。Python の pydantic に近いものです（pydantic を使ったことが無くても大丈夫です。「形を先に書いておき、データがそれに合うかを確かめる」という考え方だけ押さえてください）。

```js
import { z } from 'zod';
z.config(z.locales.ja()); // 既定の文を日本語にする

const CreateTask = z.strictObject({
  title: z.string().trim().min(1, 'title を入力してください').max(100),
  status: z.enum(['todo', 'doing', 'done']).default('todo'),
  dueDate: z.iso.date().optional(),          // 'YYYY-MM-DD'
  tags: z.array(z.string().trim().min(1)).max(5).default([]),
});

const r = CreateTask.safeParse(req.body);
if (r.success) {
  r.data; // 確かめた後の「新しい値」（空白を取り、既定の値を入れたもの）
} else {
  r.error.issues; // [{ path: ['title'], code: 'too_small', message: 'title を入力してください' }, …]
}
```

- `parse` は合わなければ `ZodError` を投げ、`safeParse` は投げずに `{ success, data | error }` を返します
- `strictObject` は、知らない項目があると間違いにします。ふつうの `z.object` は、知らない項目を**黙って取り除きます**
- 型も取り出せます（`z.infer<typeof CreateTask>`）。第7部 第38章で、TypeScript の型と共有します

```sh
$ node samples/zod-demo.mjs
```

### 5.2 クエリは文字列で届く

クエリの値は、いつも文字列（か、その配列）です。`?limit=20` の `20` も文字列です。数にするために `z.coerce.number()` を使いたくなりますが、これは `Number()` と同じ変え方をするので、思わない値も通ります。

| 送られた値 | `z.coerce.number()` | 形を決めてから数にする |
| --- | --- | --- |
| `'20'` | 20 | 20 |
| `' 20 '` | 20 | 間違い |
| `'2e1'`・`'0x14'` | 20 | 間違い |
| `''` | 0 | 間違い |
| `['1', '2']`（`?limit=1&limit=2`） | 間違い（`NaN`） | 間違い |

「URL に書いてあった文字」と「使った値」が違うと、キャッシュのキー、ログ、使う人の思っていることが、実際の動きとずれます。先に正規表現で形を決めてから、数にします。

```js
const Limit = z.string().regex(/^[1-9][0-9]{0,2}$/, '1〜100 の整数').transform(Number).pipe(z.number().max(100));
```

Express 5 のクエリの読み方（`simple`）では、`?a[b]=1` は `{ 'a[b]': '1' }` という名前の文字列で、入れ子のオブジェクトにはなりません（第23章）。それでも、同じ名前を2回書くと配列になるので、「1回だけ」も確かめます。これをまとめて書くのが練習問題4です。

### 5.3 ミドルウェアにする

ルートごとに `safeParse` を書く代わりに、スキーマを受け取るミドルウェアにできます。

```js
function validate(schemas) {
  return (req, res, next) => {
    req.valid = {};
    for (const where of ['params', 'query', 'body']) {
      if (!schemas[where]) continue;
      const r = schemas[where].safeParse(req[where] ?? {});
      if (!r.success) return next(toProblem(where, r.error)); // ボディは 422、クエリとパスは 400
      req.valid[where] = r.data;
    }
    next();
  };
}

app.post('/api/tasks', validate({ body: CreateTask }), (req, res) => {
  const task = tasks.create(req.valid.body); // 確かめた後の値だけを使う
  res.status(201).location(`/api/tasks/${task.id}`).json(task);
});
```

Express 5 の `req.query` は、読むたびに URL から作り直す値で、書き換えられません。確かめた後の値は `req.valid` のような別の場所に入れます。

```sh
$ node samples/validate-demo.mjs
$ curl -s -X POST -H 'Content-Type: application/json' -d '{"title":"","dueDate":"明日","owner":1}' http://127.0.0.1:9321/api/tasks
```

### 5.4 確かめた後の値だけを使う

いちばん大事な決まりは、**確かめた後は `req.body` に戻らない**ことです。

```js
const r = UpdateTask.safeParse(req.body);
if (!r.success) throw …;
tasks.update(id, req.body); // ← 確かめたのに、確かめる前の値を使っている
```

`z.object` は知らない項目を取り除いた `r.data` を返しますが、`req.body` には `id` や `createdAt` が残ったままです。これで、客が `{"id": 1}` を送るだけで、別のタスクの id を書き換えられてしまいます（練習問題5の確認14・15）。項目を1つずつ選んで代入する書き方（`Object.assign(task, req.body)` の代わりに `task.title = data.title`）も、同じ理由で安全です。

## 6. ページ分け・絞り込み・並べ替え

### 6.1 上限を決める

一覧は、必ず件数の上限を決めます。タスクが 10 万件になったとき、`GET /tasks` で全部を返すと、サーバのメモリも、通信も、画面も困ります。`limit` の既定（20）と最大（100）を決めて、最大を超えたら 400 にします（黙って 100 にする API もありますが、使う人が「100 件しか来ない」ことに気づけるよう、この教材では断ります）。

### 6.2 オフセットとカーソル

ページの分け方は、大きく2つあります。

| | オフセット | カーソル（キーセット） |
| --- | --- | --- |
| 書き方 | `?limit=20&offset=40`（先頭から 40 件飛ばす） | `?limit=20&cursor=…`（前のページの最後より後ろ） |
| 好きなページへ飛ぶ | できる（「5ページ目」） | できない（前から順に） |
| 読んでいる間に増えたり消えたりすると | 重なる・抜ける | ずれない |
| 後ろのページの速さ | 遅くなる（飛ばす分も数える） | 変わらない（索引で探せる） |

オフセットのずれは、サンプルで確かめられます。1ページ目を読んだ後に、新しいタスクが先頭に1つ増えると、2ページ目の最初に、1ページ目の最後と同じものがもう一度出ます。

```sh
$ node samples/pagination-demo.mjs
$ curl -s 'http://127.0.0.1:9322/offset?limit=3&offset=0'
$ curl -s -X POST http://127.0.0.1:9322/add
$ curl -s 'http://127.0.0.1:9322/offset?limit=3&offset=3'
```

カーソルは「前のページの最後の項目の、並べ替えの値」を覚えておき、次のページは「その値より後ろ」から始めます。

```text
並べ方: createdAt の新しい順、同じなら id の大きい順
1ページ目の最後: (createdAt: '2026-11-05T09:00:00Z', id: 42)
2ページ目: createdAt < '…09:00:00Z'、または (createdAt が同じで id < 42) のもの
```

- **並べ方を1通りに決める**: `createdAt` が同じものがあると、どちらが先かが決まらず、境目で重なったり抜けたりします。最後に `id` で並べると、どの2つも順番が決まります
- **カーソルの中身は客に作らせない**: カーソルは、サーバが作って渡す「しおり」です。中身を読めても困りませんが、作り変えられると思わない条件になるので、第22章の署名を付けます
- **次があるか**: `limit + 1` 件を取ってみて、1件多ければ次のページがあります。次が無ければ `nextCursor` は `null` にします

データベースでは、この条件を `WHERE (created_at, id) < ($1, $2) ORDER BY created_at DESC, id DESC LIMIT 21` と書き、索引を使って速く探せます（第6部 第30章）。メモリの配列で、これを書くのが練習問題3です。

### 6.3 次のページの知らせ方

次のページの場所は、本文に入れるか、`Link` ヘッダ（RFC 8288）で知らせます。

```http
HTTP/1.1 200 OK
Link: </api/tasks?limit=20&cursor=eyJ2Ijo…>; rel="next"
Content-Type: application/json

{ "items": [ … ], "nextCursor": "eyJ2Ijo…" }
```

この教材の成果物では、本文の `nextCursor` を使います（画面のコードから読みやすいため）。`Link` は GitHub の API などで使われている書き方です。

### 6.4 絞り込みと並べ替え

- 絞り込みの値は、選べるものを決めます（`status` は `todo`・`doing`・`done`）
- 並べ替えは `sort=-dueDate` のように、項目の名前と向き（`-` で逆順）にして、**選べる項目を決めた表の中からだけ**選ばせます。客が送った文字を SQL の `ORDER BY` にそのまま入れると、SQL インジェクション（第6部 第31章）になります
- 知らない名前のクエリ（打ち間違いの `?stauts=todo`）は、黙って無視せずに 400 にします。無視すると、使う人は「絞り込みが効かない」と悩みます

## 7. ETag と If-Match（同時の書き換え）

### 7.1 後から書いた人が勝つ問題

A さんと B さんが、同じタスクを画面で開いたとします。A さんが題名を変えて保存し、その後に B さんが（A さんの変更を知らずに）締め切りを変えて保存すると、B さんの画面が持っていた古い題名で、A さんの変更が消えることがあります。第4部 第15章で見た「同時に書き直すと片方が消える」と同じ問題です。

### 7.2 楽観的ロック

HTTP には、これを見つける仕組みがあります。

1. GET の応答に、今の版を表す `ETag` を付ける（第2部 第7章）
2. 変えるときは、見ていた版を `If-Match` に入れて送ってもらう
3. サーバは、今の版と `If-Match` が違えば 412 を返し、変えない

```http
GET /api/tasks/1                           → 200, ETag: "1"
PATCH /api/tasks/1, If-Match: "1"          → 200, ETag: "2"（A さん）
PATCH /api/tasks/1, If-Match: "1"          → 412（B さん。誰かが先に変えた）
PATCH /api/tasks/1（If-Match なし）         → 428（どの版を見たのか、送ってほしい）
```

「ぶつかることは少ないので、先にロックせず、ぶつかったときに断る」ので、**楽観的ロック**と呼びます。B さんの画面は、412 を受け取ったら読み直して、「他の人が先に変更しました」と知らせます。

```sh
$ node samples/etag-demo.mjs
$ curl -si http://127.0.0.1:9323/api/tasks/1 | grep -iE '^(etag|HTTP)'
```

### 7.3 ETag の作り方

- Express は、本文のハッシュから**弱い ETag**（`W/"…"`）を自動で付けます。キャッシュの確かめ（`If-None-Match` と 304）には使えますが、`If-Match` には強い ETag が要ります（RFC 9110 13.1.1）
- この教材では、タスクに `version`（変えるたびに 1 増える数）を持たせ、`"3"` のような強い ETag を自分で作ります。`app.set('etag', false)` で自動の ETag を止めます
- データベースでは、`UPDATE tasks SET …, version = version + 1 WHERE id = $1 AND version = $2` のように、「確かめて変える」を1つの SQL で書きます（第6部 第30章）。確かめてから変えるまでの間に、別の人が変えることを防ぐためです

### 7.4 If-None-Match と 304

`If-None-Match` に ETag を入れた GET は、変わっていなければ 304（本文なし）になります。画面が「前に読んだものから変わったか」を安く確かめられます。

`If-Match` と `If-None-Match` を、仕様どおりに（ETag の並び、`*`、強い比べ方と弱い比べ方、確かめる順番）書くのが練習問題6です。

## 8. 冪等キー（POST の送り直し）

### 8.1 送り直すと二重にできる

スマホの電波が悪いところで「作る」を押すと、リクエストはサーバに届いて、タスクができたのに、応答が届かないことがあります。画面からは、成功したのか失敗したのか分かりません。もう一度送ると、2つできます。POST は冪等ではないので、HTTP のクライアントも勝手には送り直しません。

### 8.2 Idempotency-Key

これを防ぐために、画面は「作る」ボタンを押したときに乱数のキーを作り、`Idempotency-Key` ヘッダに入れて送ります。送り直すときは、同じキーを使います。

```http
POST /api/tasks
Idempotency-Key: 5f0c2c1e-8a8b-4c1e-9a77-3e0b1a2f6d10
Content-Type: application/json

{ "title": "牛乳" }
```

サーバは、キーごとに「1回目の応答」を覚えておきます。

| 来たもの | 返すもの |
| --- | --- |
| 初めてのキー | ふつうに作り、応答を覚える |
| 覚えているキー、同じ中身 | 作らずに、覚えている応答をもう一度返す（`Idempotent-Replayed: true`） |
| 覚えているキー、別の中身 | 422（キーの取り違え） |
| 1回目をまだ処理中 | 409 |

- 「同じ中身か」は、メソッド・URL・ボディをまとめたハッシュ（SHA-256）で比べます
- サーバの失敗（500）や、入力の間違い（422）は覚えません。送り直して、やり直せるようにするためです
- 覚えておく期間を決めます（24 時間など）。本物は、データベースに、期限つきで置きます（第6部 第30章）。Stripe などの決済の API が、この方法を使っています
- `Idempotency-Key` ヘッダは、IETF で標準にするための案が話し合われています

```sh
$ node samples/idempotency-demo.mjs
```

第12部 第64章のバックグラウンドジョブでも、「二重に実行されても困らない作り方」として、同じ考え方を使います。

## 9. バージョンと API の説明書

### 9.1 壊さずに変える

一度公開した API を使っている画面やサーバがあると、形を変えるだけで、それらが壊れます。

- **壊さない変更**: 項目を足す、選べる値を足す（ただし、使う側が「知らない値」に備えているとき）、新しいエンドポイントを足す
- **壊す変更**: 項目の名前を変える、消す、型を変える、ステータスを変える、必須の入力を足す

壊す変更が要るときは、新しい版を作り、古い版をしばらく残します。URL に版を入れる（`/v1/tasks`）のが、いちばん分かりやすい方法です。ほかに、ヘッダ（`Accept: application/vnd.example.v2+json`）で選ぶ方法もあります。この教材の成果物は、画面と API を自分で両方作るので、版は入れずに進めます。

### 9.2 OpenAPI

API の説明書を、決まった形（YAML か JSON）で書く方法に **OpenAPI** があります。

```yaml
paths:
  /tasks/{id}:
    get:
      parameters:
        - { name: id, in: path, required: true, schema: { type: integer, minimum: 1 } }
      responses:
        '200': { description: タスク, content: { application/json: { schema: { $ref: '#/components/schemas/Task' } } } }
        '404': { description: 無い, content: { application/problem+json: { schema: { $ref: '#/components/schemas/Problem' } } } }
```

OpenAPI の説明書から、画面を作る人が試せるページ（Swagger UI など）を作ったり、呼ぶ側のコードや型を作ったりできます。zod のスキーマから OpenAPI を作るライブラリもあります。この章では書き方を見るだけにして、第28章で、スキーマから説明書を作るフレームワーク（Fastify など）と比べます。

## 10. 第4部の部品・Flask との対応

| やりたいこと | Flask | 第4部 | この章（Express） |
| --- | --- | --- | --- |
| ステータスを決める | `return body, 201` | `send(res, 201, …)` | `res.status(201).json(…)` |
| 作った場所を知らせる | `return body, 201, {'Location': url}` | `res.setHeader('Location', …)` | `res.location(url)` |
| エラーを投げて止める | `abort(404)` | `throw new HttpError(404)` | `throw new HttpProblem(404, …)` |
| エラーの形をそろえる | `@app.errorhandler(HTTPException)` | `createApp` の `catch` | `problemHandler()`（problem+json） |
| 入力の確かめ | `if` か pydantic・marshmallow | `if` の列（第20章） | zod の `safeParse` |
| クエリを読む | `request.args.get('limit', type=int)` | `URLSearchParams` | `req.query` を zod で確かめる |
| ページ分け | Flask-SQLAlchemy の `paginate()`（オフセット） | — | カーソル（`paginate` と署名） |
| ETag | `response.set_etag()`、`make_conditional()` | 第19章の静的ファイル | 自分で `version` から作る |

`request.args.get('limit', type=int)` は、`int()` で変えられなければ、黙って既定の値（`None`）を返します。間違いを知らせないので、`z.coerce.number()` と同じ注意が要ります。

## まとめ

- URL は「もの」（複数形の名詞と id）、することはメソッドで表す。入れ子は1段まで。絞り込み・並べ替え・ページはクエリ。
- GET は安全、PUT・DELETE は冪等。この約束を、ブラウザやプロキシが前提にしている。GET で何かを変えない。
- 成功も失敗も、ステータスで伝える。作ったら 201 と `Location`、本文が無ければ 204、URL の間違いは 400、中身の間違いは 422。
- エラーは `application/problem+json`（RFC 9457）にそろえ、最後のエラーハンドラ1つで作る。500 では中の文を見せない。
- 入力は zod で確かめ、確かめた後の値（`r.data`）だけを使う。クエリは文字列で届くので、形を決めてから数にする。知らない名前は断る。
- 一覧には上限を決める。カーソルでページを分けると、読んでいる間に増えてもずれない。並べ方は id で1通りに決め、カーソルには署名を付ける。
- 同時の書き換えは、強い ETag と `If-Match` で見つけ、412 で断る。条件が無ければ 428。
- POST の送り直しには `Idempotency-Key`。1回目の応答を覚えて、同じものを返す。

## 練習問題

[exercises/README.md](exercises/README.md) に6問あります。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- RFC 9110「HTTP Semantics」（メソッドの性質 9.2、条件つきリクエスト 13、ステータス 15）: https://www.rfc-editor.org/rfc/rfc9110
- RFC 9457「Problem Details for HTTP APIs」: https://www.rfc-editor.org/rfc/rfc9457
- RFC 6901「JSON Pointer」: https://www.rfc-editor.org/rfc/rfc6901
- RFC 6585（428・429）: https://www.rfc-editor.org/rfc/rfc6585
- RFC 8288「Web Linking」（Link ヘッダ）: https://www.rfc-editor.org/rfc/rfc8288
- RFC 7396「JSON Merge Patch」: https://www.rfc-editor.org/rfc/rfc7396
- IETF「The Idempotency-Key HTTP Header Field」（案）: https://datatracker.ietf.org/doc/draft-ietf-httpapi-idempotency-key-header/
- zod 公式: https://zod.dev/
- OpenAPI Specification: https://spec.openapis.org/oas/latest.html
- MDN「HTTP レスポンスステータスコード」: https://developer.mozilla.org/ja/docs/Web/HTTP/Status
- MDN「If-Match」: https://developer.mozilla.org/ja/docs/Web/HTTP/Headers/If-Match
- Stripe「Idempotent requests」: https://docs.stripe.com/api/idempotent_requests
- Flask「Handling Application Errors」: https://flask.palletsprojects.com/en/stable/errorhandling/

前の章: [第24章 ミドルウェア](../ch24-middleware/README.md) ／ 次の章: [第26章 アプリケーションの構成](../ch26-app-structure/README.md)
