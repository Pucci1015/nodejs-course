# 第4部の成果物 フレームワークなしの簡易掲示板

第4部のまとめとして、**フレームワークを使わずに、`node:http` だけで掲示板を作ります**。
利用者は名前とパスワードで登録・ログインし、スレッドを立て、返信し、自分の投稿を削除できます。データは JSON のファイルに保存するので、サーバを起動し直しても消えません。

第17〜22章で作った部品を、すべて使います。`createApp` とグレースフルシャットダウン（第17章）、Router（第18章）、静的ファイル（第19章）、上限付きのフォームの読み取り（第20章）、`html` タグとページ分け（第21章）、Cookie とセッション（第22章）です。外部のパッケージは使いません（`dependencies` は空）。

第5部の Express の章では、ここで自分で作った部品が Express のどこにあたるのかを、この掲示板のコードと比べながら確かめます。第6部でデータベースを学ぶと、JSON のファイルの代わりにデータベースを使えるようになります。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 10〜15時間 |
| 前提 | 第17〜22章（特に各章の練習問題の模範解答）、第3部 第15章 練習問題2（`writeFileAtomic`） |
| 作るもの | `~/dev/bbs` の Git リポジトリ。`npm start` で `http://127.0.0.1:9230/` に掲示板が立ち上がるもの |
| 確かめ方 | 完成例のテスト（[solutions/test/bbs.test.mjs](solutions/test/bbs.test.mjs)）を、自分の掲示板に対して動かす。ブラウザでも使ってみる |

| フォルダ | 中身 |
| --- | --- |
| [solutions/](solutions/) | 完成例（`bbs` パッケージ）。外から HTTP で確かめるテスト付き |

---

## 1. 準備

作業は `~/dev/bbs` で行い、Git で管理します（教材のフォルダは OneDrive の中なので、Git のリポジトリやデータのファイルを作らないようにします）。

```sh
$ mkdir -p ~/dev/bbs && cd ~/dev/bbs
$ git init
$ npm init -y                     # "type": "commonjs" になるので、"module" に直す
$ mise use node@24                # このフォルダの Node.js を固定する（第1部 第2章6.3節）
$ mkdir -p src/lib public test
$ printf 'node_modules/\ndata/\n' > .gitignore   # データのファイルはコミットしない
```

`package.json` は、少なくとも次のようにします。

```json
{
  "name": "bbs",
  "version": "0.1.0",
  "private": true,
  "type": "module",
  "scripts": {
    "start": "node src/server.mjs",
    "test": "node --test \"test/*.test.mjs\""
  },
  "engines": { "node": ">=24" }
}
```

> `mise use` で入る Node.js のバージョンは、執筆時点の LTS の 24 系です。新しい LTS が出ていたら、それに合わせてかまいません（必ず https://nodejs.org/ で確認）。

### 1.1 自分の部品を持ってくる

第17〜22章の練習問題で作った関数を、`src/lib/` にコピーします。自分の解答でも、教材の模範解答でもかまいません。コピーしたら、ファイルの先頭の `import` のパスを、`src/lib/` の中を指すように直します（例: `'../../ch17-minimal-server/solutions/app.mjs'` → `'./http-app.mjs'`）。

| コピーするもの | 元の場所 | 完成例での名前 |
| --- | --- | --- |
| `createApp`・`HttpError` | 第17章 `solutions/app.mjs` | `src/lib/http-app.mjs` |
| `sendHtml`・`sendJson`・`redirect` | 第17章 `solutions/send.mjs` | `src/lib/send.mjs` |
| `Router` と、それが使う `pattern.mjs` | 第18章 `solutions/` | `src/lib/router.mjs`・`pattern.mjs` |
| `serveStatic` と、それが使うもの | 第19章 `solutions/static.mjs`・`range.mjs`・`safe-path.mjs`、`samples/mime.mjs` | 同じ名前 |
| `readForm` | 第20章 `solutions/body.mjs` | `src/lib/body.mjs` |
| `html`・`raw` | 第21章 `samples/mini-html.mjs` | `src/lib/mini-html.mjs` |
| `attrs`・`queryString` | 第21章 `solutions/html-helpers.mjs` | `src/lib/html-helpers.mjs` |
| `paginate`・`pagination` | 第21章 `solutions/views.mjs` から取り出す | `src/lib/pagination.mjs` |
| `parseCookies`・`serializeCookie` | 第22章 `solutions/cookie.mjs` | `src/lib/cookie.mjs` |
| `SessionStore`・`withSession` | 第22章 `solutions/session.mjs` | `src/lib/session.mjs` |
| `writeFileAtomic` | 第3部の成果物 `project-memo-cli/solutions/src/atomic.mjs`（第15章 練習問題2） | `src/lib/atomic.mjs` |

