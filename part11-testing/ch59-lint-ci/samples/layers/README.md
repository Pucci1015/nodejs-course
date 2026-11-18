# 第59章 2.4節の練習用のプロジェクト（samples/layers、始めの形）

場所によって ESLint の決まりを変える練習に使う、小さな JavaScript のプロジェクトです。本文 2.4節で、`~/dev/part11/ch59-lint-ci/layers/` にコピーしてから、[eslint.config.js](eslint.config.js) を書き直します。完成形は [../finished/layers/eslint.config.js](../finished/layers/eslint.config.js) です。

| フォルダ | 中身 | 決まり |
| --- | --- | --- |
| [src/](src/) | アプリのコード | `console.log` を使ってはいけない |
| [scripts/](scripts/) | 手で動かす道具 | `console.log` を使ってよい |
| [generated/](generated/) | 道具が作ったファイルの代わり | lint しない |
