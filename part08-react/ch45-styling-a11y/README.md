# 第45章 スタイリングとアクセシビリティ

ここまでの画面は、ブラウザの決まりの見た目のままでした。この章では、React の画面に CSS で見た目を付ける方法（全体の CSS・**CSS Modules**・**Tailwind CSS**）と、CSS 変数で明るい色と暗い色を切り替える方法を学びます。そのうえで、目の見えない人・キーボードだけで使う人・色の見分けにくい人も使える画面にするための**アクセシビリティ**（a11y）を、タスクの画面で1つずつ確かめます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 5〜6時間 |
| 前提 | 第44章、第1部（HTML と CSS の基本） |
| この章のゴール | 全体の CSS と CSS Modules を使い分けられる / CSS 変数でテーマを切り替えられる / Tailwind CSS のクラスを読み書きできる / 役割・名前・説明が正しく伝わる HTML を書ける / フォームのラベルと間違いをつなげられる / 画面の変化を `aria-live` で知らせられる / `<dialog>` でダイアログを作れる / キーボードと DevTools でアクセシビリティを確かめられる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形（`app/`） |
| [exercises/](exercises/) | 練習問題（テストで確かめる） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、`~/dev/part08/ch45-styling-a11y/` で実行します。手を動かして作るフォルダ（`app/`）は、このフォルダの直下に作ります。
>
>   ```sh
>   $ cd ~/dev/part08/ch45-styling-a11y
>   ```
>
> - この章の `app` は、見た目に集中するため、API を使いません（タスクは画面の中の state に置きます）。
> - アクセシビリティは、**マウスを使わずに**操作して確かめるのがいちばんです。この章では、ときどきマウスから手を離して、Tab キー・Enter・Esc・矢印キーだけで動かしてみます。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| CSS Modules・Tailwind CSS（2・4節） | 第8部の成果物、第9部（Next.js でも同じ書き方） |
| CSS 変数とテーマ（3節） | 第8部の成果物 |
| 役割・名前・フォーカス（5節） | 第8部の成果物、第11部（`getByRole` で書くテスト） |
| フォームのつなぎ方（6節） | 第8部の成果物、第10部（登録・ログインのフォーム） |
| `aria-live`・`<dialog>`（7・8節） | 第8部の成果物（削除の確かめ、412 の知らせ） |

---

## 1. 準備

```sh
$ mkdir -p app/src
$ cp ../ch42-hooks/app/tsconfig.json app/
$ cd app
```

`app/vite.config.ts` を作ります。Tailwind CSS（4節）のプラグインも、ここで入れておきます。

```ts
import tailwindcss from '@tailwindcss/vite';
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: { port: 5173, strictPort: true },
});
```

`app/index.html` を作ります。`lang="ja"` は、スクリーンリーダーに日本語で読ませるための印です。`viewport` の `<meta>` は、スマートフォンで画面の幅に合わせて表示させるためのものです（4節の `sm:` が効くようになる）。

```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>見た目と使いやすさ</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`app/src/types.ts` を作ります。

```ts
export type Status = 'todo' | 'doing' | 'done';
export type Task = { id: number; title: string; status: Status; dueDate: string | null };
export const STATUS_LABELS: Record<Status, string> = { todo: '未着手', doing: '作業中', done: '完了' };
```

---

## 2. React で CSS を使う

### 2.1 全体の CSS

Vite では、CSS のファイルを JavaScript から `import` できます（第40章 3節）。アプリ全体に効かせる CSS（文字の大きさ・色・余白の決まりなど）は、入り口で1回だけ読み込みます。`app/src/main.tsx` を作ります（`tailwind.css` は4節、`ThemeProvider` は3節で作ります）。

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';
import './index.css';
import './tailwind.css';
import { ThemeProvider } from './theme.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ThemeProvider>
      <App />
    </ThemeProvider>
  </StrictMode>,
);
```

`app/src/index.css` を作ります。色を `--bg` のような **CSS 変数**（カスタムプロパティ）にまとめているところは、3節で説明します。`:focus-visible` などは5節で説明します。

