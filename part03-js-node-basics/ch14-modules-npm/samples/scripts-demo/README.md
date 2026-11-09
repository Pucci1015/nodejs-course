# scripts-demo

`npm run` の動きを確かめるサンプルです（本文10節）。依存パッケージは無いので、`npm install` は不要です。

```sh
$ npm run hello                    # npm が渡す環境変数
$ npm run build                    # prebuild → build → postbuild
$ npm run args -- --name 山田 -v   # -- の後ろはスクリプトに渡される
$ npm run path                     # PATH の先頭に node_modules/.bin が足される
$ npm run tool                     # node_modules/.bin/my-tool を名前だけで呼ぶ
$ npm run fail; echo $?            # スクリプトの終了コードが npm の終了コードになる
```

| ファイル | 内容 |
| --- | --- |
| [package.json](package.json) | scripts の定義 |
| [show-env.mjs](show-env.mjs) | `npm_` で始まる環境変数などを表示する |
| [show-args.mjs](show-args.mjs) | 受け取った引数を表示する |
| `node_modules/.bin/my-tool` | パッケージが入れるコマンドの代わりに、手で置いたもの |