```sh
$ N=~/Library/CloudStorage/OneDrive-個人用/program/nodejs/part04-raw-http-server
$ cp $N/ch17-minimal-server/solutions/app.mjs src/lib/http-app.mjs
$ cp $N/ch18-routing/solutions/{router,pattern}.mjs src/lib/
# …残りも同じように
```

## 2. 要件

### 2.1 画面と URL

| メソッドとパス | すること | 成功したとき |
| --- | --- | --- |
| `GET /` | スレッドの一覧。最後に書き込まれた順（新しいものが先）。20 件ずつ、`?page=2` でページを分ける。題名・立てた人・投稿の数・最後に書き込まれた時刻 | 200 |
| `GET /signup` | 登録のフォーム（`name`、`password`） | 200 |
| `POST /signup` | 登録し、そのままログインした状態にする | 303 → `/` |
| `GET /login` | ログインのフォーム（`name`、`password`） | 200 |
| `POST /login` | ログイン。違えば 303 → `/login` で、知らせを表示する | 303 → `/` |
| `POST /logout` | ログアウト | 303 → `/` |
| `GET /threads/new` | スレッドを立てるフォーム（`title`、`body`）。ログインしていなければ 303 → `/login` | 200 |
| `POST /threads` | スレッドと、その最初の投稿を作る | 303 → `/threads/:id` |
| `GET /threads/:id` | スレッドの投稿を、古い順に。ログインしていれば返信のフォーム（`body`） | 200 |
| `POST /threads/:id/posts` | 返信する | 303 → `/threads/:id#post-:postId` |
| `POST /posts/:id/delete` | 投稿を削除する。**自分の投稿だけ**（他の人のものは 403） | 303 → `/threads/:id` |
| `GET /api/threads` | スレッドの一覧の JSON（2.7節） | 200 |
| `GET /api/threads/:id` | 1つのスレッドの JSON | 200 |
| `GET /static/*` | `public/` の中のファイル（CSS） | 200 |

- 無いスレッド・投稿は 404。`/threads/abc` のように id が数でないときも 404
- ログインしていないのに書き込み（`POST /threads` など）をしようとしたら、303 → `/login`
- 投稿の要素には `id="post-投稿のid"` を付ける（返信の後の `#post-…` で、その投稿まで移動するため）

### 2.2 入力の決まり

| 項目 | 決まり | 違うとき |
| --- | --- | --- |
| 名前 | 英数字と `_` で 3〜20 文字。前後の空白は取る。他の人と同じ名前は不可 | 422 で、入力した値と説明を入れたフォーム |
| パスワード | 8〜100 文字 | 同上 |
| 題名 | 前後の空白を取って 1 文字以上、100 文字以下 | 同上 |
| 本文 | 空白だけは不可。2000 文字以下。改行は `\r\n` を `\n` にそろえて保存する | 同上 |
| フォームのボディ | 16KB まで | 413 |

文字の数は、`[...s].length`（絵文字も1文字）で数えます。

### 2.3 ログインとセッション（第22章）

- パスワードは、そのまま保存しない。salt 付きの scrypt のハッシュを保存する
- ログインの失敗の知らせは、名前が無いときも、パスワードが違うときも同じにする
- セッションの ID は推測できないもの。Cookie は `HttpOnly`・`SameSite=Lax`・`Path=/`
- 登録・ログインしたら、セッションの ID を作り直す。ログアウトでは、サーバからもセッションを消す
- **一覧やスレッドを見るだけの客には、セッションを作らない**（Cookie を送らない）。フォームを表示するとき（CSRF トークンが要るとき）に作る
- セッションはメモリに置いてよい（サーバを起動し直すと、全員ログアウトになる）

### 2.4 データの保存

