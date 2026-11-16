# 第42章 Hooks と再描画の仕組み

第41章では、`useState` で state を持ち、`set…` を呼ぶと画面が変わることを見ました。この章では、その裏で **いつ・何が** 呼び直されているのかを確かめます。そのうえで、タイマーやイベントのような「React の外」とつなぐ `useEffect`、描画に使わない値を持つ `useRef`、重い計算を覚えておく `useMemo`、自分で作る **カスタムフック**、state の変え方を1か所にまとめる `useReducer` を学びます。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 5〜6時間 |
| 前提 | 第41章 |
| この章のゴール | 再描画で何が呼び直されるかを説明できる / state がスナップショットであることと、更新関数の使いどころを説明できる / 配列やオブジェクトの state を、元を変えずに変えられる / `useEffect` で外とつなぎ、後片付けを書ける / `useEffect` が要らない場面を見分けられる / `useRef` で DOM を指せる / カスタムフックを作れる / `useReducer` で state の変え方をまとめられる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形（`app/`） |
| [exercises/](exercises/) | 練習問題（テストで確かめる） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、`~/dev/part08/ch42-hooks/` で実行します。手を動かして作るフォルダ（`app/`）は、このフォルダの直下に作ります。
>
>   ```sh
>   $ cd ~/dev/part08/ch42-hooks
>   ```
>
> - この章でも、API は使いません。API とつなぐのは第43章です。
> - この章では、DevTools の **Console** をずっと開いておきます。「いつ描画されたか」を、Console に出して確かめるからです。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| 再描画とスナップショット（1・2節） | 第43〜46章のすべての画面（「なぜ古い値が見えるのか」を考えるとき） |
| 配列・オブジェクトを変えずに新しく作る（2.4節） | 第43章（API から読んだ一覧を、楽観的に書き換える） |
| `useEffect` と後片付け（3節） | 第43章（fetch の競争を止める、SSE を開いて閉じる）、第46章（サーバでは Effect が動かない） |
| `useEffect` が要らない場面（4節） | 第43章（読み込みは TanStack Query に任せる）、第44章（URL から計算する） |
| カスタムフック（7節） | 第43章（`useTasks`・`useDebounce`）、第44章（`useFilters`）、第8部の成果物 |
| `useReducer`（8節） | 第44章（Context と組み合わせる） |

---

## 1. 描画とは、コンポーネントを呼ぶこと

### 1.1 手を動かす: 実験用の app を作る

第41章の `app` と同じ設定で、新しい `app` を作ります。

```sh
$ mkdir -p app/src
$ cp ../ch41-react-basics/app/vite.config.ts ../ch41-react-basics/app/tsconfig.json app/
$ cd app
```

- `cp ファイル… フォルダ/` は、ファイルをフォルダへコピーします。第41章の `app` を作っていなければ、`../ch41-react-basics/samples/app/` からコピーしてください。

`app/index.html` は、第41章の `<title>` を `Hooks の実験` に変えたものです。

```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>Hooks の実験</title>
  </head>
  <body>
    <div id="root"></div>
    <script type="module" src="/src/main.tsx"></script>
  </body>
</html>
```

`app/src/main.tsx` は、第41章と同じです。

```tsx
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { App } from './App.tsx';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <App />
  </StrictMode>,
);
```

`app/src/App.tsx` を作ります。4つの実験を、上のボタンで切り替える画面です。4つの部品は、この後の節で1つずつ作ります（作るまでは、`import` の行と、`{demo === … && …}` の行をコメントにしておいてください）。

```tsx
import { useState } from 'react';
import { Board } from './Board.tsx';
import { Clock } from './Clock.tsx';
import { SearchBox } from './SearchBox.tsx';
import { Snapshot } from './Snapshot.tsx';

const DEMOS = { snapshot: 'スナップショット', clock: '時計', search: '検索', board: 'タスク' } as const;
type Demo = keyof typeof DEMOS;

export function App() {
  const [demo, setDemo] = useState<Demo>('snapshot');
  console.log('App を描画', demo);

  return (
    <main>
      <h1>Hooks の実験</h1>
      <nav>
        {(Object.keys(DEMOS) as Demo[]).map((d) => (
          <button key={d} type="button" aria-pressed={d === demo} onClick={() => setDemo(d)}>
            {DEMOS[d]}
          </button>
        ))}
      </nav>
      {demo === 'snapshot' && <Snapshot />}
      {demo === 'clock' && <Clock />}
      {demo === 'search' && <SearchBox />}
      {demo === 'board' && <Board />}
    </main>
  );
}
```

