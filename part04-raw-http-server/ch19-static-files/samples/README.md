# 第19章 サンプル

| ファイル | 内容 | 本文の節 | ポート |
| --- | --- | --- | --- |
| [naive-static.mjs](naive-static.mjs) | よく見る、危ない静的ファイルのサーバ。`public` の外が読めてしまう | 2 | 9190 |
| [mime.mjs](mime.mjs) | 拡張子から Content-Type を決める `contentType`、圧縮してよい種類か調べる `isCompressible`（練習問題と模範解答でも使う） | 3 | — |
| [traversal-demo.mjs](traversal-demo.mjs) | URL のパスを `path.join` でつなぐと、どこを指すかの表 | 4 | — |
| [static-server.mjs](static-server.mjs) | 安全に気をつけた、小さな静的ファイルのサーバ（Content-Type、外に出ない、`.` で始まる名前、フォルダの案内、Stream） | 3〜5 | 9191 |
| [cache-demo.mjs](cache-demo.mjs) | `Cache-Control` の4つの値と、ETag・Last-Modified による 304 | 6 | 9192 |
| [range-demo.mjs](range-demo.mjs) | Range で一部だけを返す（206 と 416） | 7 | 9193 |
| [gzip-demo.mjs](gzip-demo.mjs) | `Accept-Encoding` を見て gzip・Brotli で圧縮して返す。`Vary` | 8 | 9194 |
| [public/](public/) | 公開するフォルダの例（`index.html`、`style.css`、`app.js`、`img/logo.svg`、`hello.txt`、`data.json`、`docs/`、`.private-note.txt`） | — | — |
| [outside.txt](outside.txt) | `public` の**外**に置いた練習用のファイル。これが見えたら、外を読めてしまっている | 2, 4 | — |

外部のパッケージは使わないので、`npm install` は不要です。

```sh
$ node naive-static.mjs          # curl --path-as-is 'http://127.0.0.1:9190/..%2Foutside.txt'
$ node traversal-demo.mjs
$ node static-server.mjs         # ブラウザで http://127.0.0.1:9191/
$ node cache-demo.mjs            # ブラウザで http://127.0.0.1:9192/ を開き、DevTools の Network を見る
$ node range-demo.mjs            # curl -i -r 0-8 http://127.0.0.1:9193/hello.txt
$ node gzip-demo.mjs             # curl -s --compressed http://127.0.0.1:9194/big.txt | head
```

- `public/.private-note.txt` と `outside.txt` の中身は、練習用の文章です。秘密は入っていません
- `naive-static.mjs` で外のファイルを読む確かめ方は、**自分の Mac の中で動かしている、自分のサーバ**だけに使ってください
- `.` で始まるファイルは、Finder では見えません。ターミナルで `ls -a public` とすると見えます
