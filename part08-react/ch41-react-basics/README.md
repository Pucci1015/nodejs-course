# 第41章 React の基礎

第39章では、「状態から画面を作る」を素の JavaScript で書き、全部を作り直すつらさや、つなぎ忘れを見ました。第40章では、TypeScript とパッケージを使えるようにしました。
この章では、**React** を使います。React は、「状態（データ）を渡すと、画面がどうなるべきか」を関数で書くと、前の画面との違いだけを DOM に当ててくれるライブラリです。JSX・コンポーネント・props・state の4つを、タスクの画面を作りながら学びます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 5〜6時間 |
| 前提 | 第39・40章、第7部（TypeScript の型・ユニオン） |
| この章のゴール | Vite で React の画面を動かせる / JSX を書き、それが関数の呼び出しになることを説明できる / コンポーネントに型の付いた props を渡せる / 配列を `map` と `key` で並べられる / 条件で出し分けられる / `useState` で state を持ち、イベントで変えられる / 制御されたフォームを書ける / state を共通の親に持ち上げられる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形（`app/`） |
| [exercises/](exercises/) | 練習問題（テストで確かめる） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、`~/dev/part08/ch41-react-basics/` で実行します。手を動かして作るフォルダ（`app/`）は、このフォルダの直下に作ります。
>
>   ```sh
>   $ cd ~/dev/part08/ch41-react-basics
>   ```
>
> - この章では、API は使いません（タスクは画面の中の state に置きます）。API とつなぐのは第43章です。
> - ブラウザに **React Developer Tools**（Chrome の拡張機能。「React Developer Tools」で検索して入れる）を入れておくと、コンポーネントの木と props・state が DevTools で見られます。入れなくても、この章は進められます。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| JSX とエスケープ（2節） | 第42〜46章のすべての画面、第46章（サーバで JSX から HTML を作る） |
| コンポーネントと props（3節） | 第44章（画面を部品に分ける）、第45章（見た目の部品）、第8部の成果物 |
| `map` と `key`（4節） | 第43章（API から読んだ一覧）、第42章（`key` で state を作り直す） |
| `useState` とイベント（6節） | 第42章（再描画の仕組み、`useEffect`）、第43章（フォームと送信） |
| state を持ち上げる（7節） | 第44章（state をどこに置くか、Context） |

---

## 1. 準備: React の画面を動かす

### 1.1 手を動かす: app を作る

```sh
$ mkdir -p app/src
$ cd app
```

`app/vite.config.ts` を作ります。第40章 8節のプラグインで、React 用のもの（`@vitejs/plugin-react`）を入れます。JSX を変換し、保存したときに state を残したまま画面を変えてくれます。

```ts
import react from '@vitejs/plugin-react';
import { defineConfig } from 'vite';

export default defineConfig({
  plugins: [react()],
  server: { port: 5173, strictPort: true },
});
```

`app/index.html` を作ります。React は、`#root` の中に画面を作ります。

```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>はじめての React</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`app/tsconfig.json` を作ります（第40章 6節。`jsx: react-jsx` が入っています）。

```json
{
  "extends": "../../tsconfig.base.json",
  "include": ["src", "vite.config.ts"]
}
```

`app/src/main.tsx` を作ります。JSX を書くファイルは、拡張子を `.tsx` にします。

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';

const root = document.querySelector('#root');
if (root === null) throw new Error('index.html に #root がありません');

createRoot(root).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`app/src/App.tsx` を、まず小さく作ります。

```tsx
export function App() {
  return <h1>こんにちは、React</h1>;
}
```

```sh
$ npx vite
```

http://localhost:5173/ を開くと、「こんにちは、React」が出ます。

| 書き方 | すること |
| --- | --- |
| `createRoot(要素)` | その要素の中を、React に任せる |
| `.render(<App />)` | `App` コンポーネントを描く |
| `<StrictMode>` | 開発中だけ、間違いを見つけやすくする検査をする（第42章で、何をしているかを見る） |
| `function App() { return <h1>…</h1>; }` | **コンポーネント**。JSX を返す関数。名前は大文字で始める |

## 2. JSX

### 2.1 JSX は関数の呼び出し

`<h1>こんにちは、React</h1>` は、HTML に見えますが、JavaScript（TypeScript）の中に書いた**式**です。React のプラグインが、次のような関数の呼び出しに変えます。

```tsx
// 書いたもの
<li className="done">{task.title}</li>

