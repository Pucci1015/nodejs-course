# 第6章 HTTP を手で話す

第5章で、TCP は「区切りのないバイトの流れ」を運ぶだけだと分かりました。**HTTP** は、その流れの上で「どこまでがヘッダで、どこからがボディか」を決めた、**文字のやり取りの約束事**です。この章では、`curl` で HTTP の中身を覗き、`nc` で手でリクエストを打ち、最後に**第5章の `node:net` で HTTP サーバを自分で書きます**。その後で `node:http` を使い、何を代わりにしてくれているのかを確かめます。
Flask の `request.method` や `return "...", 404` が、実際にどんなバイトになって流れていたのかを、この章で説明できるようになります。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 3〜4時間 |
| 前提 | 第5章（`net.createServer`、`socket.on('data', ...)`、`127.0.0.1` とポート） |
| この章のゴール | HTTP メッセージの形（開始行・ヘッダ・空行・ボディ）を書ける / `curl -v` の出力を読める / `node:net` で小さな HTTP サーバを書ける / `Content-Length` がバイト数である理由を説明できる / `node:http` でサーバを書ける |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くサーバの完成形、リクエストを見せてくれるサーバ、生のレスポンスを表示するクライアント |
| [exercises/](exercises/) | 練習問題 |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - 実習は `~/dev/ch06/` で行います（教材のフォルダは見本として残しておくため）。最初に作業フォルダを作り、教材の `samples` と `exercises` をコピーします（やり方は第5章の「読み方」と同じです）。
>
>   ```sh
>   $ mkdir -p ~/dev/ch06 && cd ~/dev/ch06
>   $ cp -R （ここに Finder から ch06-http-by-hand の samples と exercises をドラッグ） .
>   ```
>
> - この章のコマンドは、すべて `~/dev/ch06/` で実行します。サーバを動かすターミナルと、`curl` などを打つターミナルの2つを開いておくと便利です。
> - 「**手を動かす**」の所は、実際に打って動かしてください。練習問題は、そこで書いたサーバを広げていく問題です。
> - 外部のサイト（`example.com` など）に対する出力は、執筆時の出力例です。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| `curl -v` の読み方（2節） | この教材のすべてのサーバを確かめるとき。第2部の成果物で実在のサイトを調べる |
| メッセージの形とヘッダ（3節・8節） | 第7章の Cookie・キャッシュ・リダイレクトは、すべてヘッダの話 |
| `node:net` で書く HTTP サーバ（5節） | フレームワークが裏でしていることを知る。第4部でフレームワークなしのサーバを作る |
| ステータスコード（7節） | 第4部・第5部で API を作るとき、どのコードを返すかを決める |
| `Content-Length` はバイト数（9節） | 日本語を返すサーバを書くとき（第4部）。ボディを読む処理（第4部 第20章） |
| `node:http`（11節） | 第4部のサーバの土台。第5部の Express も、この上に作られている |

---

## 1. HTTP とは

**HTTP**（HyperText Transfer Protocol）は、クライアント（ブラウザや `curl`）が**リクエスト**を送り、サーバが**レスポンス**を返す、という1往復を基本にした約束事です。

| 特徴 | 意味 |
| --- | --- |
| テキストで書かれている（HTTP/1.1） | 人間が読める文字なので、手で打ち込める（4節） |
| TCP の上で動く | 第5章の TCP の接続の上を流れる |
| **ステートレス** | サーバは前のリクエストを覚えていない。ログイン状態を保つには Cookie を使う（第7章） |

Flask（の下にある Werkzeug という部品）は、届いたバイトを解析して `request` を作り、`return` した値をバイトに組み立てて送っていました。この章では、その「解析」と「組み立て」を自分でやってみます。

HTTP には 1.1、2、3 というバージョンがあります。2 と 3 は効率のよいバイナリ形式で運びますが、メソッド・ステータス・ヘッダ・ボディという中身は 1.1 と同じです（第7章）。そこで、まず文字で読める HTTP/1.1 で仕組みを学びます。

## 2. curl で HTTP を覗く

### 2.1 手を動かす: curl -v で見る

`samples/http-echo-server.mjs` は、届いたリクエストを JSON で返してくれるサーバです（中身は11節を読んだ後に読めるようになります）。

