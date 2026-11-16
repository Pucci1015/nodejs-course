# 第45章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part08/ch45-styling-a11y/exercises/` で行います。最初に `cd exercises` で移動してください。

| 問題 | 種類 | テーマ | 使うファイル | 本文の節 |
| --- | --- | --- | --- | --- |
| 1 | 基本 | 条件で付けるクラスの名前をつなぐ | [classNames.ts](classNames.ts)、[classNames.test.ts](classNames.test.ts) | 2.3 |
| 2 | 基本 | アイコンだけのボタンに名前を付ける | [IconButton.tsx](IconButton.tsx)、[IconButton.test.tsx](IconButton.test.tsx) | 5.3 |
| 3 | 基本 | ラベル・説明・間違いがつながった入力欄 | [TextField.tsx](TextField.tsx)、[TextField.test.tsx](TextField.test.tsx) | 6 |
| 4 | 基本 | 予想して確かめる（調べる問題） | [predict.md](predict.md) | 2〜8・10 |
| 5 | 応用 | どこからでも知らせられる場所 | [announcer.tsx](announcer.tsx)、[announcer.test.tsx](announcer.test.tsx) | 7 |
| 6 | 応用 | 確かめるダイアログ | [ConfirmDialog.tsx](ConfirmDialog.tsx)、[ConfirmDialog.test.tsx](ConfirmDialog.test.tsx) | 8 |
| 7 | 応用 | OS の設定にも合わせるテーマ | [useColorScheme.ts](useColorScheme.ts)、[useColorScheme.test.tsx](useColorScheme.test.tsx) | 3 |
| 8 | 発展 | キーボードで動かせるタブ | [Tabs.tsx](Tabs.tsx)、[Tabs.test.tsx](Tabs.test.tsx) | 9 |

**発展**（8）は、少し長めの問題です。できなくても次に進んでかまいません。

## テストの使い方

第44章と同じです。`○○.tsx`（または `○○.ts`）を書き、`npx vitest run ○○.test.tsx` ですべてのテストが通れば完成です。模範解答は `MODULE=../solutions/○○.tsx npx vitest run ○○.test.tsx` で確かめられます。`npx tsc` と `npx eslint .` も通してください。

- この章のテストは、見た目（色や大きさ）ではなく、**役割・名前・説明・フォーカス**を確かめます。テストの jsdom は CSS を読まないからです。見た目は、本文の `app` でブラウザを使って確かめます。

---

## 基本

### 問題1 条件で付けるクラスの名前をつなぐ

[classNames.ts](classNames.ts) の `classNames(...values)` を書いてください（本文2.3節）。React の `className` に渡す文字を、条件に合わせて作る関数です。

```ts
classNames('card', done && 'done', { urgent: dueSoon, selected: false }); // done と dueSoon が true なら 'card done urgent'
```

- 文字は、空白で区切って1つずつの名前にします（余分な空白は入れない）。
- `false`・`null`・`undefined`・空の文字は飛ばします。
- オブジェクトは、値が `true` の名前だけを使います。
- 同じ名前は1つにします（最初に出た順）。何も無ければ `''` です。

### 問題2 アイコンだけのボタンに名前を付ける

[IconButton.tsx](IconButton.tsx) の `IconButton({ icon, label, onClick, pressed, disabled })` を書いてください（本文5.3節）。

```html
<button type="button" aria-label="「牛乳を買う」を削除" title="「牛乳を買う」を削除"><span aria-hidden="true">🗑</span></button>
```

- ボタンの名前は `label` です（`aria-label`）。マウスを乗せたときにも出るように、`title` にも入れます。
- アイコンの文字は `<span aria-hidden="true">` に入れ、読み上げないようにします。
- `pressed` を渡したときだけ、`aria-pressed` を付けます（`true` か `false`）。渡さなければ、属性を付けません。
- `disabled` なら押せなくします。

### 問題3 ラベル・説明・間違いがつながった入力欄

[TextField.tsx](TextField.tsx) の `TextField({ label, value, onChange, hint, error, required })` を書いてください（本文6節）。

- `<label>` と `<input>` を、`useId` で作った id と `htmlFor` でつなぎます（ラベルの文字が、入力欄の名前になる）。
- `hint` があれば、入力欄の下に `<p>` で出し、`aria-describedby` でつなぎます。
- `error` があれば、その下に `<p>` で出し、`aria-describedby` に足します（`hint` の id、`error` の id の順に、空白で区切る）。入力欄に `aria-invalid="true"` を付けます。
- `hint` も `error` も無ければ、`aria-describedby` を付けません。`error` が無ければ、`aria-invalid` も付けません。
- `required` なら、入力欄に `required` を付け、ラベルの文字の後ろに ` *` を `<span aria-hidden="true">` で付けます（`required` は読み上げられるので、`*` は目で見る人のための印）。

