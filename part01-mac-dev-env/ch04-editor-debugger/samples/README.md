# 第4章 サンプル

| ファイル | 内容 | 本文の節 |
| --- | --- | --- |
| [vscode-user-settings.json](vscode-user-settings.json) | ユーザー設定（`~/Library/Application Support/Code/User/settings.json`）の例 | 3 |
| [vscode-workspace-settings.json](vscode-workspace-settings.json) | ワークスペース設定（プロジェクトの `.vscode/settings.json`）の例 | 3 |
| [extensions.json](extensions.json) | 推奨の拡張機能（プロジェクトの `.vscode/extensions.json`）の例 | 4 |
| [editorconfig.sample](editorconfig.sample) | `.editorconfig` の例 | 7 |
| [launch.json](launch.json) | デバッグの起動設定（プロジェクトの `.vscode/launch.json`）の例 | 10.4 |
| [debug-demo.mjs](debug-demo.mjs) | デバッガの操作を順に練習するための小さなプログラム | 10 |
| [serve.mjs](serve.mjs) | 指定したフォルダのファイルを配信する小さな Web サーバ | 11.3 |
| [demo.html](demo.html) / [demo.js](demo.js) | Chrome DevTools の練習用のページ | 11 |

## 動かし方

```sh
# デバッガの練習（VS Code の JavaScript Debug Terminal で実行すると、ブレークポイントで止まる）
$ node debug-demo.mjs 3

# ブラウザの練習
$ node serve.mjs .
# → ブラウザで http://localhost:8000/demo.html を開き、⌘ + ⌥ + I で DevTools を開く
```

`launch.json` を試すには、このフォルダを VS Code で開き（`code .`）、`.vscode` フォルダを作ってそこにコピーします。

```sh
$ mkdir -p .vscode && cp launch.json .vscode/
$ code .
```

## 読みどころ

- VS Code の設定ファイル（`.json`）にはコメントを書いていますが、これは VS Code が JSONC という「コメントを書ける JSON」として読むからです。`package.json` など普通の JSON ファイルには書けません。
- `debug-demo.mjs` の先頭のコメントに、8つの練習の手順があります。上から順に試してください。行(A)〜(C) の印は、コードの中のコメントで示しています。
- `serve.mjs` は約50行の Web サーバです。今は中身を全部理解する必要はありませんが、`../` を使ってフォルダの外のファイルを読まれないようにする対策（パストラバーサル対策）など、第4部で学ぶ内容が入っています。`127.0.0.1` で待ち受けているので、同じネットワークの他の機器からは接続できません。
- `demo.js` では、タスク名を `innerHTML` ではなく `textContent` で表示しています。`innerHTML` を使うと、タスク名に HTML のタグを含む文字列を入れたときに、それが HTML として解釈されてしまいます。悪意のある人が入れた文字列で、ページの上で勝手にスクリプトが動くこともあります（XSS。第4部・第10部で、自分のサーバを守る側として学びます）。
