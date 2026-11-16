# samples/app — ch44-routing-state の「手を動かす」の完成形

動かし方は [../README.md](../README.md)（samples の README）にあります。

| ファイル・フォルダ | 中身 |
| --- | --- |
| [index.html](index.html) | 入り口の HTML。`<div id="root">` と、`src/` の入り口を読む `<script type="module">` |
| [src/](src/) | 画面のコード |
| [tsconfig.json](tsconfig.json) | 型の設定。部の直下の `tsconfig.base.json` を読む（`npx tsc` で確かめる） |
| [vite.config.ts](vite.config.ts) | 第43章と同じ設定（React のプラグインと、/api のプロキシ） |
