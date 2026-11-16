# samples/tasks-app — ch40-build-tools の「手を動かす」の完成形

動かし方は [../README.md](../README.md)（samples の README）にあります。

| ファイル・フォルダ | 中身 |
| --- | --- |
| [index.html](index.html) | 入り口の HTML。画面の土台の要素と、`src/main.ts` を読む `<script type="module">` |
| [src/](src/) | 画面のコード |
| [tsconfig.json](tsconfig.json) | 型の設定。部の直下の `tsconfig.base.json` を読む（`npx tsc` で確かめる） |
| [vite.config.ts](vite.config.ts) | 第40章 5節: Vite の設定。/api で始まるリクエストを、練習用の API に中継する（プロキシ） |
