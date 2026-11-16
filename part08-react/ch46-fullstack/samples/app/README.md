# samples/app — ch46-fullstack の「手を動かす」の完成形

動かし方は [../README.md](../README.md)（samples の README）にあります。

| ファイル・フォルダ | 中身 |
| --- | --- |
| [index.html](index.html) | 入り口の HTML。`<div id="root">` と、`src/entry-client.tsx` を読む `<script type="module">`。サーバが中身を入れる目印（`<!--app-html-->` など）も持つ |
| [server.ts](server.ts) | 第46章 2節: SSR のサーバ。ページを開くたびに、API からデータを読み、React で HTML を作って返す |
| [src/](src/) | 画面のコード |
| [tsconfig.json](tsconfig.json) | 型の設定。部の直下の `tsconfig.base.json` を読む（`npx tsc` で確かめる） |
| [vite.config.ts](vite.config.ts) | 第46章 2節: 画面用（dist/client）と、サーバ用（dist/server）の2回ビルドする |