```sh
$ npx vite
```

http://localhost:5173/ を開き、Console を見ます。`App を描画 snapshot` が **2回** 出ます（2回目は薄い色）。2回出る理由は 3.4節で説明します。ボタンを押すと、押すたびに `App を描画 clock` のように出ます。

### 1.2 描画の流れ

`setDemo('clock')` を呼んでから画面が変わるまでに、React は次のことをします。

| 段階 | すること |
| --- | --- |
| 1. きっかけ | `setDemo` が呼ばれ、「`App` を描き直す」と予定に入れる |
| 2. 描画（render） | `App` 関数を**もう一度呼び**、新しい JSX を受け取る。子のコンポーネントも呼ぶ |
| 3. 反映（commit） | 前の JSX と比べ、違うところだけ DOM を変える |
| 4. Effect | 画面に出た後で、`useEffect` に書いた処理を動かす（3節） |

大事なのは、**描画とは、コンポーネントの関数を呼ぶことだ**という点です。関数を呼び直すたびに、中の変数（`const DEMOS` 以外の `const`・`let`）は新しく作られます。`useState` の値だけが、React の中に保存されていて、次の呼び出しに引き継がれます。

そのため、描画の中（コンポーネントの関数の本体）では、**外のものを変えてはいけません**。何回呼ばれても、同じ props と state なら同じ JSX を返す関数にしておきます（**純粋**な関数）。外を変える処理は、イベントの関数か、`useEffect` に書きます。

| 書く場所 | 書いてよいもの |
| --- | --- |
| コンポーネントの本体（描画） | props と state から JSX を計算すること |
| イベントの関数（`onClick` など） | `set…` を呼ぶ、API を呼ぶ、外を変える（利用者の操作がきっかけのこと） |
| `useEffect` | 外とつなぐ（画面に出ていることがきっかけのこと。3節） |

---

## 2. state はスナップショット

### 2.1 手を動かす: 3回足す

`app/src/Snapshot.tsx` を作ります（`useRef` の行は 5.2節で、`useEffect` は 3.1節で説明します。先に全部書いてかまいません）。

```tsx
import { useEffect, useRef, useState } from 'react';

export function Snapshot() {
  const [count, setCount] = useState(0);
  const [message, setMessage] = useState('');
  // 5.2節: タイマーの番号。画面には出さないので state にしない（変えても描き直さない）
  const timerRef = useRef<ReturnType<typeof setTimeout> | undefined>(undefined);

  // 3.1節: 描画のあと、タブの題名を count に合わせる
  useEffect(() => {
    document.title = `count: ${count}`;
  }, [count]);

  function addThreeWrong() {
    // 3回とも「この描画の count」（たとえば 0）に 1 を足すので、0 + 1 を3回入れるだけ
    setCount(count + 1);
    setCount(count + 1);
    setCount(count + 1);
  }

  function addThree() {
    // 更新関数: React が「その時点の最新の値」を n に渡してくれる
    setCount((n) => n + 1);
    setCount((n) => n + 1);
    setCount((n) => n + 1);
  }

  function showLater() {
    // 3秒後に動いても、見えるのは「ボタンを押したときの描画」の count
    // 5.2節: 前のタイマーが残っていたら止めてから、新しく始める
    clearTimeout(timerRef.current);
    timerRef.current = setTimeout(() => setMessage(`押したときの count は ${count}`), 3000);
  }

  console.log('Snapshot を描画', count);
  return (
    <section>
      <h2>count: {count}</h2>
      <button type="button" onClick={addThreeWrong}>+3（まちがい）</button>
      <button type="button" onClick={addThree}>+3</button>
      <button type="button" onClick={showLater}>3秒後に表示</button>
      <p>{message}</p>
    </section>
  );
}
```

`App.tsx` の `Snapshot` のコメントを外し、ブラウザで次を試します。

1. 「+3（まちがい）」を押す → **1** しか増えない。
2. 「+3」を押す → 3 増える。
3. 「3秒後に表示」を押し、すぐに「+3」を何回か押す → 3秒後に出るのは、**「3秒後に表示」を押したときの数**。

