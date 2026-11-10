# hello-cli

`package.json` の `bin` と `npm link` を試すための、小さな CLI のパッケージです（本文2節）。依存パッケージは無いので、`npm install` は不要です。

```sh
$ node bin/hello.mjs alice          # node で実行する
$ chmod +x bin/hello.mjs            # 実行できる印を付ける（付いていなければ）
$ ./bin/hello.mjs alice              # シバンで実行する
$ npm link                          # どこからでも hello-cli で実行できるようにする
$ hello-cli alice
$ npm unlink -g hello-cli           # 元に戻す
```
