# 第5章 サンプル

| ファイル | 内容 | 本文の節 |
| --- | --- | --- |
| [show-network.sh](show-network.sh) | 自分の Mac の IP アドレス、ルーター、DNS サーバ、外から見た IP アドレス、待ち受けているポートをまとめて表示する（中身は読まなくてよい） | 2, 3 |
| [first-server.mjs](first-server.mjs) | 本文で書く、最初の TCP サーバの完成形（7001番） | 3.2, 3.3 |
| [first-client.mjs](first-client.mjs) | 本文で書く、最初の TCP クライアントの完成形 | 4.2 |
| [tcp-echo-server.mjs](tcp-echo-server.mjs) | 受け取った文字を大文字にして返し、届いたバイト数を表示する TCP サーバ（7000番） | 4.3 |
| [tcp-stream-demo.mjs](tcp-stream-demo.mjs) | 「write の回数」と「受信側の `'data'` の回数」が一致しないことを確かめる（動かして結果を見るもの） | 4.3 |
| [decoder-demo.mjs](decoder-demo.mjs) | 日本語がバイトの途中で分かれたときの文字化けと、StringDecoder での直し方 | 4.4 |
| [udp-demo.mjs](udp-demo.mjs) | UDP で3つのメッセージを送受信する | 4.5 |
| [lookup.mjs](lookup.mjs) | 本文で書く、名前解決のプログラムの完成形（`lookup` と `resolve4`） | 5.4 |
| [dns-demo.mjs](dns-demo.mjs) | `lookup` と `resolve4`・`resolve6` を、TTL も含めて比べる | 5.4 |

どれも外部のパッケージを使わないので、`npm install` は不要です。

## 動かし方

本文の「読み方」のとおり `~/dev/ch05/` にコピーしてから、`~/dev/ch05/samples` で動かします（教材のフォルダの中では動かしません）。

```sh
$ cd ~/dev/ch05/samples
```

```sh
# 自分のネットワークを調べる（インターネットに接続した状態で）
$ bash show-network.sh

# TCP のエコーサーバ（ターミナル1）と、nc で接続するクライアント（ターミナル2）
$ node tcp-echo-server.mjs
$ nc localhost 7000
hello
HELLO
# ← nc は Ctrl + C で終了

# TCP がバイトの流れであることを確かめる
$ node tcp-stream-demo.mjs

# UDP
$ node udp-demo.mjs

# 本文で書くプログラムの完成形（7001番。クライアントは別のターミナルで）
$ node first-server.mjs
$ node first-client.mjs 7001

# 文字化けと StringDecoder
$ node decoder-demo.mjs

# 名前解決の2つの方法を比べる
$ node lookup.mjs localhost
$ node dns-demo.mjs localhost
$ node dns-demo.mjs example.com
```

## 出力例

`dns-demo.mjs localhost` の結果（Mac の `/etc/hosts` には `::1` も書かれているので、IPv6 も表示されます）:

```
ホスト名: localhost

dns.lookup（OS に問い合わせる）:
  IPv6 ::1
  IPv4 127.0.0.1
dns.resolve4（A レコード）: 失敗 ENOTFOUND
dns.resolve6（AAAA レコード）: 失敗 ENOTFOUND
```

`localhost` は `/etc/hosts` に書かれている名前で、DNS には登録されていません。そのため、OS の仕組みを使う `lookup` は成功し、DNS サーバに直接聞く `resolve4` は失敗します（本文5.4節）。

## 注意

- サーバはすべて `127.0.0.1` で待ち受けます。家の中の別の機器からは接続できません（本文3.5節）。
- `show-network.sh` は macOS のコマンド（`ipconfig`、`scutil`、`route`）を使います。外から見た IP アドレスは `api.ipify.org` という外部のサービスに問い合わせて調べています。
- サーバを止めるときは、起動したターミナルで Ctrl + C を押します。止め忘れて `EADDRINUSE` が出たら、`lsof -nP -iTCP:7000 -sTCP:LISTEN` で PID を調べて `kill PID` します。
