# todo-api（第37章 4・5・7節）

型の付いた、小さなタスクの API です。データはメモリに置きます（再起動すると消えます）。

```sh
$ cd ~/dev/part07/ch37-ts-node/todo-api    # 本文では、自分で作ったフォルダで動かす
$ npm start          # http://127.0.0.1:9477/api/tasks
$ npm run dev        # ファイルを書き換えるたびに動かし直す（node --watch）
$ npm run check      # typecheck（tsc）→ lint（ESLint）→ test（node --test）
```

| ファイル・フォルダ | 中身 |
| --- | --- |
| [package.json](package.json) | スクリプト（`dev`・`start`・`typecheck`・`lint`・`test`・`check`）。パッケージは第7部のフォルダのものを使う |
| [tsconfig.json](tsconfig.json) | `../../../tsconfig.base.json` を引き継ぎ、`src` と `test` を確かめる |
| [src/](src/) | アプリのコード |
| [test/](test/) | テスト |