```sh
$ node samples/http-echo-server.mjs            # ターミナル1
http://127.0.0.1:8081/ で待ち受けています（Ctrl + C で終了）
$ curl -v http://127.0.0.1:8081/hello-ja       # ターミナル2
```

```
*   Trying 127.0.0.1:8081...
* Connected to 127.0.0.1 (127.0.0.1) port 8081
> GET /hello-ja HTTP/1.1
> Host: 127.0.0.1:8081
> User-Agent: curl/8.7.1
> Accept: */*
>
< HTTP/1.1 200 OK
< Content-Type: text/plain; charset=utf-8
< Content-Length: 26
< Date: Wed, 04 Nov 2026 14:15:04 GMT
< Connection: keep-alive
< Keep-Alive: timeout=5
<
こんにちは、HTTP！
* Connection #0 to host 127.0.0.1 left intact
```

| 行の始まり | 意味 |
| --- | --- |
| `*` | curl からの説明。`Connected` は TCP の接続ができた（第5章4.1節） |
| `>` | curl が**送った**リクエスト |
| `<` | サーバから**届いた**レスポンスのヘッダ |
| `>` / `<` だけの行 | ヘッダの終わりを表す**空行** |
| 印の無い行 | レスポンスのボディ |

`Content-Length: 26` に注目してください。`こんにちは、HTTP！` と改行は12文字ですが、26 です。理由は9節で分かります。

curl のよく使うオプションです。この章で順に使います。

| オプション | 意味 |
| --- | --- |
| `-v` | 送ったリクエスト（`>`）と、届いたヘッダ（`<`）を表示する（verbose） |
| `-i` | レスポンスのヘッダも、ボディと一緒に表示する |
| `-I` | `HEAD` リクエストを送り、ヘッダだけを表示する |
| `-s` | 進み具合の表示を消す |
| `-X メソッド` | メソッドを指定する（`-X DELETE` など） |
| `-H '名前: 値'` | ヘッダを追加する |
| `-d 'データ'` | ボディを付けて送る（メソッドは自動で `POST` になる） |
| `-o ファイル` | ボディをファイルに保存する。`-o /dev/null` で捨てる |
| `-w '書式'` | 終わった後に情報を表示する。例: `-w '%{http_code}\n'` でステータスコード |

### 2.2 実在のサイトに送ってみる

インターネットに接続した状態で試します（出力例）。

```sh
$ curl -sI https://example.com/
HTTP/2 200
content-type: text/html
etag: "84238dfc8092e5d9c0dac8ef93371a07:1736799080.121134"
cache-control: max-age=2201
```

`HTTP/2` と表示され、ヘッダ名が小文字です。HTTPS のサイトでは HTTP/2 を使うことが多く、HTTP/2 ではヘッダ名は小文字と決まっているからです。`etag` や `cache-control` は第7章で扱います。

## 3. HTTP メッセージの形

リクエストもレスポンスも、同じ形をしています。

```
開始行                  ← リクエスト行 または ステータス行
名前: 値                ← ヘッダ（0個以上）
名前: 値
（空行）                ← ヘッダの終わり
ボディ                  ← 無いこともある
```

**各行の終わりは `\r\n`**（CR と LF の2バイト）です。Mac のテキストファイルの改行は `\n` だけですが、HTTP では `\r\n` と決まっています。

### 3.1 手を動かす: 届いたバイトをそのまま見る

`samples/raw-http-server.mjs` は、届いたリクエストを、`\r\n` を記号にして見せてくれるサーバです。

```sh
$ node samples/raw-http-server.mjs                  # ターミナル1（8080番）
$ curl -d 'name=ねこ' http://127.0.0.1:8080/form      # ターミナル2
```

```
== 届いたバイトそのまま（\r\n が改行の記号）==
POST /form HTTP/1.1\r\n
Host: 127.0.0.1:8080\r\n
User-Agent: curl/8.7.1\r\n
Accept: */*\r\n
Content-Length: 11\r\n
Content-Type: application/x-www-form-urlencoded\r\n
\r\n
name=ねこ
```

