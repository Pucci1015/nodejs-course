# 第4章 サンプル

本文の「読み方」のとおり、`~/dev/ch04` にコピーしてから使います。コマンドは、すべて `~/dev/ch04` で打ちます。

| ファイル | 内容 | 本文の節 |
| --- | --- | --- |
| [vscode-user-settings.json](vscode-user-settings.json) | ユーザー設定（`~/Library/Application Support/Code/User/settings.json`）の例 | 3 |
| [vscode-workspace-settings.json](vscode-workspace-settings.json) | ワークスペース設定（プロジェクトの `.vscode/settings.json`）の例 | 3.1 |
| [extensions.json](extensions.json) | 推奨の拡張機能（プロジェクトの `.vscode/extensions.json`）の例 | 4.1 |
| [practice-edit.js](practice-edit.js) | 名前の変更・複数カーソル・書き換えの候補を試すファイル | 5.5 |
| [practice-edit-done.js](practice-edit-done.js) | `practice-edit.js` を書き換えた後の形（見比べる用） | 5.5 |
| [editorconfig.sample](editorconfig.sample) | `.editorconfig` の例 | 7.1 |
| [debug-demo.mjs](debug-demo.mjs) | デバッガの操作を練習するための小さなプログラム | 9.1, 10 |
| [launch.json](launch.json) | デバッグの起動設定（プロジェクトの `.vscode/launch.json`）の例 | 10.4 |
| [serve.mjs](serve.mjs) | 指定したフォルダのファイルを配信する小さな Web サーバ（ポート 8000） | 11 |
| [demo.html](demo.html) / [demo.js](demo.js) | Chrome DevTools の練習用のページ | 11.1〜11.3 |

## 動かし方

```sh
$ cd ~/dev/ch04

# 編集の練習（5.5節）
$ node samples/practice-edit.js

# デバッガの練習（VS Code の JavaScript Debug Terminal で実行すると、ブレークポイントで止まる。10.2節）
$ node samples/debug-demo.mjs 3

# ブラウザの練習（11.1節）
$ node samples/serve.mjs samples
# → ブラウザで http://localhost:8000/demo.html を開き、⌘ + ⌥ + I で DevTools を開く。Ctrl + C で止める
```

`launch.json` は、`~/dev/ch04/.vscode/launch.json` に自分で書きます（10.4節）。このサンプルは、ほかの書き方の例として読みます。

## 読みどころ

- VS Code の設定ファイル（`.json`）にはコメントを書いていますが、これは VS Code が JSONC という「コメントを書ける JSON」として読むからです。`package.json` など普通の JSON ファイルには書けません。
- `debug-demo.mjs` の先頭のコメントに、8つの練習の手順があります。行(A)〜(C) の印は、コードの中のコメントで示しています。
- `serve.mjs` は約50行の Web サーバです。今は中身を読まなくてかまいません。`../` を使ってフォルダの外のファイルを読まれないようにする対策（パストラバーサル対策）など、第4部で学ぶ内容が入っています。`127.0.0.1` で待ち受けているので、同じネットワークの他の機器からは接続できません。
- `demo.js` では、タスク名を `innerHTML` ではなく `textContent` で表示しています。`innerHTML` を使うと、タスク名に HTML のタグを含む文字列を入れたときに、それが HTML として解釈されてしまいます。悪意のある人が入れた文字列で、ページの上で勝手にスクリプトが動くこともあります（XSS。第4部・第10部で、自分のサーバを守る側として学びます）。