```css
/* 第45章 2・3節: アプリ全体の CSS。色は CSS 変数にまとめ、テーマで入れ替える */
:root {
  --bg: #ffffff;
  --text: #1f2328;
  --muted: #59636e; /* 白の上で 4.5:1 以上（5.2節） */
  --border: #d1d9e0;
  --accent: #0b57d0;
  --danger: #b3261e;
  --done-bg: #e6f4ea;
  color-scheme: light;
}

/* OS の設定が暗い色で、自分で選んでいない（system）とき */
@media (prefers-color-scheme: dark) {
  :root:not([data-theme='light']) {
    --bg: #16181d;
    --text: #e6e8eb;
    --muted: #a3abb5;
    --border: #3a4049;
    --accent: #8ab4f8;
    --danger: #f2b8b5;
    --done-bg: #1e3a2a;
    color-scheme: dark;
  }
}

/* 自分で「暗い色」を選んだとき */
:root[data-theme='dark'] {
  --bg: #16181d;
  --text: #e6e8eb;
  --muted: #a3abb5;
  --border: #3a4049;
  --accent: #8ab4f8;
  --danger: #f2b8b5;
  --done-bg: #1e3a2a;
  color-scheme: dark;
}

body {
  margin: 0;
  background: var(--bg);
  color: var(--text);
  font-family: system-ui, sans-serif;
  line-height: 1.6;
}

main {
  max-width: 40rem;
  margin: 0 auto;
  padding: 1rem;
}

/* 5.4節: キーボードで動かしているときだけ、はっきりした枠を出す（マウスで押したときは出さない） */
:focus-visible {
  outline: 3px solid var(--accent);
  outline-offset: 2px;
}

/* 5.5節: 目では見えないが、スクリーンリーダーは読む */
.visually-hidden {
  position: absolute;
  width: 1px;
  height: 1px;
  overflow: hidden;
  clip-path: inset(50%);
  white-space: nowrap;
}

/* 5.5節: ふだんは隠し、Tab で来たときだけ出る「本文へ」のリンク */
.skip-link {
  position: absolute;
  left: 0.5rem;
  top: -3rem;
  background: var(--bg);
  padding: 0.5rem;
}
.skip-link:focus {
  top: 0.5rem;
}

.error {
  color: var(--danger);
}

dialog {
  background: var(--bg);
  color: var(--text);
  border: 1px solid var(--border);
  border-radius: 8px;
}
dialog::backdrop {
  background: rgb(0 0 0 / 50%);
}
```

全体の CSS に、部品ごとの見た目（`.card` など）まで書いていくと、クラスの名前がぶつかったり、どの部品が使っているか分からず消せなくなったりします。部品の見た目は、次の CSS Modules か、4節の Tailwind CSS で書きます。

### 2.2 CSS Modules

`○○.module.css` という名前の CSS は、**CSS Modules** として読み込まれます。中のクラスの名前は、そのファイルを `import` した部品の中だけで使える名前に変えられます。`app/src/TaskCard.module.css` を作ります。

```css
/* 第45章 2.2節: CSS Modules。ここに書いたクラスの名前は、このファイルを import した部品の中だけで使われる */
.card {
  display: flex;
  align-items: center;
  gap: 0.75rem;
  padding: 0.75rem 1rem;
  border: 1px solid var(--border);
  border-radius: 8px;
  margin-bottom: 0.5rem;
}

.done {
  background: var(--done-bg);
}

.title {
  flex: 1;
  margin: 0;
  font-size: 1rem;
}

/* 5.2節: 完了の印を、色だけで伝えない（線と「完了」の文字も付ける） */
.done .title {
  text-decoration: line-through;
}

.badge {
  font-size: 0.8rem;
  color: var(--muted);
}
```

`app/src/TaskCard.tsx` を作ります（`aria-label` などは5節で説明します）。

```tsx
import styles from './TaskCard.module.css';
import { STATUS_LABELS, type Task } from './types.ts';

type Props = { task: Task; onToggle: () => void; onDelete: () => void };

export function TaskCard({ task, onToggle, onDelete }: Props) {
  const done = task.status === 'done';
  // 条件で付けるクラスは、配列にして空でないものだけをつなぐ
  const className = [styles.card, done && styles.done].filter(Boolean).join(' ');
  return (
    <li className={className}>
      <input type="checkbox" checked={done} onChange={onToggle} aria-label={`「${task.title}」を完了にする`} />
      <h3 className={styles.title}>{task.title}</h3>
      <span className={styles.badge}>{STATUS_LABELS[task.status]}</span>
      {/* 見た目は × だけでも、名前（aria-label）で何のボタンかを伝える */}
      <button type="button" onClick={onDelete} aria-label={`「${task.title}」を削除`}>
        <span aria-hidden="true">×</span>
      </button>
    </li>
  );
}
```

- `import styles from './TaskCard.module.css'` の `styles` は、「書いた名前 → 変えた後の名前」のオブジェクトです。`styles.card` は `'_card_ji82k_2'` のような文字です。
- ほかのファイルに `.card` があっても、ぶつかりません。部品を消すときは、`.module.css` も一緒に消せば済みます。
- `.done .title` のように、同じファイルのクラスを組み合わせて書けます。

### 2.3 条件で付けるクラスと、style

`TaskCard` の `[styles.card, done && styles.done].filter(Boolean).join(' ')` は、「`done` のときだけ `styles.done` も付ける」書き方です。条件が増えると読みにくくなるので、関数にしておくと便利です（練習問題1の `classNames`）。

JSX の `style={{ … }}` に、オブジェクトで CSS を直接書くこともできます（第41章）。値が計算で決まるもの（幅のパーセントなど）には便利ですが、`:hover` や `@media` が書けず、テーマとも合わせにくいので、ふだんはクラスを使います。

---

## 3. CSS 変数でテーマを切り替える

`index.css` では、色を `:root` の CSS 変数に入れ、使うところでは `var(--bg)` と書いています。暗い色のときは、変数の値だけを入れ替えます。

| 書き方 | 効くとき |
| --- | --- |
| `:root { --bg: #fff; }` | いつも（明るい色が決まり） |
| `@media (prefers-color-scheme: dark) { :root:not([data-theme='light']) { … } }` | OS の設定が暗い色で、利用者が「明るい色」を選んでいないとき |
| `:root[data-theme='dark'] { … }` | 利用者が「暗い色」を選んだとき（`<html data-theme="dark">`） |

`color-scheme: dark` は、スクロールバーや入力欄など、ブラウザが描く部分も暗い色にするための指定です。

利用者の選んだテーマは、第44章 7節の Context で配ります。`app/src/theme.tsx` を作ります。

```tsx
import { createContext, useContext, useEffect, useState, type ReactNode } from 'react';

export type ThemeChoice = 'system' | 'light' | 'dark';
const ThemeContext = createContext<{ choice: ThemeChoice; setChoice: (c: ThemeChoice) => void } | null>(null);

function load(): ThemeChoice {
  const v = localStorage.getItem('theme');
  return v === 'light' || v === 'dark' ? v : 'system';
}

export function ThemeProvider({ children }: { children: ReactNode }) {
  const [choice, setChoice] = useState<ThemeChoice>(load);

  // React の外（<html> の属性・localStorage）と合わせるので Effect（第42章 3節）
  useEffect(() => {
    const root = document.documentElement;
    if (choice === 'system') {
      delete root.dataset.theme; // 属性を消すと、CSS の prefers-color-scheme が効く
      localStorage.removeItem('theme');
    } else {
      root.dataset.theme = choice;
      localStorage.setItem('theme', choice);
    }
  }, [choice]);

  return <ThemeContext value={{ choice, setChoice }}>{children}</ThemeContext>;
}

export function useTheme() {
  const v = useContext(ThemeContext);
  if (v === null) throw new Error('useTheme は <ThemeProvider> の中で使ってください');
  return v;
}

const LABELS: Record<ThemeChoice, string> = { system: 'OS に合わせる', light: '明るい色', dark: '暗い色' };

// 6.1節: ラジオボタンのまとまりは、fieldset と legend で名前を付ける
export function ThemePicker() {
  const { choice, setChoice } = useTheme();
  return (
    <fieldset>
      <legend>テーマ</legend>
      {(Object.keys(LABELS) as ThemeChoice[]).map((c) => (
        <label key={c}>
          <input type="radio" name="theme" value={c} checked={choice === c} onChange={() => setChoice(c)} /> {LABELS[c]}
        </label>
      ))}
    </fieldset>
  );
}
```

- `<html>` の属性は React の外なので、`useEffect` で合わせます（第42章 3節）。`root.dataset.theme = 'dark'` は `<html data-theme="dark">` にすることです。
- 「OS に合わせる」のときは、属性を消して、CSS の `prefers-color-scheme` に任せます（JavaScript で OS の設定を読むこともできます。練習問題7）。

---

## 4. Tailwind CSS