`count` は、描画のたびに React が渡す、**その描画の時点の写真（スナップショット）**です。`addThreeWrong` の中の `count` は、何回 `setCount` を呼んでも、押したときの描画の値（たとえば 0）のままです。そのため、`setCount(0 + 1)` を3回呼んでいることになります。`setTimeout` の中の `count` も、押したときの描画の値です。

### 2.2 まとめて描き直す

`setCount` は、state をその場で変えません。「次の描画では、この値を使って」と React に**頼む**だけです。React は、イベントの関数が終わるまで頼みを貯めておき、終わってから **1回だけ** 描き直します（まとめて更新、**batching**）。そのため、Console の `Snapshot を描画` は、1回押すごとに1回（StrictMode では2回）しか出ません。

### 2.3 更新関数

前の値から次の値を作るときは、値のかわりに**関数**を渡します（**更新関数**）。

```tsx
setCount((n) => n + 1);
```

React は、貯めた頼みを順に処理するときに、「その時点の最新の値」を `n` に渡します。そのため、3回呼ぶと 0 → 1 → 2 → 3 になります。

| 書き方 | 使う場面 |
| --- | --- |
| `setCount(5)`・`setTitle('')` | 前の値に関係なく決まる値にする |
| `setCount((n) => n + 1)` | 前の値から次の値を作る（特に、同じイベントで何回も変えるとき、タイマーの中で変えるとき） |

`useState` の最初の値にも、関数を渡せます。`useState(() => new Date())` のように書くと、その関数は**最初の描画のときだけ**呼ばれます。`useState(new Date())` だと、使わないのに描画のたびに `new Date()` が作られます。重い計算や `localStorage` を読む処理は、関数にしておきます（練習問題6）。

### 2.4 配列とオブジェクトは、新しく作って渡す

React は、`set…` に渡された値が、前の値と同じもの（`Object.is` で同じ）なら、描き直しを省きます。配列やオブジェクトの中身を書き換えて、同じ配列を渡すと、**変わったことに気づきません**。

```tsx
// ✗ 同じ配列のまま中を変える（描き直されない）
tasks.push(newTask);
setTasks(tasks);

// ○ 新しい配列を作る
setTasks([...tasks, newTask]);
```

よく使う形を表にします。どれも、元の配列とオブジェクトを変えずに、新しいものを返します。

| したいこと | 書き方 |
| --- | --- |
| 後ろに足す | `[...tasks, t]` |
| 1つだけ変える | `tasks.map((t) => (t.id === id ? { ...t, done: true } : t))` |
| 除く | `tasks.filter((t) => t.id !== id)` |
| 1か所を替える | `tasks.with(i, t)`（ES2023） |
| 並べ替える | `tasks.toSorted(比べる関数)`（ES2023。`sort` は元の配列を変える） |
| オブジェクトの1項目を変える | `{ ...filter, status: 'done' }` |

`map` の形では、変えたタスクだけが新しいオブジェクトになり、変えなかったタスクは**同じオブジェクトのまま**新しい配列に入ります。全部をコピーしなくてよいので、速く、メモリも使いません（練習問題3）。

---

## 3. useEffect で外とつなぐ

### 3.1 描いた後に動かす

タブの題名（`document.title`）は、React が作る DOM の外にあります。「`count` が変わったら、タブの題名も合わせる」は、描画の中では書けません（描画は外を変えない約束です）。このように、**画面に出ている間、React の外と合わせておく**処理を書くのが `useEffect` です。`Snapshot.tsx` の、この部分です。

```tsx
useEffect(() => {
  document.title = `count: ${count}`;
}, [count]);
```

- 1つ目の引数（**Effect**）は、描画が画面に反映された**後で**呼ばれます。
- 2つ目の引数（**依存配列**）は、「この値が前の描画から変わったときだけ、もう一度動かす」という値の並びです。

ボタンを押して、タブの題名が変わることを確かめます。

### 3.2 手を動かす: 時計と後片付け

`setInterval`（第2部 第9章）で1秒ごとに時刻を変える時計を作ります。まず `app/src/hooks.ts` を作ります（`useWindowWidth` は 3.3節で、「フック」という名前は7節で説明します）。