- データは `DATA_DIR`（既定 `./data`）の中の JSON のファイルに保存する。ファイルの形は自由
- 書き換えたら、303 を返す**前に**ファイルに書き終える（303 の後にサーバが止まっても、書き込みが消えないように）
- 途中で落ちても壊れないように書く（`writeFileAtomic`）。2つのリクエストが同時に書いても、片方が消えないようにする（3.3節）
- 削除した投稿は、本文を消して「この投稿は削除されました」と表示する（投稿そのものは残す）

### 2.5 安全のための決まり

- 画面に出す値は、すべてエスケープする（第21章の `html` タグ）
- すべての POST のフォームに CSRF トークンを入れ、確かめる。違えば 403
- どのレスポンスにも、次のヘッダを付ける
  - `Content-Security-Policy: default-src 'self'; script-src 'none'; object-src 'none'; base-uri 'none'; form-action 'self'; frame-ancestors 'none'`（この掲示板は JavaScript を使わないので `script-src 'none'`）
  - `X-Content-Type-Options: nosniff`
  - `Referrer-Policy: same-origin`
- 人ごとに違うページ（ログインしているときの画面、`/api` 以外のセッションを使うページ）には `Cache-Control: no-store`

### 2.6 起動

```sh
$ npm start                              # http://127.0.0.1:9230/
$ PORT=9300 DATA_DIR=/tmp/bbs npm start  # ポートとデータの場所を変える
```

| 環境変数 | 既定 | 意味 |
| --- | --- | --- |
| `PORT` | `9230` | 待つポート（`127.0.0.1` で待つ） |
| `DATA_DIR` | `./data` | データのフォルダ。無ければ作る |
| `SESSION_TTL_MS` | `1800000`（30 分） | セッションの期限（最後に使ってから） |

`Ctrl+C`（SIGINT）や SIGTERM では、受け付け中のリクエストを終えてから止まる（第17章 7節）。

### 2.7 JSON の API（読むだけ）

```
GET /api/threads
[{ "id": 1, "title": "…", "author": "ryota", "postCount": 3, "createdAt": "2026-…Z", "updatedAt": "2026-…Z" }, …]

GET /api/threads/1
{ "id": 1, "title": "…", "author": "ryota", "createdAt": "…", "updatedAt": "…",
  "posts": [{ "id": 1, "author": "ryota", "body": "…", "deleted": false, "createdAt": "…" }, …] }
```

- 削除した投稿の `body` は `null`
- パスワードのハッシュや salt を、API に出さない

## 3. 作り方のヒント

### 3.1 ファイルの分け方

完成例は、次のように分けています。

| ファイル | 中身 |
| --- | --- |
| `src/server.mjs` | 起動とシャットダウン。環境変数を読み、`Store`・`SessionStore`・アプリを作って `listen` する |
| `src/app.mjs` | `createBbsApp({ store, sessions, publicDir })`。Router に URL ごとの処理を書く。CSRF・ログインの確かめ・エラーの画面 |
| `src/store.mjs` | `Store`。JSON のファイルの読み書きと、ユーザー・スレッド・投稿の操作 |
| `src/views.mjs` | 画面（`layout`・`threadListPage`・`threadPage` など）。`html` タグで書く |
| `src/auth.mjs` | `hashPassword`・`verifyPassword` |
| `src/validate.mjs` | 入力の確かめ |
| `src/lib/` | 第17〜22章の部品（1.1節） |
| `public/style.css` | 見た目 |

`app.mjs` が `store` と `sessions` を引数で受け取るようにしておくと、テストで一時フォルダのデータを使ったり、第6部でデータベースの `Store` に取り替えたりしやすくなります。

### 3.2 進める順番

1. `server.mjs` と `app.mjs` で、`GET /` が「まだスレッドはありません」を返すところまで。セキュリティのヘッダも、ここで付ける
2. `store.mjs`。最初はファイルに書かず、メモリの配列だけで、一覧・スレッド・投稿の操作を作る
3. 登録・ログイン・ログアウト（`withSession`、`auth.mjs`、CSRF）
4. スレッドを立てる・返信する・削除する。入力の間違いの 422
5. `store.mjs` をファイルに保存するようにする（3.3節）
6. ページ分け、JSON の API、CSS
7. 完成例のテストを動かして、通らないところを直す

### 3.3 ファイルへの書き込みを、1つずつ順に