// 変換されたもの（だいたい）
jsx('li', { className: 'done', children: task.title })
```

第40章の練習問題6の `h('li', { className: 'done' }, task.title)` とほとんど同じ形です。違うのは、`jsx(…)` は DOM の要素ではなく、「こういう要素がほしい」という**ただのオブジェクト**を返すことです。React は、このオブジェクトの木を、前の木と比べて、違う所だけを本物の DOM に当てます。

### 2.2 JSX の決まり

| 決まり | 例 |
| --- | --- |
| `{ }` の中に、JavaScript の式を書ける | `<p>残り {left} 件</p>`、`<li className={cls}>` |
| 返す要素は1つ。いくつも返すなら `<>…</>`（フラグメント）で囲む | `<><h1 /><p /></>` |
| `class` は `className`、`for` は `htmlFor` | `<label htmlFor="title">` |
| 属性の名前は、イベントなどを camelCase で | `onClick`・`onChange`・`tabIndex` |
| 中身の無い要素は `/>` で閉じる | `<input />`・`<br />` |
| コメントは `{/* … */}` | |

- `{ }` の中には**式**（値になるもの）しか書けません。`if` や `for` は書けないので、3項演算子・`&&`・`map` を使います（4・5節）。

### 2.3 エスケープは自動

`{task.title}` で入れた文字は、**いつも文字として**出ます。第39章で `textContent` を使ったのと同じです。題名が `<b>太字？</b>` でも、タグにはなりません。

文字を HTML として入れる方法（`dangerouslySetInnerHTML`）もありますが、名前のとおり危険なので、この教材では使いません（練習問題4）。

## 3. コンポーネントと props

### 3.1 手を動かす: TaskItem

画面を**コンポーネント**（部品）に分けます。部品に渡す値を **props** と言います。

`app/src/types.ts` を作ります。

```ts
export type Status = 'todo' | 'doing' | 'done';
export type Task = { id: number; title: string; status: Status; dueDate: string | null };
```

`app/src/TaskItem.tsx` を作ります（6節で使うチェックボックスも、もう書いておきます）。

```tsx
import type { Task } from './types.ts';

type Props = {
  task: Task;
  onToggle: (id: number) => void;
};

export function TaskItem({ task, onToggle }: Props) {
  return (
    <li className={task.status === 'done' ? 'done' : undefined}>
      <label>
        <input type="checkbox" checked={task.status === 'done'} onChange={() => onToggle(task.id)} />
        {task.title}
      </label>
      {task.dueDate !== null && <small>（締め切り: {task.dueDate}）</small>}
    </li>
  );
}
```

- コンポーネントは、props を**1つのオブジェクト**で受け取る関数です。`{ task, onToggle }` は分割代入（第3部 第11章）です。
- props の型は、`type Props = { … }` で書きます。型を書いておけば、`<TaskItem task={…} />` と使う側で、渡し忘れや型の違いを tsc が見つけます。
- props は**読むだけ**です。`task.title = '…'` のように書き換えてはいけません。変えたいときは、変える関数（`onToggle`）を親から受け取って呼びます（7節）。

`App.tsx` で使ってみます。

```tsx
import { TaskItem } from './TaskItem.tsx';

