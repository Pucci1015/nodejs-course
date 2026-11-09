# src/lib — Express に頼らない部品

どれも、前の章の練習問題の模範解答のコピーです。Express の `req`・`res` を受け取らないので、ほかのフレームワーク（第28章）でも、そのまま使えます。

| ファイル | 元 | 中身 |
| --- | --- | --- |
| [cursor.mjs](cursor.mjs) | 第25章 練習問題3 | `paginate`。カーソルでページを分ける。**`null` を後ろに並べるように変えた** |
| [signed.mjs](signed.mjs) | 第22章 練習問題3 | `signJson`・`unsignJson`。カーソルを作り変えられないようにする |
| [preconditions.mjs](preconditions.mjs) | 第25章 練習問題6 | `evaluatePreconditions`。`If-Match`・`If-None-Match` を確かめる |
| [sse-format.mjs](sse-format.mjs) | 第27章 練習問題2 | `formatEvent` など。SSE のイベントを書く |
| [event-hub.mjs](event-hub.mjs) | 第27章 練習問題3 | `createEventHub`・`sseRoute`。**止めるときに閉じる `closeAll` を足した**（`sseRoute` だけは Express のハンドラ） |
