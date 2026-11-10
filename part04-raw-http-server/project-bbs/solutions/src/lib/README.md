# src/lib

第17〜22章（と第3部）の練習問題の模範解答を、そのままコピーしたものです。変えたのは、先頭の `import` のパスだけです（`'../../ch17-minimal-server/solutions/app.mjs'` → `'./http-app.mjs'` など）。中の説明のコメントは、元の章のものです。

| ファイル | 元 | 使っているもの |
| --- | --- | --- |
| [http-app.mjs](http-app.mjs) | 第17章 `solutions/app.mjs` | `createApp`・`HttpError` |
| [send.mjs](send.mjs) | 第17章 `solutions/send.mjs` | `sendHtml`・`sendJson`・`redirect` |
| [router.mjs](router.mjs)、[pattern.mjs](pattern.mjs) | 第18章 `solutions/` | `Router` |
| [static.mjs](static.mjs)、[range.mjs](range.mjs)、[safe-path.mjs](safe-path.mjs)、[mime.mjs](mime.mjs) | 第19章 `solutions/`・`samples/mime.mjs` | `serveStatic` |
| [body.mjs](body.mjs) | 第20章 `solutions/body.mjs` | `readForm` |
| [mini-html.mjs](mini-html.mjs) | 第21章 `samples/mini-html.mjs` | `html` |
| [html-helpers.mjs](html-helpers.mjs) | 第21章 `solutions/html-helpers.mjs` | `attrs`・`queryString` |
| [pagination.mjs](pagination.mjs) | 第21章 `solutions/views.mjs` の後半 | `paginate`・`pagination` |
| [cookie.mjs](cookie.mjs) | 第22章 `solutions/cookie.mjs` | `parseCookies`・`serializeCookie`・`clearCookie`（session.mjs が使う） |
| [session.mjs](session.mjs) | 第22章 `solutions/session.mjs` | `SessionStore`・`withSession`・`newSessionId` |
| [atomic.mjs](atomic.mjs) | 第3部の成果物 `src/atomic.mjs`（第15章 練習問題5） | `writeFileAtomic` |