export function App() {
  const task = { id: 1, title: '牛乳を買う', status: 'todo' as const, dueDate: '2026-11-20' };
  return (
    <ul>
      <TaskItem task={task} onToggle={(id) => console.log('押された', id)} />
    </ul>
  );
}
```

- `'todo' as const` は、`'todo'` を `string` ではなく `'todo'` の型のままにする書き方です（第36章 7節）。この後すぐ、`Task` の型を付けた配列に書き換えます。
- 小文字で始まる `<ul>` は HTML の要素、大文字で始まる `<TaskItem>` は自分のコンポーネントです。

## 4. 配列を並べる: map と key

### 4.1 手を動かす: TaskList

`app/src/TaskList.tsx` を作ります。

```tsx
import { TaskItem } from './TaskItem.tsx';
import type { Task } from './types.ts';

type Props = {
  tasks: Task[];
  onToggle: (id: number) => void;
};

export function TaskList({ tasks, onToggle }: Props) {
  if (tasks.length === 0) return <p>タスクはありません</p>;
  return (
    <ul>
      {tasks.map((task) => (
        <TaskItem key={task.id} task={task} onToggle={onToggle} />
      ))}
    </ul>
  );
}
```

- `tasks.map((task) => <TaskItem … />)` で、配列を JSX の配列にします。JSX の中に配列を置くと、順に並びます。
- `key={task.id}` は、React に「この要素は、どのデータのものか」を教える印です。一覧が変わったとき、React は `key` で前の要素と今の要素を対応させ、変わった所だけを直します。`key` が無いと、Console に `Each child in a list should have a unique "key" prop.` と出ます。
- `key` には、データの id を使います。配列の番号（`map((task, i) => … key={i})`）は、途中に足したり消したりすると、別のデータと対応してしまうので使いません。
- `key` は React が使うもので、props としては `TaskItem` に届きません。

## 5. 条件で出し分ける

`TaskList` と `TaskItem` には、出し分けが3種類あります。

| 書き方 | 使う所 |
| --- | --- |
| `if (…) return <p>…</p>;` | コンポーネントの最初で、まるごと別のものを返す（`TaskList` の「タスクはありません」） |
| `{条件 && <small>…</small>}` | 条件が成り立つときだけ出す（`TaskItem` の締め切り） |
| `{条件 ? 'done' : undefined}` | 2つのどちらか（`TaskItem` の `className`） |

> **`&&` の落とし穴**: `{tasks.length && <p>…</p>}` は、`tasks.length` が `0` のとき、`0` という文字を出してしまいます（`0 && …` の値は `0` で、React は数を文字として出すため）。条件は `tasks.length > 0 &&` のように、真偽値にして書きます（練習問題4）。`false`・`null`・`undefined` は、何も出しません。

## 6. state とイベント

### 6.1 手を動かす: はじめての state

`app/src/Counter.tsx` を作ります。

```tsx
import { useState } from 'react';

export function Counter() {
  const [count, setCount] = useState(0);
  return (
    <p>
      <button onClick={() => setCount(count + 1)}>押した回数: {count}</button>
    </p>
  );
}
```

`App.tsx` の最後に `<Counter />` を置いて、ボタンを押すと、数が増えます。

| 書き方 | すること |
| --- | --- |
| `const [count, setCount] = useState(0)` | **state** を1つ作る。`count` は今の値（最初は `0`）、`setCount` は値を変える関数 |
| `setCount(count + 1)` | 次の値を React に頼む。React は、`Counter` を**もう1回呼び**（再描画）、新しい `count` で画面を作り直す |
| `onClick={() => …}` | クリックされたときに呼ぶ関数を渡す |

- `useState` のように `use` で始まる関数を、**フック**（Hook）と言います。フックは、コンポーネントの関数の**一番外側**で呼びます（`if` や `for` の中で呼ばない）。React は、呼ばれた順番で「どの state か」を覚えているからです（第42章）。
- `let count = 0; count = count + 1;` と書いても、画面は変わりません。ふつうの変数を変えても、React は再描画しないからです（練習問題4）。
- `onClick={setCount(count + 1)}` と書くと、描くたびに `setCount` を**呼んで**しまい、無限に再描画します。渡すのは「後で呼ぶ関数」です。

`Counter` を2つ置くと、それぞれが別の `count` を持ちます。state は、コンポーネントを置いた場所ごとにできます。

### 6.2 手を動かす: 制御されたフォーム

`app/src/TaskForm.tsx` を作ります。

```tsx
import { type FormEvent, useState } from 'react';

