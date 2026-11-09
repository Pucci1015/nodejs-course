# 第10章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
作るファイルは `~/dev/ch10/` に置き、コマンドもそこで実行します（本文の「読み方」でコピーした `samples/` と `exercises/` を使います）。ブラウザは Chrome を使い、DevTools（`⌘ + ⌥ + I`）を開いて確かめます。

| 問題 | 種類 | テーマ | 本文の節 |
| --- | --- | --- | --- |
| 1 | 基本 | MPA のメモに削除を足す | 2, 6.1 |
| 2 | 基本 | MPA のメモで、空の入力をエラーにする | 2, 7.2 |
| 3 | 基本 | SPA のメモに削除を足す | 3, 5 |
| 4 | 基本 | MPA と SPA を DevTools で比べる（調べる問題） | 2〜3, 8 |
| 5 | 応用 | REST の API を設計する（考える問題） | 5, 6 |
| 6 | 応用 | 問題のある MPA を直す | 2, 6, 7 |
| 7 | 応用 | Flask のアプリを HTTP の言葉で説明し直す（調べる問題） | 9 |
| 8 | 発展 | POST を冪等キーで安全に送り直せるようにする | 6.2 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

---

## 基本

### 問題1 MPA のメモに削除を足す

本文で書いた `mini-mpa.mjs` をコピーして `mini-mpa-v2.mjs` を作り、メモを削除できるようにします（問題2も、このファイルに続けて書きます）。

```sh
$ cp mini-mpa.mjs mini-mpa-v2.mjs
```

1. 一覧の各メモの後ろに、削除のボタンを付ける。ボタンは**リンクではなく、POST のフォーム**にする（本文6.1節。GET で消せると、先読みやクローラで消えてしまう）。メモの番号は 1 から数える。

   ```html
   <li>牛乳を買う
     <form method="post" action="/memos/1/delete" style="display: inline"><button>削除</button></form>
   </li>
   ```

2. `POST /memos/番号/delete` を受け取ったら、その番号のメモを消して、`303` で `/` に戻す（PRG）。
3. 番号が無い・数でない（`/memos/9/delete`、`/memos/abc/delete`）ときは `404` を返す。

確かめ方（ターミナル2で）:

```sh
$ curl -si -X POST http://localhost:8505/memos/1/delete | head -2
HTTP/1.1 303 See Other
Location: /
$ curl -si -X POST http://localhost:8505/memos/9/delete | head -1
HTTP/1.1 404 Not Found
```

`-X POST` は「メソッドを POST にする」、`| head -2` は「最初の2行だけを表示する」という意味です。

ヒント:
- 番号が要るので、`for (const memo of memos)` ではなく、`for (let i = 0; i < memos.length; i++)` で回します。番号は `i + 1` です。
- `req.url.split('/')` は、`'/memos/2/delete'` を `['', 'memos', '2', 'delete']` に分けます。`parts.length === 4`、`parts[1] === 'memos'`、`parts[3] === 'delete'` で見分けます。
- `Number('2')` は `2`、`Number('abc')` は `NaN` です。`Number.isInteger(n)` は、`n` が整数のときだけ `true` になります（第7章 練習問題12）。
- `配列.splice(位置, 1)` は、その位置の要素を1つ取り除きます（第9章 練習問題7 の `api-server.mjs` でも使っていました）。番号は1から、配列の位置は0から数えるので、1を引きます。

### 問題2 MPA のメモで、空の入力をエラーにする

`mini-mpa-v2.mjs` で、何も入れずに「追加」を押すと、空のメモが増えてしまいます。curl で `text` を付けずに送ると、メモに `null` が入り、次に一覧を表示しようとしたときにサーバが止まります（`escapeHtml` の中で `null.replaceAll` になるため）。

```sh
$ curl -si -d 'x=1' http://localhost:8505/memos     # 303 が返る
$ curl -s http://localhost:8505/                     # ここでサーバが止まる
```

1. `text` が無い（`null`）か、空白だけのときは、メモを増やさずに `422` を返す。
2. そのときの HTML には、一覧と一緒に、赤い文字で「メモを入力してください」と表示する。
3. 入力欄には、入力された値を戻す（`<input name="text" value="...">`）。値は `escapeHtml` を通す（`"` で属性から抜け出せないように）。

本文7.2節で見たとおり、入力に誤りがあったときはリダイレクトしません。

確かめ方:

```sh
$ curl -si -d 'text=' http://localhost:8505/memos | head -1
HTTP/1.1 422 Unprocessable Entity
$ curl -s -d 'text=   ' http://localhost:8505/memos | grep 'メモを入力'
<p style="color: red">メモを入力してください</p>
$ curl -si -d 'x=1' http://localhost:8505/memos | head -1   # 422 になり、サーバも止まらない
```

ヒント:
- `page()` に引数を2つ（エラーの文、入力欄に戻す値）付けて、`page('', '')` と `page('メモを入力してください', text)` のように呼び分けます。
- `文字列.trim()` は、前後の空白を取り除いた文字列を返します。
- `text || ''` は、`text` が `null` のときに `''` になります。

### 問題3 SPA のメモに削除を足す

本文で書いた `mini-spa.mjs` をコピーして `mini-spa-v2.mjs` を作ります。

```sh
$ cp mini-spa.mjs mini-spa-v2.mjs
```

1. サーバに `DELETE /api/memos/番号` を足す。消せたら `204 No Content`（ボディなし）、番号が無ければ `404` と JSON のエラーを返す（本文5.1節）。
2. ブラウザ側の `render()` で、各 `<li>` の後ろに「削除」のボタンを付け、押されたら `fetch` で `DELETE` を送ってから、`render()` で一覧を作り直す。

確かめ方:

```sh
$ curl -si -X DELETE http://localhost:8506/api/memos/1 | head -1
HTTP/1.1 204 No Content
$ curl -si -X DELETE http://localhost:8506/api/memos/9 | head -1
HTTP/1.1 404 Not Found
```

ブラウザでも、削除のボタンで消えること、Network タブに `DELETE /api/memos/1` と `GET /api/memos` が出ることを確かめます。

ヒント:
- ボタンは `document.createElement('button')` で作り、`button.textContent = '削除'`、`button.addEventListener('click', async () => { ... })`、`li.append(button)` とします。
- `fetch('/api/memos/' + 番号, { method: 'DELETE' })` で DELETE を送れます。
- `204` は `res.writeHead(204); res.end();` のように、ボディを付けずに返します。
- ブラウザで動く JavaScript は HTML の文字列の中にあるので、書き間違いはサーバではなく、ブラウザの DevTools の Console に表示されます。

### 問題4 MPA と SPA を DevTools で比べる（調べる問題）

ターミナルを2つ使って `node samples/todo-mpa.mjs` と `node samples/todo-spa.mjs` を起動し、Chrome で http://localhost:8500/ と http://localhost:8501/ を別のタブで開きます。それぞれ DevTools の Network タブを開き、「Preserve log」（ページを移っても記録を消さない）にチェックを入れてから、次のことを確かめてください。

1. 次の操作のときに送られるリクエスト（メソッド、パス、ステータス）を、MPA と SPA のそれぞれについて表に書き出す。
   - 最初の表示 / タスクの追加 / タスクの名前をクリック / 戻るボタン / `/tasks/2` を開いた状態で再読み込み
2. JavaScript を無効にして（本文8節の注）、両方を再読み込みし、何ができて何ができないかを確かめる。
3. SPA で http://localhost:8501/tasks/999 と http://localhost:8501/no/such/page を開き、ステータスコードと表示を確かめる。これがなぜ問題になるか（**ソフト 404**）を説明する。
4. SPA で、別のタブで同じページを開いてタスクを削除し、元のタブで何も操作しないまま見たときに、画面がどうなっているかを確かめる。MPA ではどうか。このずれが起きる理由を、「状態がどこにあるか」で説明する。

---

## 応用

### 問題5 REST の API を設計する（考える問題）

「プロジェクト」の中に「タスク」があり、タスクには「コメント」を付けられるアプリの API を、本文5節の慣習に沿って設計します。`~/dev/ch10/rest-design.md` に書いてください。

1. 次の操作に、メソッド・パス・成功したときのステータスを割り当てる。
   - プロジェクトの一覧 / プロジェクトを作る / プロジェクトの中のタスクの一覧 / プロジェクトにタスクを追加する / タスクを1件取る / タスクのタイトルだけを変える / タスクを削除する / タスクにコメントを付ける / タスクのコメントの一覧 / コメントを削除する / 完了したタスクだけの一覧 / タスクを別のプロジェクトに移す