### 4.1 クラスの名前で見た目を書く

**Tailwind CSS** は、`flex`・`p-4`（余白）・`text-sm`（文字の大きさ）のような、1つの働きだけを持つ小さなクラス（**ユーティリティのクラス**）をたくさん用意した CSS のフレームワークです。CSS のファイルを書くかわりに、JSX の `className` にクラスを並べて見た目を作ります。第8部のフォルダに、Tailwind CSS 4 と Vite のプラグイン（`@tailwindcss/vite`）が入っています。

`app/src/tailwind.css` を作ります。

```css
/* 第45章 4節: Tailwind CSS のうち、決まりの値（色や大きさ）とユーティリティのクラスだけを読み込む */
/* （ブラウザの決まりの見た目を消す preflight は読み込まない。index.css の見た目と並べて比べるため） */
@import 'tailwindcss/theme.css' layer(theme);
@import 'tailwindcss/utilities.css' layer(utilities);

/* dark: を、OS の設定ではなく <html data-theme="dark"> のときに効かせる */
@custom-variant dark (&:where([data-theme='dark'], [data-theme='dark'] *));
```

- ふつうは `@import 'tailwindcss';` の1行で全部を読み込みます。全部には、ブラウザの決まりの見た目（見出しの大きさ・リストの点など）を消す **preflight** も入っています。この章では、`index.css` の見た目と並べて比べるため、preflight を除いた2つだけを読み込んでいます。
- `@custom-variant dark (…)` は、`dark:` で始まるクラスを、3節の `data-theme="dark"` のときに効かせる設定です（決まりでは、OS の設定で効く）。
- プラグインは、ファイルの中で使われているクラスを探して、使われているものだけの CSS を作ります。

### 4.2 手を動かす: 同じカードを Tailwind CSS で

`app/src/TailwindCard.tsx` を作ります。

```tsx
import { STATUS_LABELS, type Task } from './types.ts';

export function TailwindCard({ task }: { task: Task }) {
  const done = task.status === 'done';
  return (
    <li
      className={`mb-2 flex items-center gap-3 rounded-lg border border-gray-300 px-4 py-3 dark:border-gray-600 ${
        done ? 'bg-green-50 dark:bg-green-950' : ''
      }`}
    >
      <h3 className={`m-0 flex-1 text-base ${done ? 'line-through' : ''}`}>{task.title}</h3>
      {/* sm: は「画面の幅が 40rem 以上のときだけ」（狭い画面では状態の文字を出さない） */}
      <span className="hidden text-sm text-gray-600 sm:inline dark:text-gray-400">{STATUS_LABELS[task.status]}</span>
    </li>
  );
}
```

| クラス | CSS |
| --- | --- |
| `flex items-center gap-3` | `display: flex; align-items: center; gap: 0.75rem` |
| `px-4 py-3`・`mb-2` | 左右の余白 1rem・上下 0.75rem、下の外側の余白 0.5rem（数 × 0.25rem） |
| `rounded-lg border border-gray-300` | 角を丸く、1px の線、線の色 |
| `text-sm`・`text-base` | 文字の大きさ |
| `hidden sm:inline` | ふだんは出さない。画面の幅が 40rem 以上（`sm:`）なら出す |
| `dark:bg-green-950` | 暗い色のときだけ、背景の色を変える |
| `hover:underline`・`focus-visible:outline-2` | マウスが乗ったとき・キーボードでフォーカスしたときだけ |

### 4.3 どれを使うか

| | 全体の CSS | CSS Modules | Tailwind CSS |
| --- | --- | --- | --- |
| 書く場所 | `.css` | 部品ごとの `.module.css` | JSX の `className` |
| 名前のぶつかり | 起きる | 起きない | 名前を付けない |
| 向いているもの | 色・文字・余白の決まり、テーマ | 部品の見た目を、CSS としてきちんと書きたいとき | 画面を素早く作りたいとき、決まった値（余白・色）にそろえたいとき |
| 気をつけること | 部品ごとの見た目は書かない | ファイルが部品の数だけ増える | `className` が長くなる。クラスの名前を覚える |

どれか1つに決めなくても、この章のように「色やテーマの決まりは全体の CSS と CSS 変数、部品は CSS Modules か Tailwind CSS」と組み合わせられます。第8部の成果物では、CSS Modules を使います。

---

## 5. アクセシビリティの基本

