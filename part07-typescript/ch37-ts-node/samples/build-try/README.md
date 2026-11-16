# build-try（第37章 1.3節）

tsc で TypeScript を JavaScript に変換（ビルド）して動かす、小さなプロジェクトです。

```sh
$ cd ~/dev/part07/ch37-ts-node/build-try    # 本文では、自分で作ったフォルダで動かす
$ npm run build      # src/*.ts → dist/*.js（と .js.map）
$ npm start          # node --enable-source-maps dist/main.js
```

| ファイル | 中身 |
| --- | --- |
| [tsconfig.json](tsconfig.json) | `noEmit: false`・`outDir`・`rootDir`・`rewriteRelativeImportExtensions`・`sourceMap` |
| [package.json](package.json) | `build` と `start` のスクリプト |
| [src/greet.ts](src/greet.ts)・[src/main.ts](src/main.ts) | 変換するプログラム |

`dist/` は `npm run build` で作られるフォルダです（教材には入っていません）。
