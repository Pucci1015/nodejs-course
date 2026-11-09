# 第7章 サンプル

本文の「手を動かす」で書くものの完成形と、実験用のサーバです。`~/dev/ch07/` にコピーしてから、`~/dev/ch07` で `node samples/ファイル名` のように動かします。

| ファイル | 内容 | ポート | 本文の節 |
| --- | --- | --- | --- |
| [charset-server.mjs](charset-server.mjs) | charset の有無で文字化けを比べる（完成形） | 8101 | 2.3 |
| [cookie-server.mjs](cookie-server.mjs) | 訪問回数を Cookie で数える（完成形） | 8102 | 3.2 |
| [redirect-server.mjs](redirect-server.mjs) | 301 と、フォームの後の 303 を返す（完成形） | 8103 | 4.1 |
| [cache-server.mjs](cache-server.mjs) | `max-age` の `/time` と、ETag で 304 を返す `/news`（完成形） | 8104 | 5.2, 5.3 |
| [gzip-server.mjs](gzip-server.mjs) | `Accept-Encoding` を見て gzip で返す（完成形） | 8105 | 6.1 |
| [sum.mjs](sum.mjs)、[sum.test.mjs](sum.test.mjs) | `node --test` の練習 | — | 8 |
| [lab-server.mjs](lab-server.mjs) | この章のすべての実験ができるサーバ。`http://localhost:8100/` に実験の一覧がある（中身は読まなくてよい） | 8100 | 2〜7 |
| [mojibake-demo.mjs](mojibake-demo.mjs) | 文字列を UTF-8 と Shift_JIS のバイト列にし、いろいろな文字コードで読んで文字化けを再現する（中身は読まなくてよい） | — | 2.2 |
| [sjis.mjs](sjis.mjs) | 文字列を Shift_JIS のバイト列にする関数（上の2つが使う。中身は読まなくてよい） | — | 2.2 |

外部のパッケージは使わないので、`npm install` は不要です。

## lab-server.mjs のパス

| パス | 実験 | 本文の節 |
| --- | --- | --- |
| `/charset/utf8`、`/charset/sjis` など7種類 | `Content-Type` の charset・`<meta charset>`・中身の文字コードの組み合わせ | 2.3 |
| `/cookie`、`/cookie/clear` | 訪問回数を Cookie で数える / Cookie を消す | 3 |
| `/redirect/301`〜`/redirect/308` | `/echo` へのリダイレクト（GET でも POST でも） | 4 |
| `/echo` | 届いたメソッドとボディを表示する | 4 |
| `/cache/max-age`、`/cache/no-store` | `Cache-Control` の違い | 5.2 |
| `/cache/etag` | ETag と 304（30秒ごとに中身が変わる） | 5.3 |
| `/cache/last-modified` | Last-Modified と 304 | 5.3 |
| `/compress` | `Accept-Encoding` に応じて br・gzip で圧縮する（約37KB の JSON） | 6 |
| `/greet` | `Accept` と `Accept-Language` に応じて、JSON か HTML か、日本語か英語かを変える | 7 |

## 動かし方

```sh
$ cd ~/dev/ch07
$ node samples/lab-server.mjs               # ブラウザで http://localhost:8100/ を開く

# curl での例
$ curl -c cookies.txt -b cookies.txt http://localhost:8100/cookie
$ curl -s -L -d 'memo=test' http://localhost:8100/redirect/307
$ curl -si -H 'If-None-Match: "v412"' http://localhost:8100/cache/etag     # 値は curl -si で確かめてから
$ curl -s -o /dev/null -H 'Accept-Encoding: gzip' -w '%{size_download}\n' http://localhost:8100/compress
$ curl -s -H 'Accept-Language: en' -H 'Accept: application/json' http://localhost:8100/greet

$ node samples/mojibake-demo.mjs ありがとう

$ cd samples && node --test sum.test.mjs
```

## 注意

- `sjis.mjs` は、外部のパッケージを使わずに文字化けを実験するためのものです。Shift_JIS の表を、`TextDecoder` で全部読んでみることで逆向きに作っています。実際に Shift_JIS のファイルを書く必要があるときは、iconv-lite などのパッケージを使います。
- `lab-server.mjs` の Cookie は `HttpOnly` なので、ブラウザの Console で `document.cookie` を実行しても見えません。DevTools の Application タブ → Cookies で確かめます。
- キャッシュの実験では、DevTools の **Disable cache** を外しておきます。
