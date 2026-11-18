# 第58章 練習用の画面（samples/app）

本文で確かめる、小さなタスクの画面（React + TanStack Query）と API（Express、メモリ）です。テストは入っていません。本文1.1節で `web/` にコピーし、`web/` の中でテストを書きます。

```sh
$ cd ~/dev/part11/ch58-frontend-testing
$ cp -R samples/app web
$ cd web
$ node api-server.ts       # API（127.0.0.1:9727）。別のターミナルで ↓
$ npx vite                 # 画面（http://127.0.0.1:9728/）
```

ファイルの一覧は [../README.md](../README.md) にあります。