| 部分 | 例 | 意味 |
| --- | --- | --- |
| リクエスト行 | `POST /form HTTP/1.1` | **メソッド**、**ターゲット**（パスとクエリ）、**バージョン**を、スペース1つで区切る |
| ヘッダ | `Host: 127.0.0.1:8080` | `名前: 値`。名前の大文字・小文字は区別しない |
| 空行 | `\r\n` | ここでヘッダが終わる |
| ボディ | `name=ねこ` | `Content-Length` のバイト数だけ続く |

リクエスト行のパスには、ホスト名が入っていません。どのサイト宛てかは **`Host` ヘッダ**で伝えます。1台のサーバ（1つの IP アドレス）で複数のサイトを動かせるようにするためです。

### 3.2 レスポンス

```
HTTP/1.1 200 OK\r\n
Content-Type: text/plain; charset=utf-8\r\n
Content-Length: 26\r\n
\r\n
こんにちは、HTTP！
```

1行目は**ステータス行**で、バージョン、**ステータスコード**（3桁の数字）、**理由句**（人間向けの説明）が並びます。ヘッダ・空行・ボディは、リクエストと同じです。

## 4. nc で HTTP を手で話す

HTTP はただの文字なので、第5章の `nc` でも話せます。

### 4.1 手を動かす: printf で送る

`\r\n` を Return キーで打つのは難しいので、`printf` で送ります。`printf` は、`\r` や `\n` を本物の改行の文字にして出力するコマンドです。`|`（パイプ）で、それを `nc` に渡します。

```sh
$ printf 'GET / HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n' | nc 127.0.0.1 8080
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Content-Length: 371
...
```

`Connection: close` は「返事をしたら接続を閉じてください」という意味です。付けないと、サーバは次のリクエストを待って接続を開けたままにするので、`nc` が終わりません（10節。`Ctrl + C` で止めます）。

### 4.2 手を動かす: わざと間違える

手で話す利点は、curl やブラウザが決して送らない**間違ったリクエスト**を送れることです。`Host` ヘッダを付けずに送ってみます。

```sh
$ printf 'GET / HTTP/1.1\r\n\r\n' | nc 127.0.0.1 8080
HTTP/1.1 400 Bad Request
Content-Type: text/plain; charset=utf-8
Content-Length: 46
Connection: close

HTTP/1.1 では Host ヘッダが必要です
```

HTTP/1.1 では `Host` ヘッダは**必須**で、無ければ `400 Bad Request` を返すことになっています。

## 5. 手を動かす: node:net で HTTP サーバを書く

ここが、この章の中心です。第5章の TCP サーバに「HTTP の形の文字を送る」だけで、curl やブラウザと話せるサーバになります。ファイルは `~/dev/ch06/my-http-server.mjs` です（完成形は [samples/my-http-server.mjs](samples/my-http-server.mjs)）。

### 5.1 決まった文字を返す

```js
import net from 'node:net';

const server = net.createServer((socket) => {
  socket.on('data', (chunk) => {
    console.log(JSON.stringify(chunk.toString()));
    const body = 'hello\n';
    socket.write(
      'HTTP/1.1 200 OK\r\n' +
        'Content-Type: text/plain; charset=utf-8\r\n' +
        `Content-Length: ${Buffer.byteLength(body)}\r\n` +
        'Connection: close\r\n' +
        '\r\n' +
        body,
    );
    socket.end();
  });
});

server.listen(8085, '127.0.0.1', () => {
  console.log('http://127.0.0.1:8085/ で待ち受けています');
});
```

```sh
$ node my-http-server.mjs                      # ターミナル1
$ curl -v http://127.0.0.1:8085/               # ターミナル2
...
< HTTP/1.1 200 OK
< Content-Type: text/plain; charset=utf-8
< Content-Length: 6
< Connection: close
<
hello
```

ブラウザで `http://127.0.0.1:8085/` を開いても、`hello` と表示されます。**HTTP サーバとは、決まった形の文字を返す TCP サーバ**だということが分かります。

ターミナル1には、届いたリクエストが `JSON.stringify` で表示されます。`JSON.stringify(文字列)` は、`\r` や `\n` を記号のまま見せてくれるので、何が届いたか確かめるのに便利です。

