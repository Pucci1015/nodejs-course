# 練習問題2 のフォルダ（exercises/config-practice）

練習問題2で、[eslint.config.js](eslint.config.js) を書きます。`src/`・`scripts/`・`generated/` の `.js` は lint される側のファイルで、書き換えません。確かめるのは1つ上の `exercises` で `node --test config-practice.test.ts` です。

| フォルダ | 中身 |
| --- | --- |
| [src/](src/) | アプリのコード（`console.log` を使ってはいけない） |
| [scripts/](scripts/) | 手で動かす道具（`console.log` を使ってよい） |
| [generated/](generated/) | 道具が作ったファイル（lint しない） |
