# 第42章 練習問題4 予想して確かめる（調べる問題）

本文の `app`（`~/dev/part08/ch42-hooks/app/`）を `npx vite` で動かし、ブラウザと DevTools の Console で確かめます。
それぞれ、**先に答えを予想して**このファイルに書き、その後で確かめて、結果を書き足してください。確かめたら、元に戻しておきます。

1. `Snapshot.tsx` の `addThreeWrong` の最後（3つ目の `setCount` の後）に `console.log('押した直後', count);` を足します。count が 0 のときに「+3（まちがい）」を押すと、Console に何と出ますか。画面の数はいくつになりますか。
   - 予想:
   - 結果:
2. 「スナップショット」の画面で「+3」を1回押すと、Console の「App を描画」と「Snapshot を描画」は、それぞれ何回出ますか。なぜですか。
   - 予想:
   - 結果:
3. `hooks.ts` の `useNow` で、`setInterval` の中を `() => { console.log('tick'); setNow(new Date()); }` にし、`return () => clearInterval(id);` を消します。「時計」の画面を開くと、1秒に何回 `tick` が出ますか。「時計を出す」のチェックを外すと、`tick` は止まりますか。
   - 予想:
   - 結果:
4. `Snapshot.tsx` の `useEffect` の依存配列 `[count]` を `[]` に変えると、ボタンを押したとき、タブの題名はどうなりますか。依存配列そのもの（`, [count]`）を消すと、どうなりますか（Effect の中に `console.log('Effect')` を足して確かめる）。
   - 予想:
   - 結果:
5. `tasksReducer.ts` の `'toggled'` を、次のように「配列の中のオブジェクトを書き換えて、同じ配列を返す」形に変えます。チェックボックスを押すと、画面はどうなりますか。
   ```ts
   case 'toggled': {
     const t = tasks.find((t) => t.id === action.id);
     if (t) t.done = !t.done;
     return tasks;
   }
   ```
   - 予想:
   - 結果:
6. `SearchBox.tsx` の `useMemo` をやめて、`const found = slowFilter(query);` にします。「色を変える」を押したとき、Console と、押してから色が変わるまでの速さは、どう変わりますか。
   - 予想:
   - 結果:
