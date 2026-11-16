# 第39章 サンプル

## 本文の「手を動かす」で書くプログラムの完成形

| ファイル | 内容 | 本文の節 |
| --- | --- | --- |
| [dom.html](dom.html)、[dom.js](dom.js) | データから `<li>` を作る。`textContent` は文字として入れる | 2 |
| [app.html](app.html)、[app.js](app.js) | 練習用の API とつなぐ画面。一覧・読み込み中と失敗・フォーム・`If-Match`・SSE | 3〜7 |

## 動かし方

ターミナルを2つ使います。

```sh
$ cd ~/dev/part08 && npm run api                    # 1つ目: 練習用の API（9500）
$ cd ~/dev/part08/ch39-vanilla-api/samples && node ../../tools/serve.ts   # 2つ目: ファイルのサーバ（5173）
```

ブラウザで http://localhost:5173/dom.html と http://localhost:5173/app.html を開きます。