2. 次の API の設計の問題を指摘し、直した設計を示す。

   | | 設計 |
   | --- | --- |
   | (a) | `GET /api/tasks/5/complete` で、タスクを完了にする |
   | (b) | `POST /api/getTasks` に `{"projectId": 3}` を送ると、一覧が返る |
   | (c) | 存在しないタスクを取ると、`200` で `{"error": "not found"}` が返る |
   | (d) | `POST /api/tasks` で作ると、`200` で `{"result": "ok"}` だけが返る |
   | (e) | `DELETE /api/tasks/5` を2回送ると、2回目は `500` になる |
   | (f) | `PUT /api/tasks/5` に `{"done": true}` だけを送ると、タイトルが消える |

3. (e) について、2回目の `DELETE` には何を返すのが良いか。「冪等」の定義（本文6.2節）と合わせて考える。

### 問題6 問題のある MPA を直す

[bad-mpa.mjs](bad-mpa.mjs)（8510番）は、ブラウザで普通に操作すると、ちゃんと動いているように見えます。しかし、設計と実装に**4つの問題**があります。

```sh
$ node exercises/bad-mpa.mjs     # → http://localhost:8510/
```

1. コードを読み、ブラウザと curl で試して、4つの問題を見つける。それぞれについて「どんな操作をすると、何が起きるか」を具体的に書く。
   - ヒント: 追加した後に再読み込み / 削除のリンク / タイトルに `<b>太字</b>` / 存在しない番号（`/tasks/999`）
2. コピーして `fixed-mpa.mjs` を作り、直す。確かめるスクリプト `check-mpa.sh` は、指定したファイルを 8519番で起動して12個の確認をし、終わったら止めます（直す前の `bad-mpa.mjs` では、9個が失敗します）。

   ```sh
   $ cp exercises/bad-mpa.mjs fixed-mpa.mjs
   $ bash exercises/check-mpa.sh fixed-mpa.mjs
   [OK] 1. 追加の POST に 303 と Location: / を返す
   ...
   すべて成功しました
   ```

   `bash ファイル名` は、シェルのスクリプトを実行するコマンドです。

3. 問題のうち1つは、放置すると**サーバ全体が止まります**。どの問題か、なぜ1つのリクエストの失敗でサーバ全体が止まるのかを説明する。その問題を直す以外に、「思わぬ例外が起きてもサーバ全体を止めない」ための守りを、もう一段入れる。

ヒント:
- 使えないメソッドには `405` と、使えるメソッドを並べた `Allow` ヘッダを返します（本文5.1節）。`GET /tasks` と `GET /tasks/番号/delete` が対象です。
- `try { ... } catch (err) { ... }` は、`try` の中で例外が起きたら `catch` の中を実行します（第5章5.4節）。`req.on('end', ...)` に渡した関数は、`createServer` に渡した関数が終わった**後で**呼ばれるので、外側の `try` では捕まえられません。

### 問題7 Flask のアプリを HTTP の言葉で説明し直す（調べる問題）

[flask-app.py](flask-app.py) は、ログイン・タスクの一覧・追加・削除・件数を返す API がある、よくある形の Flask のアプリです。**わざと、いくつかの問題を含めてあります。**

Python の仮想環境（このフォルダだけで使うパッケージの置き場所）を `~/dev/ch10/.venv` に作り、Flask を入れて動かします。

```sh
$ python3 -m venv .venv               # .venv というフォルダに仮想環境を作る
$ source .venv/bin/activate           # 仮想環境に入る（行の先頭に (.venv) と出る）
(.venv) $ pip install flask           # Flask を入れる（仮想環境の中だけに入る）
(.venv) $ python exercises/flask-app.py
 * Serving Flask app 'flask-app'
 * Debug mode: on
WARNING: This is a development server. Do not use it in a production deployment. Use a production WSGI server instead.
 * Running on http://127.0.0.1:5010
...
```

> macOS では、5000番のポートを「AirPlay レシーバ」が使っていることがあるため、このアプリは 5010番にしています。終わったら `Ctrl + C` で止め、`deactivate` で仮想環境から抜けます。

1. ブラウザ（または curl の `-v` と `-c`・`-b`）で、次の流れを行い、**各リクエストのメソッド・パス・ステータス・`Location`・`Set-Cookie`** を表にする。
   1. ログインしていない状態で `/` を開く
   2. ログインする（パスワードは `secret`）
   3. 一覧が表示される（このときに、ページの JavaScript が送るリクエストも含める）
   4. タスクを追加する
   5. 空のタイトルで追加する（エラーの文が表示される）