画面を使う人の中には、スクリーンリーダー（画面の文字を読み上げるソフト）を使う人、マウスを使えずキーボードだけで操作する人、色の見分けにくい人、画面を大きく拡大して見る人がいます。**アクセシビリティ**は、そういう人も同じように使えることです。キーボードで素早く操作したい人、明るい屋外でスマートフォンを見る人など、すべての人の使いやすさにもつながります。

スクリーンリーダーは、画面を、要素の**役割**（ボタン・見出し・チェックボックス…）・**名前**（ボタンの文字・ラベル）・**状態**（チェックが付いている・押されている）として読みます。Testing Library の `getByRole('button', { name: '追加' })`（第41章 8節）は、これと同じ見方です。

### 5.1 意味のある HTML を使う

| 書き方 | なぜ |
| --- | --- |
| 押すものは `<button>`（`<div onClick>` にしない） | `<button>` は、Tab で止まり、Enter と Space で押せ、「ボタン」と読まれる。`<div>` では全部を自分で作ることになる |
| 移るものは `<a href>`・`<Link>`、その場で何かするものは `<button>` | 読まれ方と、右クリックで新しいタブで開けるかが変わる |
| 見出しは `<h1>`〜`<h6>` を順に（`<h1>` の次に `<h3>` を飛ばさない） | スクリーンリーダーの利用者は、見出しを目次のように使って移動する |
| `<header>`・`<nav>`・`<main>`・`<section aria-labelledby>` | **ランドマーク**。「メイン」「メニュー」へ一気に移れる |
| `<ul>`・`<li>` で一覧 | 「リスト、3項目」と、数も伝わる |

ARIA（`role` や `aria-` で始まる属性）は、HTML の要素では表せないときだけ使います。`<div role="button">` より、`<button>` です。

### 5.2 色だけで伝えない・コントラスト

- `TaskCard` の完了は、背景の色だけでなく、題名の線と「完了」の文字でも伝えています。色の見分けにくい人や、白黒で印刷したときにも分かるようにするためです。
- 文字と背景の明るさの比（**コントラスト比**）は、ふつうの大きさの文字で 4.5:1 以上にします（WCAG の決まり）。`index.css` の `--muted` は、薄い灰色に見えますが、白の上で 4.5:1 を超える色にしています（練習問題4の問6）。

### 5.3 名前を付ける

| 場面 | 書き方 |
| --- | --- |
| 記号やアイコンだけのボタン | `aria-label="「牛乳を買う」を削除"` で名前を付け、記号は `aria-hidden="true"` で読ませない |
| 一覧の中のボタン | 「削除」が5つ並ぶと区別できないので、何の削除かを名前に入れる |
| 意味のある画像 | `<img alt="説明">`。飾りの画像は `alt=""` |
| `<nav>` が2つ以上ある | `aria-label="メニュー"` のように名前で区別する |

### 5.4 フォーカスを見えるようにする

キーボードで操作する人は、今どこにフォーカスがあるかを、枠（outline）で知ります。CSS で `outline: none` にして消してはいけません。`index.css` の `:focus-visible` は、「キーボードで動かしているとき」だけ、はっきりした枠を出す書き方です（マウスで押したときは出ない）。

### 5.5 「本文へ移動」と、目に見えない文字

`App.tsx`（7節で作ります）の最初の `<a href="#main" className="skip-link">本文へ移動</a>` は、ふだんは画面の外に隠れていて、Tab キーを押したときだけ出てくるリンクです。キーボードで使う人が、毎回メニューを通り過ぎなくて済みます。

`.visually-hidden` は、目では見えないが、スクリーンリーダーは読む文字にするクラスです（`display: none` や `hidden` は、スクリーンリーダーからも消える）。

---

## 6. フォーム

### 6.1 ラベルを付ける

入力欄には、必ずラベルを付けます。ラベルの文字が、入力欄の名前になります。

| 書き方 | 使う場面 |
| --- | --- |
| `<label>題名 <input /></label>` | ラベルで包む（第41章の書き方） |
| `<label htmlFor="id">題名</label>` と `<input id="id" />` | ラベルと入力欄が離れているとき。JSX では `for` ではなく `htmlFor` |
| `<fieldset><legend>テーマ</legend>…</fieldset>` | ラジオボタンのような、まとまりに名前を付ける（`theme.tsx` の `ThemePicker`） |