```ts
import { useEffect, useState } from 'react';

// 今の時刻を返し、ms ごとに描き直させる
export function useNow(ms = 1000): Date {
  const [now, setNow] = useState(() => new Date());
  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), ms);
    return () => clearInterval(id);
  }, [ms]);
  return now;
}

// ウィンドウの幅を返し、幅が変わったら描き直させる
export function useWindowWidth(): number {
  const [width, setWidth] = useState(() => window.innerWidth);
  useEffect(() => {
    const onResize = () => setWidth(window.innerWidth);
    window.addEventListener('resize', onResize);
    return () => window.removeEventListener('resize', onResize);
  }, []);
  return width;
}
```

`app/src/Clock.tsx` を作り、`App.tsx` の `Clock` のコメントを外します。

```tsx
import { useState } from 'react';
import { useNow, useWindowWidth } from './hooks.ts';

function Ticker() {
  const now = useNow(1000);
  const width = useWindowWidth();
  return (
    <p>
      {now.toLocaleTimeString('ja-JP')}（ウィンドウの幅 {width}px）
    </p>
  );
}

export function Clock() {
  const [shown, setShown] = useState(true);
  return (
    <section>
      <h2>時計</h2>
      <label>
        <input type="checkbox" checked={shown} onChange={(e) => setShown(e.target.checked)} /> 時計を出す
      </label>
      {shown && <Ticker />}
    </section>
  );
}
```

`useNow` の Effect は、`setInterval` を始めた後で、**関数を返して**います。これが**後片付け**（cleanup）です。React は、後片付けを次のときに呼びます。

| いつ | なぜ |
| --- | --- |
| そのコンポーネントが画面から消えるとき（「時計を出す」のチェックを外す） | もう要らないタイマーを止める |
| 依存配列の値が変わって、Effect をもう一度動かす前 | 前のタイマーを止めてから、新しいタイマーを始める |

後片付けを忘れると、時計が消えた後も `setInterval` が動き続けます。つないだら、必ず外すと覚えておきます。Python の `with` 文（入るときに開き、出るときに必ず閉じる）や、`try … finally` と同じ考え方です。

| つなぐ | 後片付け |
| --- | --- |
| `setInterval`・`setTimeout` | `clearInterval`・`clearTimeout` |
| `addEventListener` | `removeEventListener` |
| `new EventSource(…)`（第39章） | `source.close()` |
| fetch を始める | 結果を使わないようにする（第43章） |

### 3.3 依存配列

`useWindowWidth` の Effect の依存配列は `[]` です。

| 依存配列 | Effect が動くとき |
| --- | --- |
| `[]` | 画面に出たときに1回だけ（後片付けは、消えるときに1回） |
| `[a, b]` | 画面に出たときと、`a` か `b` が前の描画から変わったとき |
| 書かない | 描画のたびに毎回 |

依存配列には、**Effect の中で使っている、props・state・それらから計算した値を全部**入れます。`useNow` は `ms` を使うので `[ms]` です。足りないと、Effect の中で古いスナップショットを使い続けることになります。`useWindowWidth` の Effect は、props も state も使っていない（`setWidth` は、React が描画のたびに同じものを渡すので、入れなくてよい）ので `[]` です。

ブラウザの幅を変えて、時計の横の数が変わることを確かめます。

### 3.4 StrictMode は、わざと2回動かす

`main.tsx` の `<StrictMode>` で包んだコンポーネントは、**開発中だけ**、次のことをされます。

- 描画（コンポーネントの関数）を2回呼ぶ。描画の中で外を変えていると、2回変わるので気づける。
- 画面に出したとき、Effect を「動かす → 後片付け → もう一度動かす」。後片付けを忘れていると、タイマーが2つ残るので気づける（練習問題4の問3）。

`npx vite build` で作った本番用のファイルでは、どちらも起きません。Console に2回出ても、まちがいではありません。

### 3.5 Hooks の決まりと ESLint

`useState`・`useEffect` など、`use` で始まる関数を **Hooks**（フック）と呼びます。React は、フックを「そのコンポーネントの中で、何番目に呼ばれたか」で見分けています。そのため、次の決まりがあります。

- フックは、コンポーネントかカスタムフック（7節）の**一番上の階層**で呼ぶ。`if`・`for`・`return` の後・イベントの関数の中では呼ばない（描画のたびに、同じ順番で呼ばれるようにする）。
- 普通の関数の中では呼ばない。

この決まりと、依存配列の書き忘れは、ESLint の `eslint-plugin-react-hooks` が見つけます。第8部のフォルダの [eslint.config.js](../eslint.config.js) は、第7部の設定にこれを足したものです。

