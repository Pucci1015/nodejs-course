# 第10章 サンプル

`~/dev/ch10` にコピーしてから、`~/dev/ch10` で動かします（本文の「読み方」）。外部のパッケージは使わないので、`npm install` は不要です。

| ファイル | 内容 | ポート | 本文の節 |
| --- | --- | --- | --- |
| [mini-mpa.mjs](mini-mpa.mjs) | 本文で書く、いちばん小さな MPA のメモ帳の完成形（一覧・追加・PRG・エスケープ） | 8505 | 2, 7 |
| [mini-spa.mjs](mini-spa.mjs) | 本文で書く、いちばん小さな SPA のメモ帳の完成形（`fetch`・`createElement`・`preventDefault`） | 8506 | 3 |
| [todo-mpa.mjs](todo-mpa.mjs) | MPA 版のタスク管理。追加・完了・削除・1件の画面。JavaScript を使わない（**中身は読まなくてよい**） | 8500 | 2.4, 6, 7, 8 |
| [todo-spa.mjs](todo-spa.mjs) | SPA 版のタスク管理。REST の API と、クライアント側のルーティング（**中身は読まなくてよい**） | 8501 | 3.2, 5, 8 |
| [build-static.mjs](build-static.mjs) | SSG 版。すべてのページの HTML を先に作って、`ssg-tasks` フォルダに書き出す（**中身は読まなくてよい**） | （配信に 8502） | 4 |
| [tasks-store.mjs](tasks-store.mjs) | `todo-mpa.mjs`・`todo-spa.mjs`・`build-static.mjs` が共通で使う、メモリの中のタスクの保存場所（サーバを止めると元に戻る） | | |

## 動かし方

```sh
$ node samples/mini-mpa.mjs      # → http://localhost:8505/
$ node samples/mini-spa.mjs      # → http://localhost:8506/
$ node samples/todo-mpa.mjs      # → http://localhost:8500/
$ node samples/todo-spa.mjs      # → http://localhost:8501/

# SSG 版: 書き出してから、第1部 第4章の serve.mjs（~/dev/ch10 にコピーしたもの）で配信する → http://localhost:8502/
$ node samples/build-static.mjs
$ node serve.mjs ssg-tasks 8502
```

- ポートが違うので、どれも同時に起動できます。2つのタブで開き、DevTools の Network タブを見比べてください（本文8節）。
- `build-static.mjs` は、書き出し先が既にあると何もせずに終了します。作り直すときは、`ls ssg-tasks` で中身を確認してから `rm -r ssg-tasks` で消してください。

## SPA 版の API を curl で使う

```sh
$ curl -s http://localhost:8501/api/tasks
$ curl -si -X POST -H 'Content-Type: application/json' -d '{"title":"パン"}' http://localhost:8501/api/tasks
$ curl -si -X PATCH -H 'Content-Type: application/json' -d '{"done":true}' http://localhost:8501/api/tasks/1
$ curl -si -X DELETE http://localhost:8501/api/tasks/1
```

`-X` はメソッドを指定する、`-H` はヘッダを付ける、`-d` はボディを付ける、という意味です。curl で追加したタスクは、ブラウザで再読み込みすると表示されます（状態はサーバにあるため）。