`placeholder`（入力欄の中の薄い文字）は、打ち始めると消えるので、ラベルのかわりにはなりません。

### 6.2 手を動かす: 説明と間違いをつなぐ

`app/src/NewTaskForm.tsx` を作ります。

```tsx
import { useId, useRef, useState, type FormEvent } from 'react';

export function NewTaskForm({ onAdd }: { onAdd: (title: string) => void }) {
  const [title, setTitle] = useState('');
  const [error, setError] = useState('');
  const inputRef = useRef<HTMLInputElement>(null);
  // useId: この部品を2つ置いても重ならない id を作る（label の htmlFor や aria-describedby で使う）
  const id = useId();
  const hintId = `${id}-hint`;
  const errorId = `${id}-error`;

  function onSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const t = title.trim();
    if (t === '') {
      setError('題名を入れてください');
      // 間違いのある入力欄に、フォーカスを戻す（どこを直せばよいか、すぐ分かるように）
      inputRef.current?.focus();
      return;
    }
    onAdd(t);
    setTitle('');
    setError('');
  }

  return (
    <form onSubmit={onSubmit} noValidate>
      <label htmlFor={id}>題名</label>
      <input
        ref={inputRef}
        id={id}
        value={title}
        onChange={(e) => setTitle(e.target.value)}
        required
        aria-invalid={error !== ''}
        // 説明と間違いの文を、この入力欄の「説明」としてつなぐ（入力欄に来たときに読み上げられる）
        aria-describedby={error ? `${hintId} ${errorId}` : hintId}
      />
      <p id={hintId}>100 文字まで</p>
      {error && (
        <p id={errorId} className="error">
          {error}
        </p>
      )}
      <button>追加</button>
    </form>
  );
}
```

- `useId()` は、この部品を画面に2つ置いても重ならない id を作るフックです。id を手で書くと、2つ置いたときに重なってしまいます。
- `aria-describedby` に、説明（「100 文字まで」）と間違いの文の id を空白で区切って入れると、入力欄に来たとき、名前の後に読み上げられます。
- `aria-invalid="true"` は、「この値は間違っている」の印です（第43章 5節）。
- 間違いがあったら、その入力欄にフォーカスを戻します。どこを直せばよいかが、すぐ分かります。

---

## 7. 画面の変化を知らせる

ボタンを押してタスクが増えても、スクリーンリーダーの利用者には、画面のどこが変わったか分かりません。**ライブリージョン**（`aria-live`）は、「ここの文が変わったら読み上げて」という印です。

| 書き方 | 読み上げ方 | 使う場面 |
| --- | --- | --- |
| `role="status"`（`aria-live="polite"` と同じ） | 読んでいる途中のものが終わってから | 「追加しました」のような、ふつうの知らせ |
| `role="alert"`（`aria-live="assertive"` と同じ） | すぐに割り込んで | 間違い・失敗（第43章のフォーム） |

`app/src/App.tsx` を作ります（`DeleteDialog` は8節で作ります。作るまでは、その行をコメントにしておきます）。