```
"GET / HTTP/1.1\r\nHost: 127.0.0.1:8085\r\nUser-Agent: curl/8.7.1\r\nAccept: */*\r\n\r\n"
```

| 書き方 | 意味 |
| --- | --- |
| `'...' + '...'` | 文字列をつなぐ。長い文字列を、行ごとに分けて書ける |
| `Buffer.byteLength(body)` | 文字列を UTF-8 にしたときの**バイト数**。`Content-Length` にはこれを使う（9節） |
| `socket.end()` | 送り終わったので接続を閉じる（`Connection: close` と約束したため） |

### 5.2 リクエスト行を読む

届いた文字を `\r\n` で分けると、1行目がリクエスト行です。さらにスペースで分けると、メソッド・ターゲット・バージョンが取り出せます。`socket.on('data', ...)` の中を、次のように書き換えます。

```js
  socket.on('data', (chunk) => {
    const text = chunk.toString();
    const lines = text.split('\r\n');
    const [method, target, version] = lines[0].split(' ');
    console.log(method, target, version);

    const body = `${method} ${target} を受け取りました\n`;
    socket.write(
      'HTTP/1.1 200 OK\r\n' +
        'Content-Type: text/plain; charset=utf-8\r\n' +
        `Content-Length: ${Buffer.byteLength(body)}\r\n` +
        'Connection: close\r\n' +
        '\r\n' +
        body,
    );
    socket.end();
  });
```

```sh
$ curl http://127.0.0.1:8085/abc?x=1
GET /abc?x=1 を受け取りました
$ curl -X DELETE http://127.0.0.1:8085/items/3
DELETE /items/3 を受け取りました
```

| 書き方 | 意味 |
| --- | --- |
| `const [a, b, c] = 配列` | 配列の0番目を `a`、1番目を `b`、2番目を `c` に入れる（**分割代入**） |
| `const [first, ...rest] = 配列` | 0番目を `first` に、**残り全部**を配列 `rest` に入れる |

### 5.3 ステータスコードを変える

パスによって `200` と `404` を返し分けます。毎回同じ形の文字を組み立てるので、関数にまとめます。

```js
function respond(socket, status, reason, body) {
  socket.write(
    `HTTP/1.1 ${status} ${reason}\r\n` +
      'Content-Type: text/plain; charset=utf-8\r\n' +
      `Content-Length: ${Buffer.byteLength(body)}\r\n` +
      'Connection: close\r\n' +
      '\r\n' +
      body,
  );
  socket.end();
}
```

`'data'` の中の、`const body = ...` から `socket.end();` までを、次に置き換えます。

```js
    if (target === '/') {
      respond(socket, 200, 'OK', `${method} ${target} を受け取りました\n`);
    } else {
      respond(socket, 404, 'Not Found', '見つかりません\n');
    }
```

```sh
$ curl -i http://127.0.0.1:8085/abc
HTTP/1.1 404 Not Found
Content-Type: text/plain; charset=utf-8
Content-Length: 22
Connection: close

見つかりません
```

`curl -s -o /dev/null -w '%{http_code}\n' http://127.0.0.1:8085/abc` と打つと、ステータスコード（`404`）だけを表示できます。

### 5.4 ヘッダを読む

2行目から空行までがヘッダです。`名前: 値` を、名前を小文字にそろえて、オブジェクトに入れます。`const [method, ...] = ...` の次に足します。

```js
    const headers = {};
    for (const line of lines.slice(1)) {
      if (line === '') break; // 空行 = ヘッダの終わり
      const colon = line.indexOf(':');
      const name = line.slice(0, colon).toLowerCase();
      headers[name] = line.slice(colon + 1).trim();
    }
    console.log(headers);
```

```sh
$ curl http://127.0.0.1:8085/                    # ターミナル1に次のように表示される
{ host: '127.0.0.1:8085', 'user-agent': 'curl/8.7.1', accept: '*/*' }
```

| 書き方 | 意味 |
| --- | --- |
| `配列.slice(1)` | 1番目から最後までの、新しい配列（0番目のリクエスト行を除く） |
| `break` | `for` の繰り返しを、そこで終える |
| `文字列.indexOf(':')` | `:` が何文字目にあるか（最初は0）。無ければ `-1` |
| `文字列.slice(0, colon)` | 0文字目から `colon` 文字目の手前までを取り出す。`slice(colon + 1)` は `:` の次から最後まで |
| `toLowerCase()` | 小文字にする。ヘッダ名は大文字・小文字を区別しないので、そろえておく |
| `obj[name] = 値` | オブジェクトに、`name` という名前で値を入れる。取り出すときは `headers['user-agent']` |

これで、Flask の `request.method`、`request.path`、`request.headers` に当たるものを、自分で作れました。

> このサーバは、簡単にするため「1回の `'data'` にリクエストが全部届く」ことにしています。curl の小さなリクエストならたいていそうなりますが、第5章4.3節のとおり、TCP では保証されません。本物のサーバは、空行（`\r\n\r\n`）が届くまでためる必要があります（練習問題の発展で扱います）。

## 6. メソッド

**メソッド**は「リソース（URL が指すもの）に何をしたいか」を表します。

| メソッド | 意味 | ボディ |
| --- | --- | --- |
| `GET` | 取得する | 普通は付けない |
| `HEAD` | `GET` と同じだが、ヘッダだけを返す | 付けない |
| `POST` | 新しく作る・処理を頼む（フォームの送信など） | 付ける |
| `PUT` | 指定した URL の中身を丸ごと置き換える | 付ける |
| `PATCH` | 一部を変更する | 付ける |
| `DELETE` | 削除する | 普通は付けない |
| `OPTIONS` | そのリソースで何ができるかを聞く（第9章の CORS） | 付けない |

5.2 で試したとおり、メソッドは**ただの文字列**です。サーバが意味を決めて実装しない限り、`DELETE` を送っても何も消えません。Flask で `methods=["POST"]` と書いた URL に `GET` を送ると `405 Method Not Allowed` が返ったのは、Flask が「このパスは POST しか受け付けない」と判断していたからです。「安全」と「冪等」というメソッドの性質は、第10章で扱います。

## 7. ステータスコード

**ステータスコード**は3桁の数字で、**最初の1桁が種類**を表します。

| 範囲 | 種類 | 主なもの |
| --- | --- | --- |
| 1xx | 情報（途中経過） | `101 Switching Protocols`（WebSocket。第5部） |
| 2xx | 成功 | `200 OK`、`201 Created`（作成した）、`204 No Content`（成功したが返すボディは無い） |
| 3xx | リダイレクト・キャッシュ | `301`、`302`、`303`、`307`、`308`、`304 Not Modified`（第7章） |
| 4xx | **クライアント側**の誤り | `400 Bad Request`、`401 Unauthorized`（ログインが必要）、`403 Forbidden`（権限が無い）、`404 Not Found`、`405 Method Not Allowed`、`409 Conflict`（衝突）、`422 Unprocessable Content`（形は正しいが内容がだめ）、`429 Too Many Requests` |
| 5xx | **サーバ側**の誤り | `500 Internal Server Error`、`502 Bad Gateway`、`503 Service Unavailable` |

4xx と 5xx の違いは「**誰が直すべきか**」です。4xx は「リクエストを直せば成功するかもしれない」、5xx は「リクエストは正しいが、サーバが処理できなかった」です。Flask で例外を放置すると `500` になったのは、「アプリの中で予想外のことが起きた＝サーバ側の誤り」だからです。第1章で読んだ `access.log` の `200` や `404` の列は、このステータスコードです。

## 8. ヘッダ

よく見るヘッダです。

| ヘッダ | 向き | 意味 |
| --- | --- | --- |
| `Host` | リクエスト | 宛先のホスト名（とポート）。HTTP/1.1 では必須 |
| `User-Agent` | リクエスト | クライアントの種類（ブラウザ名、`curl/8.7.1` など） |
| `Accept` | リクエスト | 受け取りたいデータの種類（第7章） |
| `Content-Type` | 両方 | ボディの種類と文字コード（`application/json`、`text/html; charset=utf-8`） |
| `Content-Length` | 両方 | ボディの**バイト数** |
| `Connection` | 両方 | 接続をどうするか（`keep-alive`、`close`） |
| `Allow` | レスポンス | そのリソースで使えるメソッド（`405` のときに付ける） |
| `Location` | レスポンス | リダイレクト先（第7章） |
| `Cookie` / `Set-Cookie` | リクエスト / レスポンス | 状態を覚えておく仕組み（第7章） |