```sh
$ npx eslint src
```

試しに、`Snapshot.tsx` の依存配列を `[]` にして実行すると、`React Hook useEffect has a missing dependency: 'count'.` と警告されます（確かめたら戻します）。

---

## 4. useEffect が要らない場面

`useEffect` は「外とつなぐ」ための道具です。React の中だけで済むことに使うと、描画が1回余計に増え、値がずれる原因になります。

| したいこと | ✗ Effect で書く | ○ こう書く |
| --- | --- | --- |
| state から計算できる値を出す | `useEffect(() => setRemaining(…), [tasks])` | 描画の中で `const remaining = tasks.filter(…).length` |
| ボタンを押したら送る | `useEffect(() => { if (submitted) post(…) }, [submitted])` | `onClick` の中で `post(…)` |
| props が変わったら、子の state を最初に戻す | `useEffect(() => setDraft(''), [taskId])` | 親で `<Editor key={taskId} />`（`key` が変わると、別の部品として作り直される） |

`app/src/tasksReducer.ts` と `app/src/Board.tsx` は8節で作りますが、`Board.tsx` の「残り 1 件」は、1つ目の形（描画の中で計算）です。

ESLint（3.5節）は、Effect の中ですぐ `set…` を呼ぶ書き方も、`Calling setState synchronously within an effect` というエラー（`react-hooks/set-state-in-effect`）で知らせてくれます。

---

## 5. useRef

### 5.1 DOM を指す

ボタンを押したら入力欄にフォーカスを移す、のように、React の外で DOM を直接さわりたいことがあります。`useRef` で入れ物を作り、JSX の `ref` に渡すと、画面に出た後、`入れ物.current` にその DOM の要素が入ります。

`app/src/SearchBox.tsx` を作り、`App.tsx` の `SearchBox` のコメントを外します（`useMemo` は6節で説明します）。

```tsx
import { useMemo, useRef, useState } from 'react';

// 5,000 件のタスク（実験用）
const TASKS = Array.from({ length: 5000 }, (_, i) => ({ id: i + 1, title: `タスク ${i + 1}` }));

// わざと遅くした絞り込み
function slowFilter(query: string) {
  const start = performance.now();
  while (performance.now() - start < 100) {
    // 100ms 何もしない（重い計算のかわり）
  }
  return TASKS.filter((t) => t.title.includes(query)).slice(0, 20);
}

export function SearchBox() {
  const [query, setQuery] = useState('');
  const [dark, setDark] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // query が変わったときだけ計算し直す。dark を切り替えても、前の結果を使う
  const found = useMemo(() => {
    console.log('絞り込み', query);
    return slowFilter(query);
  }, [query]);

  return (
    <section style={{ background: dark ? '#333' : '#fff', color: dark ? '#fff' : '#000' }}>
      <h2>検索</h2>
      <input ref={inputRef} value={query} onChange={(e) => setQuery(e.target.value)} aria-label="検索" />
      <button type="button" onClick={() => inputRef.current?.focus()}>検索欄へ</button>
      <button type="button" onClick={() => setDark(!dark)}>色を変える</button>
      <ul>
        {found.map((t) => (
          <li key={t.id}>{t.title}</li>
        ))}
      </ul>
    </section>
  );
}
```

「検索欄へ」を押すと、入力欄にフォーカスが移ります。`inputRef.current?.focus()` の `?.` は、まだ画面に出ていない（`null` の）ときに何もしないためです（第36章）。

### 5.2 描画に使わない値を持つ

`useRef` の入れ物には、DOM 以外の値も入れられます。`Snapshot.tsx` の `timerRef` は、`setTimeout` の番号を持っています。「3秒後に表示」を続けて押したとき、前のタイマーを止めるためです。

| | `useState` | `useRef` |
| --- | --- | --- |
| 変えると | 描き直す | 描き直さない |
| 読む・変える場所 | 描画の中で読み、イベントや Effect で変える | イベントや Effect の中だけ（**描画の中では読まない**） |
| 向いている値 | 画面に出す値 | 画面に出さない値（タイマーの番号、DOM の要素） |

描画の中で `ref.current` を読むと、変えても描き直されないので、画面と値がずれます。ESLint は、これを `Cannot access refs during render` として知らせます。

---

## 6. useMemo は、遅いと分かってから