```tsx
import { useState } from 'react';
import { DeleteDialog } from './DeleteDialog.tsx';
import { NewTaskForm } from './NewTaskForm.tsx';
import { TailwindCard } from './TailwindCard.tsx';
import { TaskCard } from './TaskCard.tsx';
import { ThemePicker } from './theme.tsx';
import type { Task } from './types.ts';

const initialTasks: Task[] = [
  { id: 1, title: '牛乳を買う', status: 'todo', dueDate: null },
  { id: 2, title: '第8部を読む', status: 'doing', dueDate: null },
  { id: 3, title: '本を返す', status: 'done', dueDate: null },
];

export function App() {
  const [tasks, setTasks] = useState(initialTasks);
  const [deleting, setDeleting] = useState<Task | null>(null);
  // 7節: 画面のどこかが変わったことを、スクリーンリーダーに知らせる文
  const [message, setMessage] = useState('');

  function add(title: string) {
    const id = Math.max(0, ...tasks.map((t) => t.id)) + 1;
    setTasks([...tasks, { id, title, status: 'todo', dueDate: null }]);
    setMessage(`「${title}」を追加しました`);
  }

  function toggle(task: Task) {
    const status = task.status === 'done' ? 'todo' : 'done';
    setTasks(tasks.map((t) => (t.id === task.id ? { ...t, status } : t)));
    setMessage(`「${task.title}」を${status === 'done' ? '完了にしました' : '未着手に戻しました'}`);
  }

  function remove(task: Task) {
    setTasks(tasks.filter((t) => t.id !== task.id));
    setDeleting(null);
    setMessage(`「${task.title}」を削除しました`);
  }

  return (
    <>
      <a href="#main" className="skip-link">
        本文へ移動
      </a>
      <header>
        <nav aria-label="メニュー">
          <a href="#main">タスク</a> | <a href="#settings">設定</a>
        </nav>
      </header>
      <main id="main">
        <h1>タスク</h1>
        <section aria-labelledby="add-heading">
          <h2 id="add-heading">タスクを足す</h2>
          <NewTaskForm onAdd={add} />
        </section>
        <section aria-labelledby="list-heading">
          <h2 id="list-heading">一覧（CSS Modules）</h2>
          <ul style={{ padding: 0, listStyle: 'none' }}>
            {tasks.map((t) => (
              <TaskCard key={t.id} task={t} onToggle={() => toggle(t)} onDelete={() => setDeleting(t)} />
            ))}
          </ul>
        </section>
        <section aria-labelledby="tw-heading">
          <h2 id="tw-heading">一覧（Tailwind CSS）</h2>
          <ul className="list-none p-0">
            {tasks.map((t) => (
              <TailwindCard key={t.id} task={t} />
            ))}
          </ul>
        </section>
        <section id="settings" aria-labelledby="settings-heading">
          <h2 id="settings-heading">設定</h2>
          <ThemePicker />
        </section>
        {/* 知らせる場所は、最初から置いておき、中の文だけを変える */}
        <p role="status" className="visually-hidden">
          {message}
        </p>
      </main>
      <DeleteDialog title={deleting?.title ?? null} onConfirm={() => deleting && remove(deleting)} onClose={() => setDeleting(null)} />
    </>
  );
}
```

知らせる場所（`<p role="status">`）は、最初から空で置いておき、中の文だけを変えます。知らせたいときに場所ごと作ると、読み上げられないことがあるからです。

```sh
$ npx vite
```

http://localhost:5173/ を開き、タスクを足して、DevTools の Elements で `role="status"` の `<p>` の中の文が変わることを確かめます。Mac なら、`Command + F5` で VoiceOver（Mac のスクリーンリーダー）を起動して、実際に読み上げを聞けます（もう一度 `Command + F5` で止まる）。

---

## 8. ダイアログ

`app/src/DeleteDialog.tsx` を作り、`App.tsx` のコメントを外します。

```tsx
import { useEffect, useId, useRef } from 'react';

type Props = { title: string | null; onConfirm: () => void; onClose: () => void };

export function DeleteDialog({ title, onConfirm, onClose }: Props) {
  const ref = useRef<HTMLDialogElement>(null);
  const headingId = useId();
  const open = title !== null;

  // React の外（ブラウザのダイアログの開け閉め）と合わせる
  useEffect(() => {
    const dialog = ref.current;
    if (!dialog) return;
    if (open && !dialog.open) dialog.showModal();
    if (!open && dialog.open) dialog.close();
  }, [open]);

  return (
    // onClose: Esc で閉じたとき・close() したときに呼ばれる
    <dialog ref={ref} aria-labelledby={headingId} onClose={onClose}>
      <h2 id={headingId}>「{title}」を削除しますか？</h2>
      <p>削除すると、元に戻せません。</p>
      {/* showModal は、中の最初のボタンにフォーカスを移す。消さない方を先に置く（うっかり Enter で消さないように） */}
      <button type="button" onClick={onClose}>
        やめる
      </button>{' '}
      <button type="button" onClick={onConfirm}>
        削除する
      </button>
    </dialog>
  );
}
```

HTML の `<dialog>` を `showModal()` で開くと、ブラウザが次のことをしてくれます。自分で `<div>` で作ると、これを全部書く必要があります。

| してくれること | 意味 |
| --- | --- |
| ダイアログの外を **inert** にする | 外の要素は、押せない・フォーカスできない・読み上げない |
| 中にフォーカスを移す | 中の最初のボタン（ここでは「やめる」）にフォーカスが来る |
| Esc で閉じる | `close` のイベントが起き、React の `onClose` が呼ばれる |
| `::backdrop` | 後ろを暗くする CSS を書ける |
| 閉じたら、開く前の要素にフォーカスを戻す | 削除ボタンに戻る（練習問題6では、自分で戻す書き方もする） |

