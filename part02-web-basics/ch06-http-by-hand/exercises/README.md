# 第6章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
作るファイルは `~/dev/ch06/` に置き、コマンドもそこで実行します（本文の「読み方」でコピーした `samples/` と `exercises/` を使います）。サーバを動かすターミナルと、`curl` を打つターミナルの2つを開いておきます。

| 問題 | 種類 | テーマ | 本文の節 |
| --- | --- | --- | --- |
| 1 | 基本 | curl で送ったリクエストを確かめる | 2, 3, 10 |
| 2 | 基本 | 自作のサーバにパスを足す | 5.3, 9.2 |
| 3 | 基本 | GET 以外には 405 を返す | 5.3, 6, 8 |
| 4 | 基本 | node:http のサーバにパスを足す | 11.1 |
| 5 | 基本 | ステータスコードを選ぶ | 7 |
| 6 | 応用 | 送られた数の合計を返すサーバ | 11.2, 7 |
| 7 | 応用 | アクセスログを付ける | 11.3, 11.4 |
| 8 | 応用 | 長さを間違えたリクエストを nc で送る | 4, 9 |
| 9 | 応用 | node:net で HTTP のクライアントを書く | 3, 5.4 |
| 10 | 発展 | HTTP サーバのバグを直す | 5, 9.4 |
| 11 | 発展 | 長さを見てレスポンスの終わりを判断する | 9 |

**発展**（10・11）は、少し長めの問題です。できなくても次の章に進んでかまいません。

---

## 基本

### 問題1 curl で送ったリクエストを確かめる

`node samples/http-echo-server.mjs` を起動しておきます。このサーバは、届いたリクエストの `method`（メソッド）、`headers`（ヘッダ）、`body`（ボディ）を JSON で返します。

1. `curl -s -d 'x=1' http://127.0.0.1:8081/q` を実行する前に、`method` と `headers` の `content-type` がどうなるか予想する。実行して確かめる。
2. JSON を送るつもりで `curl -s -d '{"a":1}' http://127.0.0.1:8081/j` と打った。返ってきた `content-type` を見て、サーバが「JSON だ」と分からない理由を説明する。`-H` を使って、正しく `application/json` として送るコマンドを書く。
3. 次の2つを実行し、`Re-using`（接続の使い回し）の行があるかを比べる。違いの理由を説明する。

   ```sh
   $ curl -v http://127.0.0.1:8081/a http://127.0.0.1:8081/b 2>&1 | grep -E 'Connected|Re-using'
   $ curl -v -H 'Connection: close' http://127.0.0.1:8081/a http://127.0.0.1:8081/b 2>&1 | grep -E 'Connected|Re-using'
   ```

### 問題2 自作のサーバにパスを足す

本文5節の `my-http-server.mjs` をコピーして `my-http-server-v2.mjs` を作り、次のパスを足してください。

| パス | 返すもの |
| --- | --- |
| `/hello-ja` | `こんにちは`（と改行） |
| `/time` | `今は 2026/11/9 10:24:04 です` のように、今の日時 |

- どちらもステータスは `200 OK`
- `curl -i` で、`Content-Length` がボディの**バイト数**になっていることを確かめる（`こんにちは\n` は何バイトか、先に計算しておく）

ヒント: 今の日時は `new Date().toLocaleString('ja-JP')` で、日本の書き方の文字列になります。

### 問題3 GET 以外には 405 を返す

`my-http-server-v2.mjs` を、`GET` 以外のメソッドには `405 Method Not Allowed` を返すようにしてください。

- ボディは `GET だけ使えます`
- 使えるメソッドを伝える `Allow: GET` ヘッダを付ける

確かめ方:

```sh
$ curl -i -X POST http://127.0.0.1:8085/
HTTP/1.1 405 Method Not Allowed
Content-Type: text/plain; charset=utf-8
Content-Length: 23
Allow: GET
Connection: close

GET だけ使えます
```