### 問題4 予想して確かめる（調べる問題）

[predict.md](predict.md) の6つの問いについて、**先に予想を書いてから**、本文の `app` で確かめてください。テストはありません。答えと説明は [../solutions/README.md](../solutions/README.md) にあります。

---

## 応用

### 問題5 どこからでも知らせられる場所

[announcer.tsx](announcer.tsx) の `AnnouncerProvider` と `useAnnounce` を書いてください（本文7節）。本文の `App.tsx` の「知らせる場所」を、どの部品からでも使えるように、Context（第44章 7節）にしたものです。

- `AnnouncerProvider({ children, clearAfterMs })`: `children` の後ろに、`role="status"`・`aria-live="polite"`・`class="visually-hidden"` の `<div>` を**いつも**置きます。中の文は、最初は空です。
- `useAnnounce()`: 文を受け取って、その `<div>` の中に入れる関数を返します。Provider の外では、`useAnnounce は <AnnouncerProvider> の中で使ってください` の `Error` を投げます。
- 入れた文は、`clearAfterMs` ミリ秒（決まりは 5000）たったら消します。その前に別の文が入ったら、その文から数え直します。

### 問題6 確かめるダイアログ

[ConfirmDialog.tsx](ConfirmDialog.tsx) の `ConfirmDialog({ open, title, children, confirmLabel, onConfirm, onCancel })` を書いてください（本文8節）。

- `<dialog>` を使い、`open` が `true` になったら `showModal()` で開き、`false` になったら `close()` で閉じます。
- `<h2>` に `title` を出し、ダイアログの名前にします（`aria-labelledby`）。その下に `children` と、「キャンセル」「（confirmLabel。決まりは OK）」の2つのボタンを、この順に置きます。押すと、それぞれ `onCancel()`・`onConfirm()` を呼びます。
- Esc キーで閉じようとしたとき（`cancel` のイベント）は、`preventDefault()` でブラウザに閉じさせず、`onCancel()` を呼びます。開け閉めは、いつも親が `open` で決めます。
- 開いたら「キャンセル」にフォーカスを置きます。閉じたら、開く前にフォーカスのあった要素に戻します。

ヒント: 開いたときにフォーカスのあった要素は `document.activeElement` です。`useEffect` の中で覚えておき、後片付けで閉じて、その要素の `focus()` を呼ぶと、開け閉めと戻し方が1か所にまとまります。テストの jsdom には `showModal` が無いので、テストのファイルが、開いているかを `open` で表すだけの簡単なものを足しています。

### 問題7 OS の設定にも合わせるテーマ

[useColorScheme.ts](useColorScheme.ts) の `useColorScheme(choice)` を書いてください（本文3節）。

- `choice` が `'light'` か `'dark'` なら、それを返します。`'system'` なら、`window.matchMedia('(prefers-color-scheme: dark)').matches` が `true` なら `'dark'`、そうでなければ `'light'` を返します。
- OS の設定が変わったら（`matchMedia(…)` の `change` のイベント）、合わせて変わります。画面から消えたら、見張るのをやめます。
- 返す値を、`document.documentElement.dataset.theme`（`<html data-theme="…">`）に入れます。

---

## 発展

### 問題8 キーボードで動かせるタブ

[Tabs.tsx](Tabs.tsx) の `Tabs({ label, tabs })` を書いてください（本文9節）。WAI-ARIA の「タブ」の決まりどおりに動く部品です。

```html
<div role="tablist" aria-label="状態">
  <button role="tab" id="…-tab-0" aria-selected="true" aria-controls="…-panel-0" tabindex="0">未着手</button>
  <button role="tab" id="…-tab-1" aria-selected="false" aria-controls="…-panel-1" tabindex="-1">作業中</button>
</div>
<div role="tabpanel" id="…-panel-0" aria-labelledby="…-tab-0" tabindex="0">…</div>
<div role="tabpanel" id="…-panel-1" aria-labelledby="…-tab-1" tabindex="0" hidden>…</div>
```

- 最初は1つ目のタブが選ばれています。選ばれたタブだけ `aria-selected="true"`・`tabindex="0"`、ほかは `"false"`・`-1` です。パネルは、選ばれたもの以外に `hidden` を付けます。
- タブを押すと、そのタブが選ばれます。
- タブにフォーカスがあるとき、→ で次、← で前（端では反対の端へ回る）、Home で最初、End で最後のタブを選び、そのタブにフォーカスを移します。
- Tab キーでは、選ばれたタブの次は、パネルに移ります（`tabindex="0"`）。

ヒント: id は `useId()` で作ります。タブのボタンにフォーカスを移すには、ボタンの要素を `useRef` の配列に入れておきます（`ref={(el) => { refs.current[i] = el; }}`）。