- **ヘッダ名は大文字・小文字を区別しない**ので、5.4 では小文字にそろえました。`node:http` も同じく小文字にそろえます（11節）。
- 独自のヘッダも自由に付けられます（`X-Request-Id` など）。

## 9. ボディの長さを伝える

### 9.1 なぜ長さが必要か

TCP にはメッセージの区切りがありません。ヘッダの終わりは空行で分かりますが、**ボディがどこで終わるか**は別に伝える必要があります。

| 方法 | 仕組み | 使われる場面 |
| --- | --- | --- |
| `Content-Length: N` | ボディは N バイト | 長さが前もって分かるとき（普通はこれ） |
| `Transfer-Encoding: chunked` | 「長さ + 中身」のかたまりに分けて送り、長さ 0 で終わり | 作りながら送るので、全体の長さが分からないとき |
| 接続を閉じる | 閉じたところが終わり（レスポンスだけ） | `Connection: close` のとき。古いやり方 |

### 9.2 手を動かす: Content-Length はバイト数

`Content-Length` は**文字数ではなくバイト数**です。UTF-8 では、英数字は1バイト、日本語の多くの文字は3バイトです。REPL（`node`）で確かめます。

```
$ node
> 'こんにちは、HTTP！\n'.length
12
> Buffer.byteLength('こんにちは、HTTP！\n')
26
```

`.length` は文字数（正確には UTF-16 の単位の数）なので、`Content-Length` には使えません。

5.3 の `respond` 関数の `Buffer.byteLength(body)` を、わざと `body.length` に変えて、サーバを起動し直してみましょう。

```sh
$ curl http://127.0.0.1:8085/
GET / を受け
```

`GET / を受け取りました\n` は15文字なので `Content-Length: 15` になり、curl は15バイト（`GET / ` の6バイトと、日本語3文字の9バイト）を読んだところで「ボディは終わり」と判断しました。確かめたら、`Buffer.byteLength(body)` に戻しておきます。

`Content-Length` が実際より**大きい**と、受け取る側は足りないバイトを待ち続けます。どちらも練習問題で確かめます。

### 9.3 手を動かす: chunked を見る

`samples/raw-client.mjs` は、レスポンスを「届いたバイトのまま」表示するクライアントです。`http-echo-server.mjs` の `/chunked` は、長さを決めずに 0.5秒おきに3回書き込みます。

```sh
$ node samples/http-echo-server.mjs     # ターミナル1
$ node samples/raw-client.mjs /chunked  # ターミナル2
```

```
--- 11 ms: 157 バイト届いた ---
HTTP/1.1 200 OK\r\n
Content-Type: text/plain; charset=utf-8\r\n
Connection: close\r\n
Transfer-Encoding: chunked\r\n
\r\n
8\r\n
1つ目
\r\n

--- 511 ms: 13 バイト届いた ---
8\r\n
2つ目
\r\n
...
--- 1512 ms: 5 バイト届いた ---
0\r\n
\r\n
```

`8` は、続くかたまりのバイト数（**16進数**）です。`1つ目\n` は 1 + 3 + 3 + 1 = 8 バイトです。最後の `0\r\n\r\n` が「これで終わり」の印です。

### 9.4 バイト列のまま扱う（発展の問題で使う）

ボディの長さはバイト数なので、きちんと区切るには、文字列にする前の**バイト列（`Buffer`）のまま**扱う必要があります。発展の問題で使う書き方を、REPL で試しておきます。

```
$ node
> let buf = Buffer.from('abc\r\n\r\nこんにちは')
> buf.length                               // バイト数
22
> buf.indexOf('\r\n\r\n')                  // その並びが何バイト目にあるか（無ければ -1）
3
> buf.subarray(7).toString()               // 7バイト目から最後まで
'こんにちは'
> buf.subarray(7, 10).toString()           // 7バイト目から10バイト目の手前まで
'こ'
> Buffer.concat([Buffer.from('ab'), Buffer.from('cd')]).toString()   // バイト列をつなぐ
'abcd'
> parseInt('1a', 16)                       // 16進数の文字列を数にする
26
```

