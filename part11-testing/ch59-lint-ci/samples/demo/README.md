# 第59章 練習用の小さなプロジェクト（samples/demo、始めの形）

本文2〜6節で、ESLint・Prettier・npm scripts を足していく、始めの形です。本文2.1節で `demo/` にコピーし、`demo/` の中で直します。わざと ESLint の指摘が出るように書いてあります。完成形は [../finished/](../finished/) です。

| ファイル | 本文の節 | 中身 |
| --- | --- | --- |
| [eslint.config.js](eslint.config.js) | 2 | いちばん小さな設定（おすすめのルールだけ） |
| [tsconfig.json](tsconfig.json) | 2 | TypeScript の設定（コピーしても動くように、`extends` を使わずに書いた） |
| [orders.ts](orders.ts) | 2 | 注文の合計。ESLint の指摘が6個出る |
| [orders.test.ts](orders.test.ts) | 4 | テスト。`test.only` が残っている |
| [slug.ts](slug.ts) | 3 | ReDoS になる正規表現（第3部 第13章） |
| [messy.ts](messy.ts) | 5 | 書き方のそろっていないファイル |
