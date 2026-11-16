# 第43章 模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。自分で解いてから読んでください。

模範解答は、問題の道具（`api.ts`・`schemas.ts`）を `../exercises/` から読み込みます。テストが投げる `ApiError` と、模範解答が `instanceof` で調べる `ApiError` を、同じクラスにするためです。

| 問題 | ファイル | 確かめ方（`exercises/` で） |
| --- | --- | --- |
| 1 | [fieldErrors.ts](fieldErrors.ts) | `MODULE=../solutions/fieldErrors.ts npx vitest run fieldErrors.test.ts` |
| 2 | [TaskListView.tsx](TaskListView.tsx) | `MODULE=../solutions/TaskListView.tsx npx vitest run TaskListView.test.tsx` |
| 3 | [tasksPath.ts](tasksPath.ts) | `MODULE=../solutions/tasksPath.ts npx vitest run tasksPath.test.ts` |
| 4 | この README の下 | — |
| 5 | [useTask.ts](useTask.ts) | `MODULE=../solutions/useTask.ts npx vitest run useTask.test.tsx` |
| 6 | [taskQueries.ts](taskQueries.ts) | `MODULE=../solutions/taskQueries.ts npx vitest run taskQueries.test.tsx` |
| 7 | [TaskForm.tsx](TaskForm.tsx) | `MODULE=../solutions/TaskForm.tsx npx vitest run TaskForm.test.tsx` |
| 8 | [useToggleDone.ts](useToggleDone.ts) | `MODULE=../solutions/useToggleDone.ts npx vitest run useToggleDone.test.tsx` |

## 問題1〜3 のポイント

- 問題1: `out[name] ??= e.detail` は、「`out[name]` が無いときだけ入れる」の短い書き方です。`if (!(name in out)) out[name] = e.detail;` と同じです。
- 問題2: `switch (load.status)` の `case` ごとに `return` すると、その `case` の中では `load.error` や `load.tasks` が使えます（判別できるユニオン。第36章 2節）。どれかの `case` を書き忘れると、関数の終わりまで来て `undefined` を返すことになるので、`tsc` がエラーにします。
- 問題3: `URLSearchParams` の `set` は、入れた順に並びます。`toString()` は、`,` を `%2C` に、空白を `+` にエスケープします。サーバ（Express）は、どちらの形でも同じ値として読みます。

## 問題4 の答え

1. 「useEffect で読む」の欄には、すぐに `読み込めませんでした: HTTP 502` が出ます（API が動いていないので、Vite のプロキシが 502 Bad Gateway を返す）。「タスク」の欄は、**7 秒ほど**「読み込み中…」のままで、それから `読み込めませんでした: HTTP 502` と「再試行」が出ます。TanStack Query は、失敗した読み込みを、間を空けながら **3回までやり直す**からです（1秒・2秒・4秒待つ）。一瞬つながらなかっただけなら、利用者は失敗に気づきません。
2. 最初の「完了」は 1.5 秒「読み込み中…」が出ますが、「すべて」に戻ると、**すぐに**前の一覧が出ます（キャッシュ）。読んでから 10 秒（`main.tsx` の `staleTime`）たっていないので、読み直しもしません。15 秒待ってから押すと、前の一覧がすぐ出て、見出しに「（更新中…）」が 1.5 秒出てから、新しい一覧に変わります。古いキャッシュを先に見せ、裏で読み直すのが TanStack Query の決まりの動きです（stale-while-revalidate）。
3. SSE があると、もう片方のタブも、すぐ（1秒以内に）変わります。`useTaskEvents` をやめると、もう片方は、**そのタブに戻ったとき**（ウィンドウにフォーカスが来たとき）に変わります。TanStack Query は、古くなった（`staleTime` を過ぎた）キャッシュを、フォーカスが戻ったときに読み直すからです（`refetchOnWindowFocus`）。10 秒たっていなければ、戻っても変わりません。
4. チェックはすぐ付き、そのまま残ります。エラーも出ません。TanStack Query は、ブラウザがオフラインだと分かっていると、変更を送るのを**オンラインに戻るまで待ちます**（`networkMode: 'online'`）。「No throttling」に戻すと、そのとき PATCH が送られ、本当に完了になります。巻き戻し（`onError`）が動くのは、サーバが失敗を返したとき（412 など）や、つながらなかったときです。
5. `tasks?…status=todo` の行は、Status が **(canceled)** になっています。選ぶ欄を変えると、`useEffect` の後片付けで `controller.abort()` が呼ばれ、ブラウザがリクエストを止めるからです。止めないと、遅い応答が後から届いて、画面を古い一覧で上書きするおそれがあります（本文2.3節）。
6. `HTTP/1.1 422 Unprocessable Content` と、`{"…","errors":[{"pointer":"#/title","detail":"title は 1〜100 文字です"}]}` が返ります。画面の確かめは、利用者にすぐ知らせるためのもので、**守りにはなりません**。curl や DevTools を使えば、画面を通さずに何でも送れるので、API は必ず自分で確かめます（第4部）。画面とサーバの決まりを同じにしておくと（本文5.1節）、画面で通った値がサーバで断られることが、ほとんど無くなります。

## 問題5〜8 のポイント

- 問題5: `id` が変わるたびに Effect の後片付けで `abort()` するので、前の id のリクエストは止まります。さらに、結果に「どの id の結果か」を付けて覚えておき、今の id と比べるので、止めるのが間に合わなかった応答が届いても、画面には出ません。`id` が変わったときに `pending` を返すのも、`set…` を使わずに、この比べ方で決めています（第42章 4節）。
- 問題6: `onSuccess` で `invalidateQueries` の Promise を**返す**と、読み直しが終わるまで、変更は `isPending` のままです。「追加」のボタンが、一覧が変わる前に押せるようになることを防げます。
- 問題7: `onSubmit` が投げたエラーは `try … catch` で受け取ります。`finally` で `setSending(false)` にすると、成功でも失敗でも、ボタンが元に戻ります。題名の欄の `aria-invalid` を `errors.title !== undefined` で決めると、間違いの文と、入力欄の印が必ずそろいます。
- 問題8: `onMutate` の最初の `cancelQueries` は、読み込みの途中の応答（変える前の値）が、楽観的に変えたキャッシュを上書きするのを防ぎます。`onMutate` が返した `{ previous }` が、`onError` の3つ目の引数に渡ります。