## 10. 接続を使い回す（keep-alive）

TCP の接続を作るには1往復かかります（第5章4.1節）。HTTP/1.1 では、**既定で1つの接続を使い回します**（**keep-alive**）。`Connection: close` と書いたときだけ閉じます。

```sh
$ curl -v http://127.0.0.1:8081/a http://127.0.0.1:8081/b 2>&1 | grep -E 'Connected|Re-using|^> GET'
* Connected to 127.0.0.1 (127.0.0.1) port 8081
> GET /a HTTP/1.1
* Re-using existing connection with host 127.0.0.1
> GET /b HTTP/1.1
```

（`2>&1` は「curl の説明（標準エラー出力）も `grep` に渡す」という意味です（第1章）。`grep -E 'A|B|C'` は、A・B・C の**どれか**を含む行だけを表示します。`-E` を付けると、`|` を「または」の意味で使えます。）

2つ目のリクエストは、1つ目の接続を使い回しています。ただし HTTP/1.1 では、1つの接続の上では**送った順にしか返せない**ので、1つが遅いと後ろも待たされます。HTTP/2 は、1つの接続で複数のリクエストを同時に扱えるようにしました（第7章）。

## 11. 手を動かす: node:http で書く

5節で自分で書いた「解析」と「組み立て」を、Node.js の `node:http` は代わりにしてくれます。ファイルは `~/dev/ch06/hello-http.mjs` です（完成形は [samples/hello-http.mjs](samples/hello-http.mjs)）。

### 11.1 最初のサーバ

```js
import http from 'node:http';

const server = http.createServer((req, res) => {
  if (req.method === 'GET' && req.url === '/') {
    res.statusCode = 200;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end(`こんにちは。あなたの User-Agent は ${req.headers['user-agent']} です\n`);
  } else {
    res.statusCode = 404;
    res.setHeader('Content-Type', 'text/plain; charset=utf-8');
    res.end('見つかりません\n');
  }
});

server.listen(8086, '127.0.0.1', () => {
  console.log('http://127.0.0.1:8086/ で待ち受けています');
});
```

```sh
$ curl -i http://127.0.0.1:8086/
HTTP/1.1 200 OK
Content-Type: text/plain; charset=utf-8
Date: Mon, 09 Nov 2026 10:21:04 GMT
Connection: keep-alive
Keep-Alive: timeout=5
Content-Length: 64

こんにちは。あなたの User-Agent は curl/8.7.1 です
```

| 書き方 | 意味 | 5節で自分で書いたもの |
| --- | --- | --- |
| `http.createServer((req, res) => ...)` | リクエストが1つ届くたびに関数が呼ばれる。`req` がリクエスト、`res` がレスポンス | `net.createServer` と `'data'` |
| `req.method` / `req.url` | メソッド / ターゲット | `lines[0].split(' ')` |
| `req.headers['user-agent']` | ヘッダ。名前は小文字にそろえてある | 5.4 の `headers` |
| `res.statusCode = 404` | ステータスコードを決める（理由句は自動） | `respond` の `status` と `reason` |
| `res.setHeader(名前, 値)` | ヘッダを決める | `'Content-Type: ...\r\n'` |
| `res.end(本文)` | ボディを送って、このレスポンスを終える。`Content-Length` は自動で付く | `Buffer.byteLength` と `socket.write` |

`Date`、`Connection: keep-alive` も自動で付きます。1つの接続で次のリクエストを受けることも、`node:http` がしてくれます。

### 11.2 ボディを読む

`node:http` は、**ヘッダを読み終えた時点で**関数を呼びます。ボディは、その後から少しずつ届くので、自分で集めます。`else` の前に次を足します。

```js
  } else if (req.method === 'POST' && req.url === '/echo') {
    req.setEncoding('utf8');
    let body = '';
    req.on('data', (chunk) => {
      body += chunk;
    });
    req.on('end', () => {
      res.setHeader('Content-Type', 'text/plain; charset=utf-8');
      res.end(`受け取りました: ${body}\n`);
    });
```

```sh
$ curl -d 'name=ねこ' http://127.0.0.1:8086/echo
受け取りました: name=ねこ
```

