# 第14章 サンプル

**本文で書くプログラムの完成形**

| フォルダ | 内容 | 実行のしかた | 本文の節 |
| --- | --- | --- | --- |
| [try/](try/) | `greet.mjs`・`use-greet.mjs`（ES Modules）、`greet.cjs`・`use-greet.cjs`（CommonJS）、`mix.mjs`（ES Modules から CommonJS を読む） | `node samples/try/use-greet.mjs` など | 2, 3, 4.2 |
| [my-app/](my-app/) | `package.json` を書き、ms を入れて使う小さなアプリ | `cd samples/my-app && npm install && npm start` | 6, 7, 10 |

`my-app` は `npm install` でインターネットから ms を入れます。そのほかのサンプルは、外部のパッケージを使いません。

**動かして結果を見るだけのプログラム（中身は読まなくてよい）**

どのサンプルも、そのフォルダに `cd` してから実行します。`npm install` は不要です（`resolve/node_modules` と `scripts-demo/node_modules` は、説明のために手で置いたものです）。

| フォルダ | 内容 | 実行のしかた | 本文の節 |
| --- | --- | --- | --- |
| [esm/](esm/) | `export`・`import` のいろいろ、ライブバインディング、`import.meta`、動的 import | `cd esm && node main.mjs` | 2 |
| [cjs/](cjs/) | `require`・`module.exports`、値のコピー、モジュールを包む関数、`require.cache` | `cd cjs && node main.cjs` | 3 |
| [interop/](interop/) | ES Modules から CommonJS を読む、CommonJS から ES Modules を読む（require(esm)） | `cd interop && node from-esm.mjs`、`node from-cjs.cjs` | 4 |
| [resolve/](resolve/) | パッケージ名の解決、`exports` の条件、`exports` に無いファイル、`imports`（`#config`） | `cd resolve && node app.mjs` | 5 |
| [scripts-demo/](scripts-demo/) | `npm run`、`pre`・`post`、`--` で引数を渡す、`PATH` と `node_modules/.bin`、環境変数 | `cd scripts-demo && npm run build` など | 10 |

ポートを使うサンプルはありません。

`scripts-demo/node_modules/.bin/my-tool` は、実行できる印（実行権限）が必要です。`npm run tool` で「Permission denied」と出たら、次のコマンドで付けてください。

```sh
$ chmod +x scripts-demo/node_modules/.bin/my-tool
```
