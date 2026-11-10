# 第4部の成果物 完成例（`bbs` パッケージ）

要件とヒントは [../README.md](../README.md) にあります。

| ファイル・フォルダ | 中身 |
| --- | --- |
| [package.json](package.json) | `npm start`・`npm test`。`dependencies` は空 |
| [mise.toml](mise.toml) | Node.js のバージョン（`mise use node@24` で作られるもの） |
| [.gitignore](.gitignore) | `data/`（掲示板のデータ）をコミットしない |
| [src/](src/) | 掲示板のコード |
| [public/](public/) | CSS |
| [test/](test/) | 外から HTTP で確かめるテスト |

## 動かし方

`~/dev/part04` の中にデータを作らないように（見本のまま残しておくため）、別のフォルダ `~/dev/bbs-example` にコピーしてから動かします。`cp -R` は、フォルダを中身ごとコピーします。

```sh
$ cp -R ~/dev/part04/project-bbs/solutions ~/dev/bbs-example
$ cd ~/dev/bbs-example
$ npm start          # ブラウザで http://127.0.0.1:9230/
$ npm test           # 17 個のテスト（127.0.0.1:9231 を使う。データは一時フォルダ）
```

`npm install` は不要です（外部のパッケージを使わないため）。

## 作りの要点

- **部品の組み立て**: `server.mjs` が `Store`・`SessionStore` を作り、`createBbsApp` に渡します。`createBbsApp` は `withSession(createApp(handler))` を返します。外側から順に、セッションの読み込み → リクエスト ID とログとエラー → セキュリティのヘッダ → Router です
- **見るだけの客にはセッションを作らない**: `csrfToken(req)` は、フォームを表示するときだけ呼びます。`withSession` は、中身の無いセッションを保存しません
- **書き込みの順番**: `Store.#save` は、書き込みを Promise の鎖でつなぎます（要件の3.3節）
- **エラーの画面**: `handler` の `try` で `HttpError` を HTML の画面にし、401 は `/login` へ送ります。`/api/` と `/static/` は `createApp` の JSON のままです。413 も JSON のままにしています（本文を読み切らずに返すので、画面を作る手間をかけない）
- **認可**: 投稿の削除は、`post.userId !== user.id` なら 403

## テストが確かめないこと

- 2つのリクエストが同時に書き込んだときに、片方が消えないこと（3.3節。わざと同時に送るテストは、タイミングに左右されて不安定になりやすいので入れていません）
- 見た目（CSS）。Chromium で開いて確かめた