ヒント: `respond` 関数に、足したいヘッダの行を受け取る5つ目の引数を足します。`function respond(socket, status, reason, body, extraHeaders = '')` と書くと、5つ目を省略したときは `''`（空の文字列）になります（**既定値**）。呼ぶときは `'Allow: GET\r\n'` のように、行の終わりの `\r\n` まで渡します。

### 問題4 node:http のサーバにパスを足す

本文11節の `hello-http.mjs` をコピーして `hello-http-v2.mjs` を作り、次のパスを足してください（どちらも `GET` だけ）。

| パス | 返すもの | Content-Type |
| --- | --- | --- |
| `/hello-ja` | `こんにちは` | `text/plain; charset=utf-8` |
| `/headers` | 届いたヘッダ（`req.headers`）を JSON にしたもの | `application/json; charset=utf-8` |

確かめ方:

```sh
$ curl -s http://127.0.0.1:8086/headers
{
  "host": "127.0.0.1:8086",
  "user-agent": "curl/8.7.1",
  "accept": "*/*"
}
$ curl -s -H 'X-Hello: abc' http://127.0.0.1:8086/headers      # x-hello も表示されること
```

ヒント: `JSON.stringify(req.headers, null, 2)` で、オブジェクトを、2文字ずつ字下げした読みやすい JSON の文字列にできます。5節で自分で書いたサーバと比べて、何を書かずに済んだか（`Content-Length`、ヘッダ名を小文字にする、など）を確かめましょう。

### 問題5 ステータスコードを選ぶ

タスク管理の API（第5部で作るもの）で、次の場面では、本文7節の表のどのステータスコードを返すのがよいか。理由も1文で書いてください。

1. `POST /tasks` で新しいタスクを作った
2. `DELETE /tasks/3` で削除した。返すボディは無い
3. `GET /tasks/999` で、そんなタスクは無かった
4. ログインしていない人が `GET /tasks` を送った
5. ログインしている A さんが、B さんのタスクを `DELETE /tasks/5` で消そうとした
6. `POST /tasks` の JSON が壊れていた（`{"title": ` で終わっている）
7. 同じ人が1秒間に100回リクエストを送ってきた
8. データベースが止まっていて、タスクの一覧を取れなかった

## 応用

### 問題6 送られた数の合計を返すサーバ

`node:http` で、`calc-server.mjs` を作ってください。`POST /sum` のボディに、スペースで区切った数を送ると、合計を返します。

| リクエスト | ステータス | ボディ |
| --- | --- | --- |
| `POST /sum`（ボディ `1 2 3`） | 200 | `合計: 6` |
| `POST /sum`（ボディ `1 x`） | 400 | `数ではありません: "x"` |
| `POST /sum`（ボディが空） | 400 | `数ではありません: ""` |
| `GET /sum` | 405（`Allow: POST` を付ける） | `POST で、数をスペースで区切って送ってください` |
| それ以外のパス | 404 | `見つかりません` |

- 127.0.0.1 の 8088番で待ち受ける

確かめ方:

```sh
$ curl -d '1 2 3' http://127.0.0.1:8088/sum
合計: 6
$ curl -i -d '1 x' http://127.0.0.1:8088/sum       # 400 であること
$ curl -i http://127.0.0.1:8088/sum                # 405 と Allow: POST
```

ヒント:

- ボディは本文11.2節のとおり、`'data'` で集めて `'end'` で返事をします。
- `body.trim().split(' ')` で、数の文字列の配列になります。`Number('x')` は **`NaN`**（数ではない、という特別な値）になります。`Number.isNaN(n)` で `NaN` かどうかを調べられます。`Number('')` は `0` になってしまうので、空の文字列は別に調べます。
- 同じ形の返事を何度も書くので、`function send(res, status, text) { ... }` のような関数にまとめると楽です。
- `return` で関数をそこで終えると、1つのリクエストに2回返事をしてしまう失敗を防げます。

### 問題7 アクセスログを付ける

