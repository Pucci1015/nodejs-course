# lib — 前の章で作った部品のコピー

第5部では、Express の動きを「第4部で自分で作った部品」と比べながら学びます。そのために、第4部の模範解答のうち、比べるときに使うものをここにコピーしました。
`setup-part05.sh` は第5部のフォルダだけを `~/dev/part05` にコピーするので、第4部のフォルダを相対パスで `import` すると見つかりません。そのため、ここに置いています。

変えたのは、先頭の `import` のパスだけです（`'../samples/mini-html.mjs'` → `'./mini-html.mjs'` など）。中の説明のコメントは、元の章のものです。

| ファイル | 元 | 第5部で使うところ |
| --- | --- | --- |
| [http-app.mjs](http-app.mjs) | 第17章 `solutions/app.mjs` | `createApp`・`HttpError`（第23章 練習問題5で Express と比べる） |
| [send.mjs](send.mjs) | 第17章 `solutions/send.mjs` | `sendJson` など |
| [router.mjs](router.mjs)、[pattern.mjs](pattern.mjs) | 第18章 `solutions/` | `Router`（第23章 3節と練習問題5で Express と比べる） |
| [body.mjs](body.mjs) | 第20章 `solutions/body.mjs` | `readJson`・`readForm`（第23章 5節で `express.json()` と比べる） |
| [mini-html.mjs](mini-html.mjs) | 第21章 `samples/mini-html.mjs` | `html` タグ・`escapeHtml` |
| [template.mjs](template.mjs) | 第21章 `solutions/template.mjs` | 小さなテンプレートエンジン `compile`（第23章 7節と練習問題4で、Express のビューエンジンにする） |
| [signed.mjs](signed.mjs) | 第22章 `solutions/signed.mjs` | `sign`・`unsign`（第25章 練習問題3で、ページ分けのカーソルに署名する） |
| [problem.mjs](problem.mjs) | 第5部 第25章 `solutions/problem.mjs` | `HttpProblem`・`notFound`・`problemHandler`（第26章から後で、エラーを problem+json にする） |

`problem.mjs` だけは第5部の中の解答で、第26章から後の章が、同じものを使えるようにここに置きました。

ここのファイルは書き換えないでください。自分の第4部の解答を使いたいときは、使う側の `import` のパスを書き換えます。
