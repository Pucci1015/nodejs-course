# resolve

モジュールの名前が、どのファイルになるかを確かめるサンプルです（本文5節）。

| ファイル・フォルダ | 内容 |
| --- | --- |
| [package.json](package.json) | `"imports"` で `#config` という別名を付けている |
| [app.mjs](app.mjs) | パッケージ名・サブパス・`#config` を import し、`import.meta.resolve` で行き先を表示する |
| [src/](src/) | `#config` が指すファイル |
| [node_modules/](node_modules/) | 手で書いた小さなパッケージ `tiny-lib`（npm install したものではない） |

```sh
$ node app.mjs
```
