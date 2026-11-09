# 第9章 サンプル

本文の「手を動かす」で書くものの完成形と、実験用のサーバです。`~/dev/ch09/` にコピーしてから、`~/dev/ch09` で `node samples/ファイル名` のように動かします。

| ファイル | 内容 | ポート | 本文の節 |
| --- | --- | --- | --- |
| [url-parts.mjs](url-parts.mjs) | URL を部品に分けて表示する（完成形） | — | 1.1 |
| [my-front.mjs](my-front.mjs) | 別のオリジンの API を fetch する画面（完成形） | 8310 | 5.1, 5.2 |
| [my-api.mjs](my-api.mjs) | CORS とプリフライトに対応した小さな API（完成形） | 8311 | 5.1, 5.2 |
| [url-demo.mjs](url-demo.mjs) | URL をもっと詳しく分けて表示する。基準の URL を渡すと、相対 URL を解決する（中身は読まなくてよい） | — | 1 |
| [render-lab-server.mjs](render-lab-server.mjs) | わざと遅れて届く JavaScript と CSS で、`defer`・`async`・`type="module"` などの違いを確かめるサーバ（中身は読まなくてよい） | 8200 | 3 |
| [cors-lab.mjs](cors-lab.mjs) | 画面のサーバと API のサーバを同時に起動し、同一オリジンポリシーと CORS を10通りの `fetch` で確かめる（中身は読まなくてよい） | 8300、8301 | 5 |

外部のパッケージは使わないので、`npm install` は不要です。

## 動かし方

```sh
$ cd ~/dev/ch09

# URL
$ node samples/url-parts.mjs 'https://example.com:8443/a/b?q=1#top'
$ node samples/url-demo.mjs 'https://example.com:8443/a/b?q=1#top'
$ node samples/url-demo.mjs '../img/logo.png' 'https://example.com/docs/guide/index.html'

# 表示の実験 → ブラウザで http://localhost:8200/ を開く
$ node samples/render-lab-server.mjs

# CORS の実験 → ブラウザで http://localhost:8300/ を開き、DevTools の Console と Network を開いてボタンを押す
$ node samples/my-api.mjs                 # ターミナル1
$ node samples/my-front.mjs               # ターミナル2 → http://localhost:8310/
$ node samples/cors-lab.mjs               # → http://localhost:8300/
```

## render-lab-server.mjs のページ

| パス | 内容 |
| --- | --- |
| `/blocking` | `<head>` に普通の `<script src>`（1.5秒遅れ） |
| `/body-end` | `</body>` の直前に普通の `<script src>` |
| `/defer`、`/async`、`/module` | `<head>` に `defer`・`async`・`type="module"` の script |
| `/css` | `<head>` に1.5秒遅れて届く CSS |
| `/order` | すべてをまぜたページ（練習問題4） |

どのページにも、時刻付きのログが表示されます（Console にも出ます）。`★` は「画面に最初に何かが表示された時刻」です。

## cors-lab.mjs の注意

- 画面（`http://localhost:8300`）と API（`http://localhost:8301`）は、**ポートが違うので別のオリジン**です。
- Cookie の実験（8〜10）の前に、画面のリンクから API の `/api/login` を開いて、API のオリジンに Cookie を作ってください。
- API のサーバのターミナルには、ブラウザに止められたリクエストも表示されます。「失敗」と表示された実験でも、リクエストがサーバに届いているかどうかを必ず確かめてください（本文5.1節）。
