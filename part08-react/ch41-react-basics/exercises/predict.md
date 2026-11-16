# 第41章 練習問題4 予想して確かめる（調べる問題）

本文の `app`（`~/dev/part08/ch41-react-basics/app/`）を `npx vite` で動かし、ブラウザと DevTools の Console で確かめます。
それぞれ、**先に答えを予想して**このファイルに書き、その後で確かめて、結果を書き足してください。確かめたら、元に戻しておきます。

1. `App.tsx` の `<h1>` の下に `{tasks.length && <p>タスクがあります</p>}` を足します。タスクがあるとき、画面に何が出ますか。`initialTasks` を `[]` にすると、何が出ますか。
   - 予想:
   - 結果:
2. `TaskList.tsx` の `key={task.id}` を消すと、画面は変わりますか。Console には何が出ますか。
   - 予想:
   - 結果:
3. `TaskItem.tsx` の `className=` を `class=` に変えると、`npx tsc` は何と言いますか。画面と Console はどうなりますか。
   - 予想:
   - 結果:
4. `Counter.tsx` の `onClick={() => setCount(count + 1)}` を `onClick={setCount(count + 1)}` に変えると、何が起きますか。
   - 予想:
   - 結果:
5. `Counter.tsx` を、`useState` を使わずに `let count = 0;` と `onClick={() => { count = count + 1; }}` にすると、ボタンを押したとき、画面の数は変わりますか。
   - 予想:
   - 結果:
6. `TaskItem.tsx` の `{task.title}` を `<span dangerouslySetInnerHTML={{ __html: task.title }} />` に変えると、3つ目のタスク `<b>太字？</b>` はどう出ますか。この属性の名前に `dangerously`（危険な）が付いているのはなぜですか。
   - 予想:
   - 結果:
