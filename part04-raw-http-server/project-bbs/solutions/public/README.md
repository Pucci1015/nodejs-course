# public

`/static/` で公開するファイルです（第19章の `serveStatic`）。

| ファイル | 中身 |
| --- | --- |
| [style.css](style.css) | 掲示板の見た目。本文の改行は `white-space: pre-wrap` でそのまま見せる |

この掲示板は JavaScript を使いません。そのため、`Content-Security-Policy` を `script-src 'none'` にできます。