2つのリクエストがほとんど同時に投稿すると、書き込みが2つ同時に始まります。それぞれが「その時点のデータ全体」を書くので、後から終わったほうが、先に終わったほうを上書きします。書いた中身が古いほうだと、投稿が1つ消えます。

完成例は、書き込みを Promise の鎖でつないで、前の書き込みが終わってから次を始めるようにしています。そのうえで、データを変える処理（配列に足す、id を進める）と、書く中身を文字にする処理を、`await` を挟まずに続けて行います。Node.js は、`await` の無いところでは他のリクエストの処理に切り替わらない（第3部 第13章）ので、2つのリクエストの変更が混ざりません。

```js
#queue = Promise.resolve();
#save() {
  const json = JSON.stringify(this.#data);        // 呼ばれた時点の中身
  const job = this.#queue.then(() => writeFileAtomic(this.#file, json));
  this.#queue = job.catch(() => {});              // 失敗しても、次の書き込みは続ける
  return job;                                     // 呼んだ側は await して、書けたか確かめる
}
```

「名前がまだ使われていないか確かめる → ユーザーを足す」の間に `await` を挟むと、同じ名前のユーザーが2人できることがあります。確かめと追加は、`await` を挟まずに続けて行います（データベースでは「一意制約」で守ります。第6部 第30章）。

### 3.4 エラーの画面

第17章の `createApp` は、`HttpError` を JSON で返します。掲示板の画面では、HTML のエラーの画面にしたいところです。完成例は、Router の処理を `try` で包み、`HttpError` なら HTML の画面を返し、それ以外（本当のバグ）は `createApp` に任せています。`/api/` は JSON のままにします。401（ログインしていない）は、エラーの画面ではなく、303 で `/login` へ送ります。

### 3.5 認証と認可

「ログインしているか」（**認証**、だれなのか）と、「この人がこの操作をしてよいか」（**認可**）は別のものです。投稿の削除では、ログインしているかを確かめた後に、「投稿を書いた人と、ログインしている人が同じか」を確かめます。認可の確かめを忘れると、ログインさえしていれば、他の人の投稿を消せてしまいます。第10部 第51章でくわしく扱います。

## 4. 確かめ方

完成例のテストをコピーして、自分の掲示板に対して動かします。テストは、サーバを別のプロセスで起動し（`127.0.0.1:9231`、データは一時フォルダ）、HTTP だけで確かめます。中の作りが完成例と違っていても、2節の要件を満たしていれば通ります。

```sh
$ cp $N/project-bbs/solutions/test/bbs.test.mjs test/
$ npm test
```

完成例は 17 個のテストがすべて通ります。テストが確かめていないこと（見た目、使いやすさ、同時に書き込んだときに消えないか）は、ブラウザで使って確かめてください。2つのブラウザ（または通常のウィンドウとシークレットウィンドウ）で、別の人として登録して、返信し合ってみると良いでしょう。

## 5. もっとやるなら

- 投稿を編集できるようにする（自分の投稿だけ。編集した時刻も表示する）
- 題名で検索する（`?q=`。ページのリンクに `q` を残す。第21章 練習問題3）
- 同じ人が短い時間にたくさん書き込めないようにする（1分に5件まで、など）
- セッションをファイルに保存して、サーバを起動し直してもログインしたままにする
- 第21章 練習問題4のテンプレートエンジンで、画面を `views/*.html` のファイルに分ける

## 6. Flask で作るなら

Flask なら、`@app.route` と `render_template`、`session`、`flash`、Flask-WTF（CSRF）、`werkzeug.security`（パスワード）で、同じものが短く書けます。第4部で自分で作ったのは、まさにその「短く書ける」部分の中身です。

| この成果物 | Flask |
| --- | --- |
| `Router`（第18章） | `@app.route('/threads/<int:id>')` |
| `serveStatic`（第19章） | `static/` フォルダ |
| `readForm`（第20章） | `request.form` |
| `html` タグ（第21章） | Jinja2 のテンプレート |
| `withSession`（第22章） | `session` |
| `checkCsrf` | Flask-WTF |
| `hashPassword` | `generate_password_hash` |
| `Store` | SQLite と SQLAlchemy など（第6部） |

---

前の章: [第22章 Cookie とセッションを自作する](../ch22-cookie-session/README.md) ／ 第4部の目次: [../README.md](../README.md)
