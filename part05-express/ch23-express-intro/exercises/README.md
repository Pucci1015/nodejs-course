# 第23章 練習問題

本文（[../README.md](../README.md)）を読んでから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。

| 問題 | テーマ | 使うファイル | 本文の節 | ポート |
| --- | --- | --- | --- | --- |
| 1 | Express が返すものを予想する | [predict-express.mjs](predict-express.mjs) | 3〜5, 8 | 空いている番号 |
| 2 | タスクの REST API を Express で書く | [tasks-app.mjs](tasks-app.mjs)、[tasks-app.test.mjs](tasks-app.test.mjs)、[tasks-store.mjs](tasks-store.mjs) | 3〜5, 8 | 空いている番号 |
| 3 | Express に「405 と Allow」を足す `resource` | [resource.mjs](resource.mjs)、[resource.test.mjs](resource.test.mjs) | 3.3, 3.4 | 空いている番号 |
| 4 | メモのアプリのバグを直す | [buggy-notes.mjs](buggy-notes.mjs)、[check-notes.sh](check-notes.sh)、[public/](public/) | 3〜6, 8 | 9309 |
| 5 | 第21章のテンプレートエンジンをビューエンジンにする | [engine.mjs](engine.mjs)、[engine.test.mjs](engine.test.mjs) | 7 | 空いている番号 |
| 6 | 第18章の Router と Express を比べる | [compare-routers.mjs](compare-routers.mjs) | 3, 9 | 空いている番号 |

- どの問題も、`~/dev/part05/ch23-express-intro/exercises` の中で動かします（第5部の README の「準備」）
- 問題2・3・5は `node --test ○○.test.mjs` ですべてのテストが通れば完成です。最初は、問題2が 15 個中 13 個、問題3が 7 個中 6 個、問題5が 10 個中 6 個失敗します
- 問題4は `bash check-notes.sh` で確かめます。最初は 24 個中 19 個失敗します
- 模範解答は `MODULE=../solutions/tasks-app.mjs node --test tasks-app.test.mjs`、`bash check-notes.sh ../solutions/notes.mjs` のように確かめられます

---

## 問題1 Express が返すものを予想する

[predict-express.mjs](predict-express.mjs) には、小さなアプリと 14 個のリクエストがあります。**実行する前に**、それぞれの「ステータスコード」と「本文」を予想して書き出してから、`node predict-express.mjs` で確かめてください。

特に、次のものは理由を説明してください。

- 2番: `/items/new` のルートを書いたのに、なぜそれが選ばれないのか。どう直すか
- 3番と4番: 第18章の Router なら、それぞれ何を返したか（308 と 405）。Express が違うのは、良いことか悪いことか
- 8番: 本文は JSON の形なのに、`got` が `null` になるのはなぜか。API を使う側からすると、何が困るか
- 10番: `res.send(201)` で何が起きたか。本当は何と書きたかったのか
- 12番: `async` 関数の中で `throw` したのに、サーバが落ちずに 409 になったのは誰のおかげか。Express 4 だったらどうなったか

## 問題2 タスクの REST API を Express で書く

[tasks-app.mjs](tasks-app.mjs) の `createTasksApp({ store })` に、次の API を作ってください。データは引数の `store`（[tasks-store.mjs](tasks-store.mjs) の `createTaskStore()` が作るもの）に保存します。アプリの中で `createTaskStore()` を呼ばないでください（テストのたびに、新しい `store` を渡せるようにするため。第26章で「依存を外から渡す」理由として詳しく扱います）。

| リクエスト | 成功 | 失敗 |
| --- | --- | --- |
| `GET /api/tasks` | 200 と配列。`?done=true`・`?done=false` で絞り込む | `done` がそれ以外（空・2つ・`yes` など）なら 400 |
| `GET /api/tasks/:id` | 200 とタスク | 無ければ 404。`id` が正の整数の形（`1`〜、先頭に `0` なし）でなければ 400 |
| `POST /api/tasks` | 201、`Location: /api/tasks/新しい id`、作ったタスク。`title` の前後の空白は取る | Content-Type が JSON でなければ 415。JSON が壊れていれば 400。`title` が無い・文字列でない・空白だけ・101 文字以上、ボディがオブジェクトでないなら 422 |
| `PATCH /api/tasks/:id` | 200 と変えた後のタスク。`title`・`done` のどちらか、または両方 | 無ければ 404。`done` が真偽値でない、`title` が正しくない、知らない項目があるなら 422（何も変えない） |
| `DELETE /api/tasks/:id` | 204（本文なし） | 無ければ 404 |
| それ以外 | — | 404 |

- エラーはすべて JSON の `{ "error": 種類, "message": 説明 }` で返す。種類は `bad_request`（400）、`not_found`（404）、`unsupported_media_type`（415）、`validation`（422）、`payload_too_large`（413）、`internal`（500）
- ボディは 100kb まで（`express.json()` の既定）。超えたら 413
- ルートの中で予想していない例外が起きたら 500。本文には例外の文を入れず、`console.error` に書く
- `X-Powered-By` を付けない

```sh
$ node --test tasks-app.test.mjs
```

ヒント: エラーは、ルートの中で `throw` して、最後のエラーハンドラ1か所で JSON にすると、書き忘れが減ります。

## 問題3 Express に「405 と Allow」を足す

Express は、パスにあてはまるルートがあってもメソッドが違えば 404 を返します（本文 3.3 節）。第18章の Router のように 405 を返す部品 `resource(app, path, handlers)` を、[resource.mjs](resource.mjs) に作ってください。