type Props = {
  onAdd: (title: string) => void;
};

export function TaskForm({ onAdd }: Props) {
  const [title, setTitle] = useState('');

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const t = title.trim();
    if (t === '') return;
    onAdd(t);
    setTitle('');
  }

  return (
    <form onSubmit={handleSubmit}>
      <input value={title} onChange={(e) => setTitle(e.target.value)} placeholder="やること" />
      <button disabled={title.trim() === ''}>追加</button>
    </form>
  );
}
```

- `<input value={title} onChange={(e) => setTitle(e.target.value)} />`: 入力欄の文字を state に持ち、打つたびに state を変えます。画面の文字は、いつも state と同じになります。これを**制御されたコンポーネント**（controlled component）と言います。
- 送った後に `setTitle('')` とすれば、入力欄も空になります。第39章では `form.reset()` で DOM を直接変えましたが、React では state を変えます。
- `e` の型は、`onChange` に渡した関数から tsc が推論します（`ChangeEvent<HTMLInputElement>`）。`handleSubmit` のように別の関数にしたときは、`FormEvent<HTMLFormElement>` と書きます。
- `<button disabled={title.trim() === ''}>`: 空の間は押せません。属性にも、`{ }` で式を書けます。

## 7. state を持ち上げる

### 7.1 手を動かす: App にタスクの配列を持たせる

`TaskForm` で入れた題名を、`TaskList` に足したい。でも、`TaskForm` と `TaskList` は兄弟で、お互いの state は見えません。

こういうときは、**両方の共通の親**（`App`）に state を置きます。`App` は、配列を `TaskList` に props で渡し、変える関数（`addTask`・`toggleTask`）を `TaskForm` と `TaskList` に渡します。

`app/src/App.tsx` を、次のように書き換えます。

```tsx
import { useState } from 'react';
import { Counter } from './Counter.tsx';
import { TaskForm } from './TaskForm.tsx';
import { TaskList } from './TaskList.tsx';
import type { Task } from './types.ts';

const initialTasks: Task[] = [
  { id: 1, title: '牛乳を買う', status: 'todo', dueDate: '2026-11-20' },
  { id: 2, title: '第41章を読む', status: 'doing', dueDate: null },
  { id: 3, title: '<b>太字？</b>', status: 'done', dueDate: null },
];

export function App() {
  const [tasks, setTasks] = useState(initialTasks);
  const left = tasks.filter((t) => t.status !== 'done').length;

  function addTask(title: string) {
    const id = Math.max(0, ...tasks.map((t) => t.id)) + 1;
    setTasks([...tasks, { id, title, status: 'todo', dueDate: null }]); // 新しい配列を作って渡す
  }

  function toggleTask(id: number) {
    setTasks(tasks.map((t) => (t.id === id ? { ...t, status: t.status === 'done' ? 'todo' : 'done' } : t)));
  }

  return (
    <main>
      <h1>タスク（残り {left} 件）</h1>
      <TaskForm onAdd={addTask} />
      <TaskList tasks={tasks} onToggle={toggleTask} />
      <Counter />
    </main>
  );
}
```

```text
App（tasks の state を持つ）
├─ TaskForm   … onAdd(title) を呼ぶ
└─ TaskList   … tasks を受け取り、onToggle(id) を呼ぶ
    └─ TaskItem … task を受け取り、onToggle(id) を呼ぶ