[app-handler.mjs](app-handler.mjs) は、リクエストを処理する関数 `handler(req, res)` を `export` しているファイルです。これを**変更せずに** `import` して使い、すべてのリクエストについて、ログを1行ずつ出すサーバ `logged-server.mjs` を作ってください。

- `~/dev/ch06/logged-server.mjs` に作り、`import { handler } from './exercises/app-handler.mjs';` で読み込む
- 127.0.0.1 の 8082番で待ち受け、処理は `handler(req, res)` に任せる
- レスポンスを送り終えたら、次の形で1行出す

  ```
  2026-11-09T10:24:04.460Z 127.0.0.1 "GET /hello-ja HTTP/1.1" 200 4ms
  ```

ヒント:

| 書き方 | 意味 |
| --- | --- |
| `new Date().toISOString()` | 今の日時を `2026-11-09T10:24:04.460Z` の形（世界標準時）にする |
| `req.socket.remoteAddress` | 相手の IP アドレス（第5章3.3節の `socket` と同じもの） |
| `req.httpVersion` | `1.1` のような HTTP のバージョン |

確かめ方:

```sh
$ node logged-server.mjs > access.log          # ターミナル1。ログはファイルに書かれる
$ curl -s localhost:8082/hello-ja              # ターミナル2。以下も順に
$ curl -s localhost:8082/chunked
$ curl -sI localhost:8082/hello-ja
$ curl -s localhost:8082/status/404
$ curl -s localhost:8082/nothing
$ cat access.log                               # 5行のログ（と、最初の1行）
$ grep ' 404 ' access.log | wc -l              # 2
```

第5部の Express では、この「処理を包んで、前後に何かを足す」仕組みを**ミドルウェア**と呼びます。

### 問題8 長さを間違えたリクエストを nc で送る

`node samples/raw-http-server.mjs` を起動しておきます。次の A〜C を1つずつ送ります。**送る前に**、それぞれ「レスポンスはいくつ返るか」「`nc` はすぐに終わるか、待ち続けるか」を予想して書き、実行して確かめます（`nc` が終わらないときは `Ctrl + C`）。予想と違ったものは、理由を本文9節の言葉で説明します。

```sh
# A: Content-Length（3）が、実際のボディ hello（5バイト）より小さい。後ろに別のリクエストが続く
$ printf 'POST /a HTTP/1.1\r\nHost: x\r\nContent-Length: 3\r\n\r\nhelloGET /b HTTP/1.1\r\nHost: x\r\nConnection: close\r\n\r\n' | nc 127.0.0.1 8080

# B: Content-Length（10）が、実際のボディより大きい
$ printf 'POST /a HTTP/1.1\r\nHost: x\r\nContent-Length: 10\r\n\r\nhello' | nc 127.0.0.1 8080

# C: Content-Length を文字数（7）で数えてしまった
$ printf 'POST /a HTTP/1.1\r\nHost: x\r\nContent-Length: 7\r\nConnection: close\r\n\r\nname=ねこ' | nc 127.0.0.1 8080
```

### 問題9 node:net で HTTP のクライアントを書く

`node:http` や `fetch` を使わず、第5章の `net.connect` で GET を送り、レスポンスを分けて表示する `http-get.mjs` を作ってください。

- 使い方: `node http-get.mjs ポート パス`（接続先は `127.0.0.1`）
- 送るのは、`GET パス HTTP/1.1`、`Host: 127.0.0.1:ポート`、`Connection: close` と空行
- `Connection: close` を付けたので、サーバは返し終わると接続を閉じる。届いたものを `'data'` でためておき、`'end'` が来たら、次のように分けて表示する

  ```
  ステータス: 200
  ヘッダ:
    Content-Type: text/plain; charset=utf-8
    Content-Length: 26
    ...
  ボディ:
  こんにちは、HTTP！
  ```

- 接続できないときは `エラー: ECONNREFUSED` のように表示する

確かめ方（`samples/http-echo-server.mjs` を起動しておく）:

```sh
$ node http-get.mjs 8081 /hello-ja
$ node http-get.mjs 8081 /status/404
$ node http-get.mjs 8081 /chunked          # ボディに 8 や 0 の行が混ざるのはなぜか、本文9.3節で説明する
$ node http-get.mjs 8099 /                 # だれもいないポート
```

ヒント:

- `socket.setEncoding('utf8')` を書くと、`'data'` で文字列が届きます（本文11.2節の `req.setEncoding` と同じ）。
- 全部届いたら、`response.indexOf('\r\n\r\n')` でヘッダとボディの境目を探し、`slice` で分けます。ヘッダの部分は本文5.2節・5.4節と同じように `split('\r\n')` で行に分けます。ステータス行は `HTTP/1.1 200 OK` なので、スペースで分けた1番目がステータスコードです。

## 発展

### 問題10 HTTP サーバのバグを直す

[buggy-server.mjs](buggy-server.mjs) は、本文5節のように `node:net` で書いた HTTP サーバです。`GET /hello` と `POST /echo` に答えますが、**バグが3つ**あります。[check-server.sh](check-server.sh) で確かめられます。

```sh
$ node exercises/buggy-server.mjs          # ターミナル1
$ bash exercises/check-server.sh           # ターミナル2
[NG] 1. GET /hello が日本語を最後まで返す
     期待: こんにちは
     実際: こん
...
```

1. `check-server.sh` の結果をもとに、3つのバグを見つけ、それぞれ「どの行が」「なぜ」間違っているかを説明する。
2. `buggy-server.mjs` を `~/dev/ch06/fixed-server.mjs` にコピーして直す。`bash exercises/check-server.sh` が「すべて成功しました」になれば完成です。

ヒント:

- テスト3・4で使う [tricky-client.mjs](tricky-client.mjs) は、curl が普段は送らない「変わった、でも正しい」リクエストを送ります。中身の先頭のコメントを読むと、何を送っているかが分かります。
- バグの1つは本文9.2節、1つは本文8節（ヘッダ名）、1つは第5章4.3節（`'data'` の区切り）に関係します。
- 3つ目を直すには、本文9.4節の `Buffer.concat`・`indexOf`・`subarray` を使い、届いたバイトを接続ごとにためて、「ヘッダの終わりと、`Content-Length` の分のボディが揃ったか」を調べます。揃っていなければ `return` して次の `'data'` を待ちます。

### 問題11 長さを見てレスポンスの終わりを判断する

問題9の `http-get.mjs` は、`Connection: close` に頼って「接続が閉じたら終わり」と判断していました。これを、`Connection: close` を**付けずに**、レスポンスのヘッダを見て終わりを判断する `http-get-v2.mjs` に作り直してください。

- `Connection: close` を付けない（サーバは接続を開けたままにするので、`'end'` は来ない）
- 届いたバイトを `Buffer.concat` でためておき、`'data'` のたびに「揃ったか」を調べる
- `Content-Length` があれば、ヘッダの後ろがそのバイト数になったら揃った
- `Transfer-Encoding: chunked` なら、本文9.3節の「長さ（16進数）の行・中身・`\r\n`」を順に読み、長さ 0 のかたまりで揃った。かたまりの中身だけをつなげてボディにする
- 揃ったら、ステータス行・ヘッダ・ボディを表示し、`socket.destroy()` で自分から閉じる
- 5秒たっても揃わなければ、`時間切れ` と表示して閉じる（第5章4.2節の `setTimeout`）

確かめ方:

```sh
$ node http-get-v2.mjs 8081 /hello-ja      # すぐに終わる
$ node http-get-v2.mjs 8081 /chunked       # 1.5秒ほどで「1つ目」「2つ目」「3つ目」が表示されて終わる（8 や 0 の行は出ない）
```

すぐに終わらず5秒待ってから「時間切れ」になるものがあれば、どこかで終わりを判断できていません。
