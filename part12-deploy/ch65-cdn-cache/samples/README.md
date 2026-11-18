# 第65章 サンプル

本文の「手を動かす」で書く・動かすプログラムです。うまく動かないときは、自分で書いたものと比べてください。動かすときは、章のフォルダ（`~/dev/part12/ch65-cdn-cache`）で `node samples/○○.ts` と打ちます。

| ファイル | 本文の節 | ポート | 中身 |
| --- | --- | --- | --- |
| [cc.ts](cc.ts) | 2.2 | | `Cache-Control` の値を名前と値に分け、CDN が覚えてよい秒数を出す |
| [origin.ts](origin.ts) | 3・7・8 | 9857 | CDN の後ろに置くオリジン。パスごとに違う `Cache-Control`・`Cache-Tag`・`Vary` を返し、頼みが来るたびに1行出す。`PUT /api/tasks/:id` で題名を変えて CDN に消すよう頼む。`MISTAKE=1` で `/api/me` を間違えて public にする |
| [hash-name.ts](hash-name.ts) | 5.1 | | 中身の SHA-256 の先頭 8 文字を、ファイルの名前に入れる |
| [spa-server.ts](spa-server.ts) | 6.1 | 9856 | `dist/` を Express で配る。ハッシュ付きのファイルは 1 年、`index.html` は `no-cache`、画面の中の URL には `index.html`、無いファイルと API には 404 |
| [dist/](dist/) | 6.1 | | ビルドの結果のつもりのファイル（`index.html`、`assets/index-C4mP8sLa.js`・`index-B7xQ2k9d.css`、`robots.txt`）。名前のハッシュは、Vite が作ったような見本で、中身から計算したものではない |
| [tsconfig.json](tsconfig.json) | | | このフォルダを `npx tsc` で確かめる設定 |

練習用の CDN（9858）は、部の [../../tools/mini-cdn.ts](../../tools/mini-cdn.ts) です。`~/dev/part12` で `npm run cdn` と打って起動します。
