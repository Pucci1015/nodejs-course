# cjs

CommonJS の `require` と `module.exports` を確かめるサンプルです（本文3節）。

| ファイル | 内容 |
| --- | --- |
| [counter.cjs](counter.cjs) | `module.exports` に、その時点の値と関数を入れる |
| [main.cjs](main.cjs) | `require` のキャッシュ、値のコピー、モジュールを包む関数の引数、`__filename`・`__dirname` |

```sh
$ node main.cjs
```
