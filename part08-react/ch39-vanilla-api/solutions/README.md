# 第39章 模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。自分で解いてから読んでください。

| 問題 | ファイル | 確かめ方（`exercises/` で） |
| --- | --- | --- |
| 1 | [task-item.js](task-item.js) | `MODULE=../solutions/task-item.js npx vitest run task-item.test.js` |
| 2 | [task-list.js](task-list.js) | `MODULE=../solutions/task-list.js npx vitest run task-list.test.js` |
| 3 | [api.js](api.js) | `MODULE=../solutions/api.js npx vitest run api.test.js` |
| 4 | この README の下 | — |
| 5 | [form.js](form.js) | `MODULE=../solutions/form.js npx vitest run form.test.js` |
| 6 | [view.js](view.js) | `MODULE=../solutions/view.js npx vitest run view.test.js` |
| 7 | [store.js](store.js) | `MODULE=../solutions/store.js npx vitest run store.test.js` |
| 8 | [live.js](live.js) | `MODULE=../solutions/live.js npx vitest run live.test.js` |

## 問題1〜3 のポイント

- 問題1: `textContent` で入れれば、`<b>` は文字のままです。`innerHTML` で入れると、テストの「`li.querySelector('b')` が `null`」が失敗します。
- 問題2: 「置き換える」は `replaceChildren(...)` の1回です。`ul.innerHTML = ''` で消してから `append` しても動きますが、`replaceChildren` なら1行です。
- 問題3: `fetch` を引数で受け取ると、テストで偽物に替えられます（第5部 第26章の「使うものを外から渡す」と同じ）。`res.status === 204` のときに `res.json()` を呼ぶと、本文が無いので失敗します。

## 問題4 の答え

1. `innerHTML` にすると、`<b>太字</b>` は**太字の「太字」**として出ます。題名を HTML として読んだからです。`textContent` に戻すと、`<b>太字</b>` という文字がそのまま出ます。利用者が入れた文字を HTML として読むと、利用者のタグがそのまま動く（XSS）ので、`textContent` を使います。
2. ページが読み直され、アドレスバーが `app.html?title=…&dueDate=` になります。`<form>` に `method` が無いので、ブラウザが入力を GET のクエリにして、同じページを開き直したからです。`fetch` は途中で止められ、タスクは作られません（作られることがあっても、画面は読み直しで最初からになる）。
3. `GET /api/tasks` の前には、ありません。`PATCH` の前には、`OPTIONS` があります（2回目からは無いことがあります）。
   - `GET` で、特別なヘッダを付けないリクエストは、「単純なリクエスト」なので、そのまま送られます。
   - `PATCH`（GET・HEAD・POST 以外のメソッド）や、`If-Match`・`Content-Type: application/json` のヘッダが付くリクエストは、送る前に「送ってよいか」をブラウザが `OPTIONS` で聞きます（**プリフライト**。第2部 第9章）。
   - 練習用の API は `Access-Control-Max-Age: 600` を返すので、ブラウザは 10 分間、答えを覚えます。その間は `OPTIONS` が出ません。
4. `#status` に「読み込めませんでした: Failed to fetch」が出ます（Safari では「Load failed」）。Console には `net::ERR_CONNECTION_REFUSED`（つながらない）が出ます。`fetch` は、つながらないときだけエラーを投げます。SSE の `EventSource` も、つながらないことを Console に出します。
5. API が起動すると、`EventSource` が自分でつなぎ直し（`retry` の 3 秒ごと）、一覧は**起動し直した API の中身**（例の5つのタスク）に変わります。つなぎ直すとき、ブラウザは最後に受け取ったイベントの番号を `Last-Event-ID` で送ります。起動し直した API は、その番号を知らない（メモリが空になった）ので `reset` を送り、画面は `load()` で全部を読み直します。自分で作ったタスクは消えています（練習用の API は、データをメモリに置いているため）。
6. SSE があれば、もう片方もすぐに変わります。SSE の部分を消すと、もう片方は古いままで、ページを読み直すか、古いまま変えようとして 412 になるまで気づきません。

## 問題5〜8 のポイント

- 問題5: `new FormData(form).get('title')` は、入力が無ければ `null` を返すので、`String(… ?? '')` にしてから `trim()` します。
- 問題6: `switch` に `default` を書いておくと、状態を足したのに画面を書き忘れたとき、すぐに気づけます。第36章の判別できるユニオンと `never` を使えば、TypeScript では tsc が見つけてくれます（第43章）。
- 問題7: 変わらないときに知らせないのは、無駄に画面を作り直さないためです。React の `useState` も、同じ値（`Object.is`）を入れたときは、作り直しを省きます（第42章）。
- 問題8: 「古い知らせを無視する」のは、SSE のイベントと、自分の `fetch` の応答の順番が入れ替わることがあるからです。`version` は、どちらが新しいかを決める番号として使えます。
