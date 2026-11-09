# interop

ES Modules と CommonJS を混ぜて使うサンプルです（本文4節）。

| ファイル | 内容 |
| --- | --- |
| [legacy.cjs](legacy.cjs) | CommonJS のライブラリ。名前付きで import できる export と、できない export |
| [modern.mjs](modern.mjs) | ES Modules のライブラリ |
| [modern-tla.mjs](modern-tla.mjs) | トップレベル await を使う ES Modules（require できない） |
| [data.json](data.json) | `createRequire` で読む JSON |
| [from-esm.mjs](from-esm.mjs) | ES Modules から `legacy.cjs` を読む |
| [from-cjs.cjs](from-cjs.cjs) | CommonJS から `modern.mjs`・`modern-tla.mjs` を読む |

```sh
$ node from-esm.mjs
$ node from-cjs.cjs
```
