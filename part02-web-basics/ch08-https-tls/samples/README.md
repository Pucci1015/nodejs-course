# 第8章 サンプル

本文の「手を動かす」で書くものの完成形と、実験用のプログラムです。`~/dev/ch08/` にコピーしてから、`~/dev/ch08` で `node samples/ファイル名` のように動かします。

| ファイル | 内容 | ポート | 本文の節 |
| --- | --- | --- | --- |
| [hash.mjs](hash.mjs) | 文字列の SHA-256 を表示する（完成形） | — | 2.1 |
| [hmac.mjs](hmac.mjs) | HMAC を作って確かめる（完成形） | — | 2.3 |
| [sign.mjs](sign.mjs) | Ed25519 で署名を作って確かめる（完成形） | — | 2.4 |
| [key-exchange.mjs](key-exchange.mjs) | X25519 の鍵交換で、2人が同じ値を得る（完成形） | — | 2.5 |
| [make-self-signed.sh](make-self-signed.sh) | localhost 用の自己署名証明書と秘密鍵を `~/dev/ch08/certs` に作る | — | 5.1 |
| [my-https-server.mjs](my-https-server.mjs) | `node:https` の HTTPS のサーバ（完成形。HSTS 付き） | 8444 | 5.2, 7.2 |
| [my-cert-check.mjs](my-cert-check.mjs) | TLS で接続して、証明書の持ち主・発行者・期限と検証の結果を表示する（完成形） | — | 6 |
| [to-https.mjs](to-https.mjs) | HTTP で来たら HTTPS へ 308 でリダイレクトする（完成形） | 8180 | 7.1 |
| [crypto-demo.mjs](crypto-demo.mjs) | ハッシュ・AES-GCM・HMAC・署名・鍵交換をまとめて試す（中身は読まなくてよい） | — | 2 |
| [https-server.mjs](https-server.mjs) | HTTP/2 にも対応した HTTPS のサーバ。TLS のバージョンや ALPN の結果を返す（中身は読まなくてよい） | 8443 | 5.2 |
| [cert-inspect.mjs](cert-inspect.mjs) | 証明書のチェーンと接続の内容を詳しく表示する（中身は読まなくてよい） | — | 3.5 |

外部のパッケージは使わないので、`npm install` は不要です。`make-self-signed.sh` は macOS 標準の `openssl`（LibreSSL）で動きます。

## 動かし方

```sh
$ cd ~/dev/ch08
$ node samples/hash.mjs hello
$ node samples/crypto-demo.mjs aes               # hash / aes / hmac / sign / ecdh。省略するとすべて

$ bash samples/make-self-signed.sh               # ~/dev/ch08/certs に作る（既にあれば何もしない）
$ node samples/my-https-server.mjs               # ターミナル1
$ curl --cacert ~/dev/ch08/certs/cert.pem https://localhost:8444/
$ node samples/my-cert-check.mjs localhost 8444 ~/dev/ch08/certs/cert.pem

$ node samples/https-server.mjs ~/dev/ch08/certs/cert.pem ~/dev/ch08/certs/key.pem
$ curl --cacert ~/dev/ch08/certs/cert.pem https://localhost:8443/
$ node samples/cert-inspect.mjs localhost 8443 --ca ~/dev/ch08/certs/cert.pem
$ node samples/cert-inspect.mjs example.com      # インターネットに接続して
```

## 注意

- 証明書と秘密鍵は、教材のフォルダ（OneDrive 上）ではなく `~/dev/ch08/` の下に作ります。秘密鍵がクラウドに同期されたり、Git に入ったりしないようにするためです。
- `my-cert-check.mjs` と `cert-inspect.mjs` は、検証に失敗しても接続を続けて結果を表示します（`rejectUnauthorized: false`）。**調べるためのツールだから許される設定**で、データをやり取りするプログラムでは使ってはいけません。
- `my-https-server.mjs` と `https-server.mjs` は `Strict-Transport-Security: max-age=300` を返します。ブラウザで開いた後、5分間は `http://localhost` の他のサーバを開けなくなることがあります（ブラウザの版によります）。そうなったら、Chrome の `chrome://net-internals/#hsts` の「Delete domain security policies」に `localhost` と入れて消します。