`SearchBox.tsx` の `slowFilter` は、わざと 100ms かかるようにした絞り込みです。`useMemo(計算する関数, 依存配列)` は、依存配列の値が変わらない限り、前の結果を覚えておいて返します。

検索欄に打つと、Console に `絞り込み` が出ます。「色を変える」を押しても、`query` は変わらないので、`絞り込み` は出ず、色はすぐ変わります（`useMemo` を外すとどうなるかは、練習問題4の問6で確かめます）。

似た道具に、関数を覚えておく `useCallback` と、props が変わらなければ子の描画を省く `memo` があります。どれも、**遅いと分かったところだけ**に使います。

- たいていの計算は、描画のたびにやり直しても十分速い（1,000 件の `filter` は 1ms もかからない）。
- 覚えておくこと自体にも手間がかかり、依存配列の書き忘れという、まちがいの元が増える。
- 遅いかは、DevTools の **Performance** タブや、React Developer Tools の **Profiler** で測って確かめる。

React には、これらを自動で付ける **React Compiler** もあります。この教材では使いませんが、使うときも「描画は純粋に」「state は変えずに新しく作る」という、この章の決まりを守っていることが前提です。

---

## 7. カスタムフック

`hooks.ts` の `useNow` と `useWindowWidth` は、**自分で作ったフック**（カスタムフック）です。中身は、`useState` と `useEffect` を組み合わせただけの、普通の関数です。

- 名前は `use` で始めます。ESLint と React が「フックの決まり（3.5節）を守る関数」として扱います。
- 中で、ほかのフックを呼べます。
- **state は共有されません**。2つのコンポーネントで `useNow()` を呼ぶと、それぞれが自分のタイマーと state を持ちます。共有されるのは「state の扱い方」です。

`Clock.tsx` の `Ticker` は、`useNow(1000)` と書くだけで、タイマーの始め方も後片付けも気にせずに済んでいます。第43章では、API からタスクを読む `useTasks` を作ります。

---

## 8. useReducer で、state の変え方をまとめる

第41章の `App.tsx` では、`addTask`・`toggleTask` のように、タスクの配列を変える関数を、コンポーネントの中にいくつも書きました。変え方が増えると、コンポーネントが長くなり、どこで配列が変わるのかを探しにくくなります。

`useReducer` は、「**今の state** と **出来事（action）** を受け取って、**次の state** を返す関数（**reducer**）」に、変え方をまとめる道具です。`app/src/tasksReducer.ts` を作ります。

```ts
export type Task = { id: number; title: string; done: boolean };

export type Action =
  | { type: 'added'; title: string }
  | { type: 'toggled'; id: number }
  | { type: 'deleted'; id: number };

export function tasksReducer(tasks: Task[], action: Action): Task[] {
  switch (action.type) {
    case 'added': {
      const id = Math.max(0, ...tasks.map((t) => t.id)) + 1;
      return [...tasks, { id, title: action.title, done: false }];
    }
    case 'toggled':
      return tasks.map((t) => (t.id === action.id ? { ...t, done: !t.done } : t));
    case 'deleted':
      return tasks.filter((t) => t.id !== action.id);
  }
}
```

- action は、`type` で見分ける判別できるユニオン（第36章 2節）です。`switch` の `case` で `action.type` を絞ると、`action.title` や `action.id` が使えます。
- reducer は、外を変えない純粋な関数です。state を書き換えず、新しく作って返します（2.4節）。StrictMode では、reducer も2回呼ばれます。
- React も画面も使っていないので、普通の関数としてテストできます（練習問題7）。

`app/src/Board.tsx` を作り、`App.tsx` の `Board` のコメントを外します。

```tsx
import { useReducer, useState } from 'react';
import { tasksReducer, type Task } from './tasksReducer.ts';

const initialTasks: Task[] = [
  { id: 1, title: '牛乳を買う', done: false },
  { id: 2, title: '本を返す', done: true },
];

export function Board() {
  const [tasks, dispatch] = useReducer(tasksReducer, initialTasks);
  const [title, setTitle] = useState('');
  // 4節: tasks から計算できる値は、state にせず、描画のたびに計算する
  const remaining = tasks.filter((t) => !t.done).length;

  return (
    <section>
      <h2>タスク（残り {remaining} 件）</h2>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          if (title.trim() === '') return;
          dispatch({ type: 'added', title: title.trim() });
          setTitle('');
        }}
      >
        <input value={title} onChange={(e) => setTitle(e.target.value)} aria-label="題名" />
        <button>追加</button>
      </form>
      <ul>
        {tasks.map((t) => (
          <li key={t.id}>
            <label>
              <input type="checkbox" checked={t.done} onChange={() => dispatch({ type: 'toggled', id: t.id })} /> {t.title}
            </label>{' '}
            <button type="button" onClick={() => dispatch({ type: 'deleted', id: t.id })}>削除</button>
          </li>
        ))}
      </ul>
    </section>
  );
}
```

