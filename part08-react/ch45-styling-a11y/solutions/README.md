# 第45章 模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。自分で解いてから読んでください。

| 問題 | ファイル | 確かめ方（`exercises/` で） |
| --- | --- | --- |
| 1 | [classNames.ts](classNames.ts) | `MODULE=../solutions/classNames.ts npx vitest run classNames.test.ts` |
| 2 | [IconButton.tsx](IconButton.tsx) | `MODULE=../solutions/IconButton.tsx npx vitest run IconButton.test.tsx` |
| 3 | [TextField.tsx](TextField.tsx) | `MODULE=../solutions/TextField.tsx npx vitest run TextField.test.tsx` |
| 4 | この README の下 | — |
| 5 | [announcer.tsx](announcer.tsx) | `MODULE=../solutions/announcer.tsx npx vitest run announcer.test.tsx` |
| 6 | [ConfirmDialog.tsx](ConfirmDialog.tsx) | `MODULE=../solutions/ConfirmDialog.tsx npx vitest run ConfirmDialog.test.tsx` |
| 7 | [useColorScheme.ts](useColorScheme.ts) | `MODULE=../solutions/useColorScheme.ts npx vitest run useColorScheme.test.tsx` |
| 8 | [Tabs.tsx](Tabs.tsx) | `MODULE=../solutions/Tabs.tsx npx vitest run Tabs.test.tsx` |

## 問題1〜3 のポイント

- 問題1: `new Set` に入れてから配列に戻すと、同じものが1つになり、順番は最初に入れた順のまま残ります。同じ働きのパッケージ（`clsx` など）もよく使われますが、中身はこの程度の関数です。
- 問題2: React は、`aria-pressed={undefined}` のように `undefined` を渡した属性を付けません。`pressed` を渡さなかったときに、`aria-pressed="false"`（「押されていないトグルボタン」という意味になる）が付かないのは、このためです。
- 問題3: `[hint && hintId, error && errorId].filter(Boolean).join(' ')` で、ある方の id だけを空白でつなぎます。空の文字のときに `undefined` にするのは、`aria-describedby=""` という意味の無い属性を付けないためです。

## 問題4 の答え

1. 左上に「本文へ移動」のリンクが出てきて、フォーカスの枠が付きます（ふだんは画面の外に隠してあり、`:focus` のときだけ出る）。Enter を押すと、`#main` に移ります。次に Tab を押すと、メニューではなく、`main` の中の最初の入力欄（題名）に来ます。毎回メニューを Tab で通り過ぎなくて済むので、キーボードだけで使う人の手間が減ります。
2. `_card_ji82k_2` のような名前になっています（数と文字は人によって違う）。CSS Modules が、ファイルごとにちがう名前に変えるからです。ほかのファイルに同じ `card` というクラスがあっても、ぶつかりません。`npx vite build` すると、もっと短い名前になります。
3. 「Name」は**空**になります（`aria-label` があるときは「「牛乳を買う」を削除」）。`×` の文字は `aria-hidden="true"` の中にあるので、名前にも使われないからです。スクリーンリーダーは「ボタン」としか読まず、何のボタンか分かりません。Lighthouse（問6）も「Buttons do not have an accessible name」（名前の無いボタンがある）と指摘します。`aria-hidden` を外しても、名前は `×` で、どのタスクを消すかは伝わりません。
4. 「OS に合わせる」では、画面が暗い色に変わります（`<html>` に `data-theme` が無く、`@media (prefers-color-scheme: dark)` が効く）。「明るい色」にすると、`<html data-theme="light">` になり、`:root:not([data-theme='light'])` に合わないので、OS の設定が暗くても明るい色のままです。
5. フォーカスは、ダイアログの中の「やめる」「削除する」と、ブラウザのアドレス欄などの間だけを回り、ダイアログの外の入力欄やボタンには行きません。外の「追加」ボタンは、押しても何も起きません。`showModal()` で開いたダイアログの外は、**inert**（押せない・フォーカスできない・読み上げない）になるからです。Esc を押すとダイアログが閉じ、削除ボタンにフォーカスが戻ります。
6. 点数は 100 点か、それに近い点です。`--muted` を `#b0b0b0` にすると、「Background and foreground colors do not have a sufficient contrast ratio.」（背景と文字の色のコントラストが足りない）と指摘され、点数が下がります。状態の文字（作業中など）が、白の上で 2.2:1 くらいになり、決まり（ふつうの大きさの文字は 4.5:1 以上）に届かないからです（本文5.2節）。Lighthouse が見つけられるのは、決まりで調べられる問題だけです。キーボードで使えるかは、問1・5のように、自分で操作して確かめます。

## 問題5〜8 のポイント

- 問題5: 知らせる場所を、文があるときだけ作ると、スクリーンリーダーが「新しく作られた場所」の中の文を読み上げないことがあります。場所はいつも置いておき、中の文だけを変えます。同じ文を続けて入れても、state が変わらないので、2回目は読み上げられません（必要なら、文の後ろに見えない印を足すなどの工夫をします）。
- 問題6: 開け閉めを `open` の props だけで決め、Esc のときも `preventDefault()` してから親に知らせるので、「ダイアログは閉じたのに、親の state は開いたまま」というずれが起きません。
- 問題7: `useColorScheme` は、OS の設定（`systemDark`）だけを state に持ち、返す値（`scheme`）は計算で決めています（第42章 4節）。`<html>` に入れるのは、React の外を変えることなので Effect です。
- 問題8: 選ばれたタブだけを `tabIndex={0}` にし、ほかを `-1` にする書き方を、**roving tabindex** と呼びます。Tab キーでは、タブの並びを1回で通り過ぎ、並びの中は矢印キーで動きます。キーボードで使う人は、タブが10個あっても、Tab を10回押さずに済みます。