```js
resource(app, '/api/tasks/:id', {
  get: showTask,
  patch: [checkOwner, updateTask], // 配列なら、順に動くミドルウェアとハンドラ
  delete: deleteTask,
});
```

- `handlers` の名前は `get`・`post`・`put`・`patch`・`delete` だけ。知らない名前（`gett` など）、関数でないもの、1つも無いときは、**登録の時点で** `TypeError`
- 登録していないメソッドには、405 と JSON `{ "error": "method_not_allowed", "message": … }`、`Allow` ヘッダ
- `Allow` の順番は `GET, HEAD, POST, PUT, PATCH, DELETE, OPTIONS`。`get` があれば `HEAD` も入れる。`OPTIONS` は必ず入れる
- `OPTIONS` には 204 と `Allow`（本文なし）
- `HEAD` は `get` のハンドラで答える。`get` が無ければ 405
- `app` の代わりに `express.Router()` を渡しても動く

```sh
$ node --test resource.test.mjs
```

ヒント: `app.route(path)` が返すものには `.all(handler)` があります。同じパスの、ほかのハンドラが答えなかったリクエストが届きます。

## 問題4 メモのアプリのバグを直す

[buggy-notes.mjs](buggy-notes.mjs) は、メモの API です。動いているように見えますが、確認スクリプトでいくつも失敗します。バグを探して直し、すべての確認を通してください。

| リクエスト | 仕様 |
| --- | --- |
| `GET /notes` | 200 と配列。`?tag=○○` で、タグ（大文字・小文字を区別しない）で絞り込む。`tag` が空や2つ以上なら 400 |
| `GET /notes/search?q=○○` | 200 と、題名か本文に `q` を含むメモの配列 |
| `GET /notes/:id` | 200 とメモ（読まれた回数 `views` を1増やす）。無ければ 404。`id` が正の整数の形でなければ 400 |
| `POST /notes` | JSON の `{ title, body? }`。201、`Location`、作ったメモ。Content-Type が JSON でなければ 415、壊れていれば 400、`title` が無ければ 422 |
| `POST /notes/form` | フォームの `title=○○`。作ってから `/notes` へ 303 |
| `/style.css` | `public/style.css` を返す。それ以外のファイル（サーバのソースなど）は返さない |

- エラーはすべて JSON で返し、スタックトレースを外に出さない。`X-Powered-By` を付けない

```sh
$ bash check-notes.sh
[OK] 1. GET /notes は 2件
[OK] 2. ?tag=NODE（大文字）でも 1件
[NG] 3. ?tag=a&tag=b（2つ）は 400
     期待: 400
     実際: 500
…
19 個の確認が失敗しました
```

バグは10か所あります（1つのバグで、いくつかの確認が失敗します）。直すたびに確認スクリプトを動かし、どの直しでどの確認が通ったかを書き留めておくと、解答と比べやすくなります。

## 問題5 第21章のテンプレートエンジンをビューエンジンにする

本文 7節の [../samples/view-engine-demo.mjs](../samples/view-engine-demo.mjs) は、リクエストのたびにファイルを読んで `compile` していました。これを、[engine.mjs](engine.mjs) の `createEngine({ readFile })` が返すビューエンジンとして、次のことができるようにしてください。

- `app.set('view cache', true)` のとき（Express は `NODE_ENV=production` で自動的にそうする）、同じファイルは1回だけ読んで `compile` し、次からは覚えたものを使う。同時に3つのリクエストが来ても、読むのは1回
- `view cache` が無効なら、毎回読む（開発中は、テンプレートを書き換えるとすぐ反映されてほしい）
- Express が値に混ぜてくる `settings`（`app.set` の値すべて）・`_locals`・`cache` は、テンプレートから見えないようにする
- 値の `layout` に `'base.html'` のようなファイル名があれば、ページを作った後、それを `body` としてレイアウトに入れる。レイアウトは `{{ body | raw }}` と書いて入れる。レイアウトは、テンプレートと同じフォルダの中のファイルだけ（外を指したらエラー）
- `compile` の書き方の誤り（`TemplateError`）は、メッセージの先頭にファイル名を付けて、`callback(err)` で Express に渡す。誤りのあるファイルはキャッシュに残さない（直せば、次のリクエストから使える）
- `readFile` は、テストで数えるために差し替えられるようにしてある。必ずこれを使って読む

```sh
$ node --test engine.test.mjs
```

考えてみてください: `settings` を見せると、どんな値が HTML に出てしまう可能性があるか（`app.set` で何を入れることがあるか）。

## 問題6 第18章の Router と Express を比べる

[compare-routers.mjs](compare-routers.mjs) は、同じルートを第18章の Router と Express に登録し、同じ 12 個のリクエストを送って結果を並べます。

```sh
$ node compare-routers.mjs
$ STRICT=1 node compare-routers.mjs
```

1. `*`（ステータスが違う）と `~`（同じステータスで、選ばれたルートが違う）の付いた行について、なぜ違うのかを、本文の節を参照しながら説明してください
2. `GET /tasks/me` は、どちらが「正しい」ですか。Express で `me` を選ばせるには、どう書き換えますか。第18章の Router で、登録の順番を変えたら結果は変わりますか
3. `STRICT=1` で、変わった行と変わらない行を確かめてください。API を作るなら、どちらの設定にしますか。理由も書いてください（ブラウザで開く HTML のページなら、どうですか）
4. Express の既定の 404・400 は HTML です。API を作るときに、それで困ることを2つ挙げてください
