# 第6章 サンプル

| ファイル | 内容 | ポート | 本文の節 |
| --- | --- | --- | --- |
| [http-echo-server.mjs](http-echo-server.mjs) | `node:http` で作った、リクエストを JSON で返すサーバ。日本語・chunked・好きなステータスコードを返すパスもある（中身は読まなくてよい） | 8081 | 2, 9, 10 |
| [raw-http-server.mjs](raw-http-server.mjs) | `node:net` だけで HTTP/1.1 を話すサーバ。届いたリクエストを「そのままのバイト」で見せる（中身は読まなくてよい） | 8080 | 3, 4 |
| [my-http-server.mjs](my-http-server.mjs) | 本文5節で書く、`node:net` の HTTP サーバの完成形 | 8085 | 5 |
| [raw-client.mjs](raw-client.mjs) | `node:net` で GET を送り、レスポンスを届いた単位ごとに、そのままのバイトで表示する | （8081 に接続） | 9.3 |
| [hello-http.mjs](hello-http.mjs) | 本文11節で書く、`node:http` のサーバの完成形 | 8086 | 11 |

どれも外部のパッケージを使わないので、`npm install` は不要です。サーバはすべて `127.0.0.1` で待ち受けます。

## http-echo-server.mjs のパス

| パス | 返すもの |
| --- | --- |
| `/hello-ja` | `こんにちは、HTTP！`（`Content-Length: 26`） |
| `/chunked` | 0.5秒おきに3行（`Transfer-Encoding: chunked`） |
| `/status/NNN` | ステータスコード NNN（200〜599）。204 と 304 はボディなし |
| `/slow` | 3秒待ってから JSON |
| 上記以外 | リクエストのメソッド・URL・クエリ・ヘッダ（`headers` と `rawHeaders`）・ボディを JSON で |

## 動かし方

本文の「読み方」のとおり `~/dev/ch06/` にコピーしてから、`~/dev/ch06/samples` で動かします（教材のフォルダの中では動かしません）。

```sh
$ cd ~/dev/ch06/samples
```

```sh
# 生の HTTP を見る（ターミナル1でサーバ、ターミナル2でクライアント）
$ node raw-http-server.mjs
$ curl -v http://localhost:8080/hello
$ curl -d 'name=ねこ' http://localhost:8080/form
$ printf 'GET / HTTP/1.1\r\nHost: localhost\r\nConnection: close\r\n\r\n' | nc localhost 8080

# node:http のサーバ
$ node http-echo-server.mjs
$ curl -s 'http://localhost:8081/path?q=1' -H 'X-Test: abc'
$ curl -i http://localhost:8081/status/404
$ node raw-client.mjs /chunked  # chunked のかたまりがそのまま見える
$ curl --raw http://localhost:8081/chunked   # curl でも見られる（--raw: かたまりを組み立て直さずに表示）

# 本文で書くサーバの完成形
$ node my-http-server.mjs
$ node hello-http.mjs
```

## 注意

- `raw-http-server.mjs` は、HTTP の仕組みを見るための**学習用**です。`Transfer-Encoding: chunked` のリクエスト、ヘッダの細かい決まり、セキュリティ上の対策などには対応していません。実際のアプリでは `node:http`（やその上のフレームワーク）を使います（本文11節）。
- `nc` で `Connection: close` を付けずに送ると、サーバが接続を開けたまま次のリクエストを待つので、`nc` が終わりません。`raw-http-server.mjs` は、何も送られてこない接続を30秒で切ります。
- ポートが使われていて `EADDRINUSE` になったら、`node raw-http-server.mjs 18080` のように別のポートを指定します。`raw-client.mjs` は `node raw-client.mjs /chunked 18081` のように2つ目の引数でポートを指定します。
