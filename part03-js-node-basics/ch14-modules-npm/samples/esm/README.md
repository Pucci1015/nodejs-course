# esm

ES Modules の `export` と `import` を確かめるサンプルです（本文2節）。

| ファイル | 内容 |
| --- | --- |
| [counter.mjs](counter.mjs) | 名前付きの export、まとめての export と `as`、default export |
| [main.mjs](main.mjs) | いろいろな import、ライブバインディング、`import.meta`、動的 import とトップレベル await |

```sh
$ node main.mjs
$ node main.mjs os     # 動的 import で node:os を読む
```
