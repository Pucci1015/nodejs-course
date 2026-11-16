# 第40章 サンプル

## 本文の「手を動かす」で書くプログラムの完成形

| フォルダ・ファイル | 内容 | 本文の節 |
| --- | --- | --- |
| [hello/](hello/) | はじめての Vite。TypeScript・`zod`・CSS・JSON・画像の import、`.env`、プラグイン（`virtual:greeting`） | 2・3・4・8 |
| [hello/vite.config.ts](hello/vite.config.ts) | `virtual:greeting` を作るプラグイン | 8 |
| [tasks-app/](tasks-app/) | 第39章の画面を TypeScript と Vite で。プロキシ、`$` 関数、`import()` で分ける | 5・6・7 |
| [tasks-app/vite.config.ts](tasks-app/vite.config.ts) | `/api` を練習用の API（9500）に中継する | 5 |

## 動かし方

```sh
$ cd ~/dev/part08/ch40-build-tools/samples/hello
$ npx vite                 # http://localhost:5173/（Ctrl+C で止める）
$ npx tsc                  # 型を確かめる（エラーは出ない）

$ cd ../tasks-app          # 先に別のターミナルで cd ~/dev/part08 && npm run api
$ npx vite                 # http://localhost:5173/
$ npx vite build && npx vite preview   # http://localhost:4173/
```

- `samples/` の中の `tsconfig.json` は、`"extends": "../../../tsconfig.base.json"` です（本文で作る `hello/` は1つ浅いので `../../`）。
- `vite build` で作った `dist/` は、確かめたら消してかまいません（`rm -rf dist`）。