`useReducer(reducer, 最初の state)` は、`[state, dispatch]` を返します。`dispatch({ type: 'added', title })` と、**何が起きたか**を伝えると、React が reducer を呼んで次の state を作り、描き直します。コンポーネントには「何が起きたか」だけが書かれ、「state をどう変えるか」は reducer にまとまります。

| | `useState` | `useReducer` |
| --- | --- | --- |
| 向いている state | 1つの値、変え方が少ない | 変え方が多い配列やオブジェクト、いくつかの値を一緒に変える |
| 変え方を書く場所 | イベントの関数の中（あちこち） | reducer の1か所 |

---

## 9. テストで確かめる（練習問題の準備）

練習問題のテストでは、第41章の道具に加えて、次のものを使います。

| 書き方 | すること |
| --- | --- |
| `renderHook(() => useLocalStorage('k', 0))` | カスタムフックを、テスト用の小さなコンポーネントの中で呼ぶ。`result.current` が、フックの返した値 |
| `act(() => …)` | 「この中で state を変えたので、描き直しが終わるまで待って」と React に伝える |
| `vi.useFakeTimers()`・`vi.advanceTimersByTime(3000)` | 偽物の時計に替え、時間を一気に 3 秒進める（本当には待たない） |
| `render(<StrictMode>…</StrictMode>)` | StrictMode で描き、後片付けの書き忘れを見つける |
| `fireEvent.click(ボタン)`・`fireEvent.change(入力欄, { target: { value: 'a' } })` | イベントを1つだけ起こす（偽物の時計と組み合わせやすい） |

## まとめ

- 描画とは、コンポーネントの関数を呼ぶこと。描画は純粋にし、外を変える処理はイベントの関数か `useEffect` に書く。
- state は、その描画のスナップショット。`set…` は次の描画を頼むだけで、イベントの終わりにまとめて描き直される。前の値から作るときは、更新関数 `set…((v) => …)` を使う。
- 配列やオブジェクトの state は、`...`・`map`・`filter`・`with`・`toSorted` で新しく作って渡す。
- `useEffect` は、画面に出ている間、外と合わせておくための道具。つないだら、後片付けで外す。依存配列には、中で使う値を全部入れる。StrictMode は、後片付けの書き忘れを見つけるために、わざと2回動かす。
- 計算できる値・イベントがきっかけの処理・state を最初に戻すこと（`key`）には、`useEffect` は要らない。
- `useRef` は、DOM を指すときと、描画に使わない値を持つときに使う。描画の中では読まない。
- `useMemo` などは、遅いと測ってから使う。
- カスタムフックで、state の扱い方を名前の付いた関数にまとめる。`useReducer` で、state の変え方を1か所にまとめる。

## 練習問題

[exercises/README.md](exercises/README.md) に8問あります（基本4問・応用3問・発展1問）。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- React 公式「レンダーとコミット」: https://ja.react.dev/learn/render-and-commit
- React 公式「state はスナップショットである」: https://ja.react.dev/learn/state-as-a-snapshot
- React 公式「state 内の配列の更新」: https://ja.react.dev/learn/updating-arrays-in-state
- React 公式「エフェクトを使って同期を行う」: https://ja.react.dev/learn/synchronizing-with-effects
- React 公式「そのエフェクトは不要かもしれない」: https://ja.react.dev/learn/you-might-not-need-an-effect
- React 公式「カスタムフックでロジックを再利用する」: https://ja.react.dev/learn/reusing-logic-with-custom-hooks
- React 公式「state ロジックをリデューサに抽出する」: https://ja.react.dev/learn/extracting-state-logic-into-a-reducer

---

前: [第41章 React の基礎](../ch41-react-basics/README.md) ／ 次: [第43章 データ取得とフォーム](../ch43-data-forms/README.md) ／ 部の目次: [第8部 フロントエンドと React](../README.md)