```

データは親から子へ props で**下に**流れ、変えたいことは関数を呼んで**上に**伝えます（一方向のデータの流れ）。第39章の「状態を変えるのは `setState` だけ」と同じ考え方です。

- `setTasks([...tasks, 新しいタスク])`・`tasks.map(…)` のように、state の配列やオブジェクトは**新しく作って**渡します。`tasks.push(…)` で元の配列を変えても、React は「同じ配列だから、変わっていない」と思い、再描画しません（第42章）。
- `残り {left} 件` の `left` は、`tasks` から計算します。計算できるものは、別の state にしません（`tasks` を変えたのに `left` を変え忘れる、が起きないように）。

## 8. テストで確かめる（練習問題の準備）

練習問題のテストは、第39・40章と同じ Vitest に、**Testing Library**（`@testing-library/react`）を足して、コンポーネントを描き、利用者と同じように操作して確かめます。

```tsx
render(<StatusTabs value="all" onChange={…} />);           // jsdom の中に描く
await userEvent.click(screen.getByRole('button', { name: '完了' })); // 「完了」という名前のボタンを押す
expect(screen.getByRole('heading').textContent).toBe('今日（2 件）');
```

| 書き方 | 探すもの |
| --- | --- |
| `screen.getByRole('button', { name: '完了' })` | 役割（ボタン・見出し・チェックボックス…）と、名前（ボタンの文字・ラベル）で探す |
| `screen.getByLabelText('題名')` | `<label>` で名前の付いた入力欄 |
| `screen.getByText('タスクはありません')` | その文字の要素 |
| `screen.queryByRole(…)` | 無ければ `null`（`getBy…` は、無ければ失敗） |

役割と名前で探すのは、画面を見る人や、スクリーンリーダーを使う人と同じ探し方です（第45章）。そのため、練習問題では、ボタンの文字やラベルを、問題のとおりに書いてください。

## 9. Flask（Jinja2）と比べる

| | Flask（Jinja2） | React |
| --- | --- | --- |
| 画面を作る場所 | サーバ（ページを開くたび） | ブラウザ（state が変わるたび） |
| 部品 | `{% include %}`・`{% macro %}` | コンポーネント（関数） |
| 部品に渡す値 | `{% include 'item.html' with … %}`・マクロの引数 | props |
| 並べる | `{% for t in tasks %}` | `tasks.map((t) => <li key={t.id}>…</li>)` |
| 出し分け | `{% if %}` | `&&`・3項演算子・早めの `return` |
| エスケープ | `{{ t.title }}` は自動 | `{t.title}` は自動 |
| 状態 | サーバの変数・データベース（ページを作り直す） | `useState`（その部分だけ作り直す） |

## まとめ

- React のコンポーネントは、props を受け取って JSX を返す関数。名前は大文字で始める。
- JSX は `jsx('li', { … })` のような関数の呼び出しに変わる式。`{ }` の中に式を書け、文字は自動でエスケープされる。
- 配列は `map` で並べ、`key` にデータの id を渡す。
- 出し分けは早めの `return`・`&&`・3項演算子。`&&` の左は真偽値にする。
- `useState` で state を持ち、`set…` で変えると、React がそのコンポーネントを呼び直して画面を作り直す。
- 入力欄は `value` と `onChange` で state とつなぐ（制御されたコンポーネント）。
- 兄弟で使う state は共通の親に置き、値は props で下へ、変更は関数で上へ伝える。state の配列やオブジェクトは新しく作って渡す。

## 練習問題

[exercises/README.md](exercises/README.md) に8問あります（基本4問・応用3問・発展1問）。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- React 公式「クイックスタート」: https://ja.react.dev/learn
- React 公式「UI の記述」（JSX・props・条件・リスト）: https://ja.react.dev/learn/describing-the-ui
- React 公式「インタラクティビティの追加」（イベント・state）: https://ja.react.dev/learn/adding-interactivity
- React 公式「state の共有」（state のリフトアップ）: https://ja.react.dev/learn/sharing-state-between-components
- Testing Library「Queries の優先順位」（英語）: https://testing-library.com/docs/queries/about#priority

---

前: [第40章 ビルドツール](../ch40-build-tools/README.md) ／ 次: [第42章 Hooks と再描画の仕組み](../ch42-hooks/README.md) ／ 部の目次: [第8部 フロントエンドと React](../README.md)
