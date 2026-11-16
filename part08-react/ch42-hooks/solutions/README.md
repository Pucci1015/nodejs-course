# 第42章 模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。自分で解いてから読んでください。

| 問題 | ファイル | 確かめ方（`exercises/` で） |
| --- | --- | --- |
| 1 | [Score.tsx](Score.tsx) | `MODULE=../solutions/Score.tsx npx vitest run Score.test.tsx` |
| 2 | [useDocumentTitle.ts](useDocumentTitle.ts) | `MODULE=../solutions/useDocumentTitle.ts npx vitest run useDocumentTitle.test.tsx` |
| 3 | [updates.ts](updates.ts) | `MODULE=../solutions/updates.ts npx vitest run updates.test.ts` |
| 4 | この README の下 | — |
| 5 | [Stopwatch.tsx](Stopwatch.tsx) | `MODULE=../solutions/Stopwatch.tsx npx vitest run Stopwatch.test.tsx` |
| 6 | [useLocalStorage.ts](useLocalStorage.ts) | `MODULE=../solutions/useLocalStorage.ts npx vitest run useLocalStorage.test.tsx` |
| 7 | [TaskApp.tsx](TaskApp.tsx) | `MODULE=../solutions/TaskApp.tsx npx vitest run TaskApp.test.tsx` |
| 8 | [TaskSearch.tsx](TaskSearch.tsx) | `MODULE=../solutions/TaskSearch.tsx npx vitest run TaskSearch.test.tsx` |

## 問題1〜3 のポイント

- 問題1: 「+1」の関数の中を、更新関数 `setScore((s) => s + 1)` で書くのが要点です。`setScore(score + 1)` だと、「+3」の3回の呼び出しが、どれも同じ描画の `score`（たとえば 0）を見るので、1点しか増えません。履歴も `setHistory((h) => [...h, '+1'])` と更新関数で書きます。
- 問題2: 後片付けで元に戻すには、Effect の**中で**、変える前の題名を `const prev = document.title` で覚えておきます。`title` が変わると、「前の Effect の後片付け（元に戻す）→ 新しい Effect（覚えて、変える）」の順に動くので、`prev` はいつも、フックを使い始める前の題名になります。
- 問題3: 変える1つだけを `{ ...t, done: !t.done }` で新しく作り、ほかは `t` をそのまま返すのが `map` の形です。`moveUp` は `with` のほか、`const next = [...tasks]` でコピーしてから入れ替えても書けます（コピーした配列を変えるのは、かまいません）。

## 問題4 の答え

1. Console には `押した直後 0` と出て、画面は `1` になります。`setCount` は state をその場で変えず、「次の描画で使う値」を React に頼むだけです。この関数の `count` は、押したときの描画の値（0）のまま変わりません（本文2.1節）。
2. 「Snapshot を描画」が **2回**（どちらも `3` 以降の同じ数）出て、「App を描画」は出ません。state が変わったのは `Snapshot` だけなので、描き直すのは `Snapshot` とその子だけです。3回の `setCount` は1回の描画にまとめられます（本文2.2節）。2回出るのは、開発中の `StrictMode` が、描画をわざと2回呼ぶからです（本文3.4節。React 19 の DevTools は、2回目の表示を薄い色で出します）。`npx vite build` して `npx vite preview` で開くと、1回だけです。
3. `tick` は1秒に **2回**出て、チェックを外しても止まりません。`StrictMode` は、Effect を「動かす → 後片付け → もう1回動かす」と試すので、後片付けが無いと `setInterval` が2つ残ります。画面から消えた後も、止める人がいないので動き続けます（本文3.2・3.4節）。
4. `[]` にすると、最初の描画の後に1回だけ動くので、ボタンを押してもタブの題名は `count: 0` のままです（ESLint の `react-hooks/exhaustive-deps` が、`count` が足りないと警告します）。依存配列そのものを消すと、描画のたびに毎回動きます（本文3.3節の表）。
5. チェックボックスを押しても、チェックが付きません（残りの数も変わりません）。React は、reducer が返した配列が前と同じもの（`Object.is` で同じ）なら、何も変わっていないと見て、描き直しを省きます（本文2.4節）。オブジェクトを書き換えても、配列が同じなので気づきません。さらに `StrictMode` では reducer も2回呼ばれるので、書き換えが2回起きて元に戻ってしまいます。reducer は、同じ入力に同じ出力を返す、外を変えない関数にします。
6. 「色を変える」を押すたびに、Console に `絞り込み` が出て、色が変わるまで少し（100ms × 2回 = 約 0.2 秒）待たされます。`useMemo` があれば、`query` が変わらない限り前の結果を使うので、色はすぐ変わります。ただし、`useMemo` を使うのは、このように**遅いと分かったところだけ**です（本文6節）。

## 問題5〜8 のポイント

- 問題5: `setInterval` の中で `setSeconds(seconds + 1)` と書くと、Effect の中の `seconds` は始めたときの値のまま変わらないので、1から先に進みません（依存配列に `seconds` を入れると動きますが、1秒ごとに Effect を作り直すことになります）。更新関数 `setSeconds((s) => s + 1)` にすれば、依存配列は `[running]` だけで済みます。
- 問題6: 保存は、変える関数の中ではなく `useEffect` で、`value` が変わったときに行っています。こうすると、値で変えても更新関数で変えても、保存の書き方が1つで済みます。`useState` の set 関数は、もともと値も更新関数も受け取れるので、そのまま返せます。
- 問題7: 絞り込んだ一覧（`shown`）は state にせず、描くたびに `state.tasks` と `state.filter` から計算します（本文4節）。題名が空白だけのときに `state` をそのまま返すと、React が描き直しを省けます。
- 問題8: `useDebounce` は、「`value` が変わるたびに、前のタイマーを後片付けで止めて、新しいタイマーを始める」だけで書けます。打ち続けている間は止められ続け、手を止めて 300ms たったときに初めて値が変わります。`/` のキーは `window` で見張るので、`useEffect` で `addEventListener` し、後片付けで `removeEventListener` します。依存配列は `[]` です（`inputRef` は描画のたびに同じものなので、入れなくてよい）。
