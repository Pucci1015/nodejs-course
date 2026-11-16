# 第41章 模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。自分で解いてから読んでください。

| 問題 | ファイル | 確かめ方（`exercises/` で） |
| --- | --- | --- |
| 1 | [TaskCard.tsx](TaskCard.tsx) | `MODULE=../solutions/TaskCard.tsx npx vitest run TaskCard.test.tsx` |
| 2 | [TaskTable.tsx](TaskTable.tsx) | `MODULE=../solutions/TaskTable.tsx npx vitest run TaskTable.test.tsx` |
| 3 | [StatusTabs.tsx](StatusTabs.tsx) | `MODULE=../solutions/StatusTabs.tsx npx vitest run StatusTabs.test.tsx` |
| 4 | この README の下 | — |
| 5 | [Stepper.tsx](Stepper.tsx) | `MODULE=../solutions/Stepper.tsx npx vitest run Stepper.test.tsx` |
| 6 | [NewTaskForm.tsx](NewTaskForm.tsx) | `MODULE=../solutions/NewTaskForm.tsx npx vitest run NewTaskForm.test.tsx` |
| 7 | [TaskBoard.tsx](TaskBoard.tsx) | `MODULE=../solutions/TaskBoard.tsx npx vitest run TaskBoard.test.tsx` |
| 8 | [SortableTable.tsx](SortableTable.tsx) | `MODULE=../solutions/SortableTable.tsx npx vitest run SortableTable.test.tsx` |

## 問題1〜3 のポイント

- 問題1: `className={task.status === 'done' ? 'task done' : 'task'}` のように、`class` の文字を式で作ります。`{task.dueDate !== null && <small>…</small>}` の左は真偽値なので、`0` が出る落とし穴はありません。
- 問題2: `{tasks.length === 0 ? <p>…</p> : <ul>…</ul>}` の3項演算子でも、`if (tasks.length === 0)` で早めに返しても書けます。ただし、見出しはどちらでも出すので、ここでは3項演算子が短く書けます。
- 問題3: 選ばれているかの state を `StatusTabs` の中に持たないのは、親（一覧を絞り込む所）も、どれが選ばれているかを知る必要があるからです（本文7節）。このように、値を props で受け取り、変更を関数で知らせるだけの部品は、使い回しやすくなります。

## 問題4 の答え

1. タスクがあるときは「タスクがあります」が出ます。`initialTasks` を `[]` にすると、`<h1>` の下に **`0`** が出ます。`0 && …` の値は `0` で、React は数を文字として出すからです。`tasks.length > 0 && …` と書けば、何も出ません。
2. 画面は変わりません。Console に `Each child in a list should have a unique "key" prop.` の警告が出ます。`key` は見た目には出ませんが、一覧が変わったときに、React が「どの要素がどのデータか」を対応させるのに使います。
3. `npx tsc` は、`Property 'class' does not exist on type 'DetailedHTMLProps<…>'. Did you mean 'className'?` のようなエラーを出します。画面は、多くの場合そのまま動きます（React 19 は `class` も属性として付ける）が、Console に `Invalid DOM property `class`. Did you mean `className`?` の警告が出ます。JSX の属性の名前は、DOM のプロパティの名前（`className`）に合わせる決まりです。
4. 画面が出ず、Console に `Too many re-renders. React limits the number of renders to prevent an infinite loop.` のエラーが出ます。`onClick={setCount(count + 1)}` は、描くたびに `setCount` を**呼んで**しまい、それがまた再描画を起こすからです。渡すのは `() => setCount(count + 1)` のような「後で呼ぶ関数」です。
5. 変わりません。`count` は増えています（`console.log` で見ると増えている）が、React は再描画しません。再描画は、`setCount` のような state を変える関数を呼んだときだけ起きます。しかも、もし別の理由で再描画されても、`Counter` が呼び直されるたびに `let count = 0` から始まるので、0 に戻ります。
6. 「太字？」が**太字**で出ます。文字が HTML として読まれたからです。利用者が入れた文字をこれで出すと、利用者が書いたタグがそのまま動いてしまう（XSS。第4部 第21章）ので、「危険」という名前を付けて、うっかり使わないようにしています。`__html` という変わった名前の項目にしているのも、同じ理由です。

## 問題5〜8 のポイント

- 問題5: `disabled={value <= min}` のように、押せるかどうかも state から計算します。`<output>` は「計算の結果」を表す HTML の要素です。
- 問題6: `onAdd` を呼んでから入力欄を空にします。順番を逆にしても、この問題では動きます（`title` の値は、その描画の間は変わらないため。第42章 2節）。
- 問題7: 「残り n 件」は state にせず、`tasks` から毎回数えます。id を `Date.now()` で作る書き方もありますが、テストでは同じ時刻に2つ作られることがあるので、「一番大きい id + 1」にしました。本物のアプリでは、id は API（データベース）が付けます（第43章）。
- 問題8: 並べた配列を state にすると、`tasks` が変わったときに並べ直し忘れます。並べ方だけを state にし、描くたびに並べれば、いつも正しい順になります。タスクが何千もあって並べるのが遅いときは、第42章の `useMemo` で、同じ入力の計算を省けます。