2. このアプリは、本文の言葉で言うと MPA と SPA のどちらか。SSR・CSR のどちらを使っているか。一部に例外があれば、それも書く。
3. ログインした後の `session` の Cookie の値は、`.` で区切られた3つの部分からなります。最初の部分を REPL（`node` だけを打つ）で `Buffer.from('最初の部分', 'base64url').toString()` として読み、何が入っているかを確かめる。この Cookie について、次の問いに答える。
   - 利用者は、この中身を**読めるか**。**書き換えられるか**。
   - 書き換えを防いでいるのは何か（第8章2.3節）。このアプリの設定のどこが、その守りを弱くしているか。
4. このアプリの問題を、**第2部で学んだことだけを使って**、少なくとも6つ見つける。それぞれ「どの章のどの知識で分かるか」「どう直すか」を書く。
   - ヒント: テンプレートのフィルタ / 削除のリンク / ログインの後の `next` / `/api/tasks` のヘッダとログインの確認 / `app.run()` の引数 / `secret_key`
   - 確かめるのは、**自分の Mac の中で動かしているこのアプリだけ**にしてください。

---

## 発展

### 問題8 POST を冪等キーで安全に送り直せるようにする

[slow-api.mjs](slow-api.mjs)（8520番）は、保存に 300ms かかるタスクの API です。[retry-client.mjs](retry-client.mjs) は、250ms で返事が無ければ送り直す、よくあるクライアントです（最大4回。**中身は読まなくてよい**）。

```sh
$ node exercises/slow-api.mjs           # ターミナル1
$ node exercises/retry-client.mjs       # ターミナル2
 255ms 1回目: タイムアウト。送り直します
 506ms 2回目: タイムアウト。送り直します
 757ms 3回目: タイムアウト。送り直します
1009ms 4回目: タイムアウト。送り直します

「牛乳を買う（再送の実験）」のタスクは 4 個あります（id: 1, 2, 3, 4）
```

1. クライアントは1回も成功していないのに、タスクが4つできた理由を、ターミナル1の表示と合わせて説明する。
2. コピーして `idempotent-api.mjs` を作り、`POST /api/tasks` を `Idempotency-Key` ヘッダに対応させる。

   ```sh
   $ cp exercises/slow-api.mjs idempotent-api.mjs
   ```

   - キーが無いときは、今までどおり（毎回作る）
   - キーは、空白を含まない表示できる ASCII（`!` から `~`）で 1〜255 文字。それ以外は `400`
   - 1回目は普通に処理する。成功した結果（作ったタスク）をキーと一緒に記録する
   - 同じキー・同じボディの2回目以降は、**処理をせずに**記録した結果を `201` で返し、`Idempotent-Replayed: true` ヘッダを付ける（`Location` も1回目と同じにする）
   - 同じキーで**違うボディ**が来たら `422`
   - 1回目を**処理している間**（`setTimeout` で待っている間）に同じキーが来たら `409 Conflict`
   - 入力の誤り（`400`、`422`）になったリクエストのキーは記録しない（直した内容を、同じキーで送れるように）

3. 確かめる。

   ```sh
   $ bash exercises/check-idempotency.sh idempotent-api.mjs
   [OK] 1. キーが無い POST は、毎回タスクを作る
   ...
   すべて成功しました

   $ node idempotent-api.mjs                 # ターミナル1（slow-api.mjs は止めておく）
   $ node exercises/retry-client.mjs --key   # ターミナル2。タスクが1つだけになることを確かめる
   ```

4. 「処理中」の記録を、`setTimeout` の**前**ではなく、`setTimeout` の中（保存した後）で初めて付けると、どうなるか。`check-idempotency.sh` のどの確認が失敗するかを予想してから、試して確かめる。
5. この実装を本番で使うには、まだ足りないことがあります。少なくとも3つ挙げる（ヒント: サーバを再起動したら / サーバのプロセスが複数あったら / 別の利用者が同じキーを使ったら / 記録はいつまで残るか）。

ヒント:
- キーは `req.headers['idempotency-key']` で読めます（ヘッダの名前は小文字になります）。無いときは `undefined` です。
- 記録には `Map` が便利です。`const records = new Map();` で作り、`records.set(キー, 値)` で書き、`records.get(キー)` で読みます（無ければ `undefined`）。
- 「同じボディか」は、受け取ったボディの文字列をそのまま記録しておき、`===` で比べれば十分です。
- `文字列.charCodeAt(i)` は、i 番目の文字の番号を返します。`!` は 33、`~` は 126 です。
- ヘッダは `res.setHeader('名前', '値')` で、`writeHead` の前に足しておけます（`slow-api.mjs` の `Location` と同じ）。