開け閉めはブラウザ（React の外）の働きなので、`useEffect` で `title`（開くか）と合わせています。

削除が終わると、押した削除ボタンごと消えるので、フォーカスは行き場を失います。こういうときは、一覧の見出しなど、近くの要素にフォーカスを移すと親切です（成果物では、そうします）。

---

## 9. キーボードで動かせる部品

タブ・メニュー・ツリーのような部品には、キーボードでの動かし方の決まりがあります（W3C の **WAI-ARIA Authoring Practices Guide**、APG）。たとえば「タブ」は、Tab キーで並び全体に1回だけ止まり、並びの中は矢印キーで移ります。決まりどおりに作ると、どのサイトでも同じ操作で使えます。練習問題8で、タブを作ります。

自分で作る前に、HTML の要素（`<button>`・`<select>`・`<details>`・`<dialog>`）で済まないかを考えます。決まりを全部守って作るのは、思ったより大変だからです。

## 10. 確かめ方

| 方法 | 分かること |
| --- | --- |
| マウスを使わずに、Tab・Shift+Tab・Enter・Space・Esc・矢印キーで操作する | 全部の操作ができるか、フォーカスが見えるか、順番がおかしくないか |
| DevTools の Elements → **Accessibility** タブ | 選んだ要素の役割・名前・説明 |
| DevTools の **Lighthouse** → Accessibility | 名前の無いボタン、コントラスト、見出しの順など、決まりで調べられるもの |
| DevTools の **Rendering** → prefers-color-scheme | 暗い色のテーマ |
| スクリーンリーダー（Mac の VoiceOver: `Command + F5`） | 実際の読まれ方 |
| Testing Library の `getByRole` | テストで、役割と名前で要素が見つかるか（見つからなければ、スクリーンリーダーの利用者も見つけにくい） |

## まとめ

- 全体の決まり（色・文字・テーマ）は全体の CSS と CSS 変数、部品の見た目は CSS Modules か Tailwind CSS で書く。
- CSS Modules は、クラスの名前をファイルごとに変えて、ぶつからないようにする。Tailwind CSS は、小さなクラスを `className` に並べて見た目を作る。
- テーマは、CSS 変数の値を `[data-theme]` と `prefers-color-scheme` で入れ替える。
- 押すものは `<button>`、見出しは順に、ランドマークで区切る。ARIA は HTML で表せないときだけ。
- 色だけで伝えない。文字のコントラストは 4.5:1 以上。フォーカスの枠を消さない。
- 記号だけのボタンには `aria-label`。入力欄にはラベル、説明と間違いは `aria-describedby`、間違いは `aria-invalid`。
- 画面の変化は、最初から置いた `role="status"`（失敗は `role="alert"`）で知らせる。
- ダイアログは `<dialog>` の `showModal()`。外が inert になり、Esc で閉じる。
- キーボードと DevTools で、自分で操作して確かめる。

## 練習問題

[exercises/README.md](exercises/README.md) に8問あります（基本4問・応用3問・発展1問）。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- Vite「CSS Modules」: https://ja.vite.dev/guide/features#css-modules
- Tailwind CSS「Installing with Vite」（英語）: https://tailwindcss.com/docs/installation/using-vite
- Tailwind CSS「Dark mode」（英語）: https://tailwindcss.com/docs/dark-mode
- MDN「アクセシビリティ」: https://developer.mozilla.org/ja/docs/Web/Accessibility
- MDN「ARIA ライブリージョン」: https://developer.mozilla.org/ja/docs/Web/Accessibility/ARIA/Guides/Live_regions
- MDN「<dialog>」: https://developer.mozilla.org/ja/docs/Web/HTML/Reference/Elements/dialog
- WAI-ARIA Authoring Practices Guide「Tabs Pattern」（英語）: https://www.w3.org/WAI/ARIA/apg/patterns/tabs/
- WCAG 2.2（日本語訳）: https://waic.jp/translations/WCAG22/

---

前: [第44章 ルーティングと状態の設計](../ch44-routing-state/README.md) ／ 次: [第46章 フルスタックフレームワークの考え方](../ch46-fullstack/README.md) ／ 部の目次: [第8部 フロントエンドと React](../README.md)