| 書き方 | 意味 |
| --- | --- |
| `req.setEncoding('utf8')` | 届いたバイトを UTF-8 の文字列にしてから渡してもらう。第5章4.4節の StringDecoder を中で使うので、文字の途中で分かれても化けない |
| `req.on('data', ...)` | ボディの一部が届くたびに呼ばれる |
| `req.on('end', ...)` | ボディが全部届いたら呼ばれる。返事はここで送る |

Flask では、ボディまで読み終わってからビュー関数が呼ばれていました。`node:http` は、大きなアップロードを少しずつ処理できる代わりに、読む手間がかかります（第4部 第20章で詳しく扱います）。

### 11.3 送り終えたらログを出す

`res` にもイベントがあります。**`'finish'`** は、レスポンスを送り終えたときに起きます。`http.createServer((req, res) => {` のすぐ後に足します。

```js
  const start = Date.now();
  res.on('finish', () => {
    console.log(`${req.method} ${req.url} ${res.statusCode} ${Date.now() - start}ms`);
  });
```

`Date.now()` は今の時刻をミリ秒で返すので、差を取ると「かかった時間」になります。

```
GET / 200 8ms
POST /echo 200 1ms
GET /x 404 0ms
```

これが、第1章で読んだ**アクセスログ**の正体です。Flask の開発サーバがターミナルに出していた `"GET / HTTP/1.1" 200 -` の行も、同じように作られています。

### 11.4 別のファイルの関数を使う（export と import）

処理の関数を別のファイルに分けると、サーバの部分と分けて考えられます。

```js
// app.mjs
export function handler(req, res) {        // export: 他のファイルから使えるようにする
  res.end('app.mjs からの返事\n');
}
```

```js
// server.mjs
import http from 'node:http';
import { handler } from './app.mjs';       // ./ で始まるのは「同じフォルダのファイル」

http.createServer((req, res) => {
  handler(req, res);
}).listen(8087, '127.0.0.1');
```

`import { 名前 } from './ファイル'` で、そのファイルが `export` したものを使えます（第3部で詳しく学びます）。練習問題で、この形を使ってアクセスログを付けます。

**HTTP を自分で解析するのは、学ぶためだけにしてください。** HTTP の仕様には、この章で扱わなかった細かい決まりがたくさんあり、間違えるとセキュリティの穴になります。実際のアプリでは `node:http` や、その上に作られたフレームワーク（第5部の Express）を使います。

---

## まとめ

- HTTP は TCP の上でやり取りする**テキストの約束事**。メッセージは「開始行・ヘッダ・空行・ボディ」で、行の終わりは `\r\n`。
- HTTP サーバは「決まった形の文字を返す TCP サーバ」。`node:net` でも書ける。
- HTTP/1.1 では `Host` ヘッダが必須。ヘッダ名は大文字・小文字を区別しない。
- メソッドは「何をしたいか」、ステータスコードは「結果」。4xx はクライアント側、5xx はサーバ側の誤り。
- ボディの終わりは `Content-Length`（**バイト数**。`Buffer.byteLength`）か chunked で伝える。
- `node:http` は、解析・`Content-Length`・keep-alive を代わりにしてくれる。ボディは `'data'` と `'end'` で自分で読む。`res` の `'finish'` でログが出せる。

## 練習問題

[exercises/README.md](exercises/README.md) に11問あります（基本5問、応用4問、発展2問）。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- MDN「HTTP の概要」: https://developer.mozilla.org/ja/docs/Web/HTTP/Overview
- MDN「HTTP レスポンスステータスコード」: https://developer.mozilla.org/ja/docs/Web/HTTP/Status
- RFC 9110（HTTP の意味: メソッド、ステータス、ヘッダ）: https://www.rfc-editor.org/rfc/rfc9110
- RFC 9112（HTTP/1.1 のメッセージの形式）: https://www.rfc-editor.org/rfc/rfc9112
- Node.js ドキュメント `http`: https://nodejs.org/docs/latest/api/http.html

前の章: [第5章 インターネットの仕組み](../ch05-internet/README.md) ／ 次の章: [第7章 HTTP の詳細](../ch07-http-details/README.md)
