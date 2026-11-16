# 第39章 素の JavaScript で API とつなぐ

第5〜7部で、タスク管理の API を作りました。この部では、その API を使う**画面**（フロントエンド）を作ります。
いきなり React を使う前に、この章では、ライブラリを使わない**素の JavaScript** で画面を作ります。DOM の要素を作る、`fetch` で API を呼ぶ、フォームで送る、SSE で知らせを受け取る、を自分の手で書くと、「何がめんどうで、React は何を代わりにしてくれるのか」が分かります。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 5〜6時間 |
| 前提 | 第2部 第9章（ブラウザと DevTools・CORS）、第4部 第21章（エスケープ）、第5部 第25・27章（API の形・SSE） |
| この章のゴール | DOM の要素を作って画面に出せる / `textContent` と `innerHTML` の違いを説明できる / `fetch` で API を呼び、失敗（problem+json）を扱える / 「読み込み中・失敗・成功」を状態として持ち、状態から画面を作れる / フォームの送信を `fetch` に置き換えられる / `If-Match` と SSE で、画面とサーバのずれを減らせる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形 |
| [exercises/](exercises/) | 練習問題（テストで確かめる） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - 第8部の最初の章です。1節で、第8部のフォルダを `~/dev/part08` にコピーし、React などのパッケージを入れます（1回だけ）。
> - この章のコマンドは、`~/dev/part08/ch39-vanilla-api/` で実行します。手を動かして作るファイルは、このフォルダの直下に置きます。
> - この章では、**ターミナルを3つ**使います（練習用の API・ファイルのサーバ・コマンド用）。ターミナルのアプリで ⌘T を押すと、新しいタブが開きます。
> - この章の画面のコードは、**JavaScript**（`.js`）で書きます。ブラウザは TypeScript をそのまま読めないからです。TypeScript で書けるようにするのは、次の第40章（ビルドツール）です。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| DOM の要素を作る・`textContent`（2節） | 第41章（React の JSX が、代わりに作る。エスケープも自動）、第58章（テストで画面の中身を確かめる） |
| `fetch` と problem+json（3節） | 第43章（TanStack Query の中で同じ `fetch` を使う）、第8部の成果物 |
| 状態から画面を作る（4節） | 第41・42章（React の「状態が変わると作り直す」）、第36章の判別できるユニオン |
| フォームを `fetch` で送る（5節） | 第43章（React のフォーム）、第10部（ログインのフォーム） |
| `If-Match` と 412（6節）・SSE（7節） | 第43章（読み直しと楽観的な更新）、第8部の成果物 |

---

## 1. 準備

### 1.1 手を動かす: 第8部のフォルダを作る

第8部のサンプルと練習問題は、React・Vite・Vitest などの外部のパッケージを使います。第5〜7部と同じく、**第8部のフォルダを `~/dev/part08` にコピーし、そこで動かします**。次を1回だけ実行します。

```sh
$ bash （ここに Finder から part08-react フォルダの中の setup-part08.sh をドラッグ）
（npm ci の出力）
作りました: /Users/alice/dev/part08
  次は: cd /Users/alice/dev/part08/ch39-vanilla-api
```

- `setup-part08.sh` は、教材の `part08-react` フォルダを `~/dev/part08` にコピーし、`npm ci` で [package.json](../package.json) に書いたパッケージを入れます。`~/dev/part08` が既にあれば、何もしません。

### 1.2 手を動かす: 練習用の API を動かす

この部の章では、第7部の成果物と同じ API を、**データベースなしで**動かしたもの（練習用の API）を使います。データはメモリに置くので、止めると消えます。起動するたびに、例のタスクが5つ入ります。

1つ目のターミナルで、次を実行します。

```sh
$ cd ~/dev/part08
$ npm run api
練習用の API: http://127.0.0.1:9500/api/tasks （止めるのは Ctrl+C）
```

- `npm run api` は、[package.json](../package.json) の `scripts` の `api`（`node api/server.ts`）を動かします。中身は [../api/](../api/) です（第7部の成果物の `src/` に、メモリのデータの層を足したもの）。
- このターミナルは、API を動かしたままにしておきます。

2つ目のターミナル（⌘T）で、API が答えるか確かめます。

```sh
$ curl -s http://127.0.0.1:9500/api/tasks
{"items":[{"id":1,"title":"牛乳を買う","status":"todo","dueDate":"2026-11-12",…
```

### 1.3 手を動かす: ファイルのサーバを動かす

ブラウザで HTML を開くには、ファイルを HTTP で配るサーバが要ります（`file://` で開くと、`<script type="module">` が動きません）。第4部 第19章で作ったものと同じ、小さなサーバ（[../tools/serve.ts](../tools/serve.ts)）を使います。2つ目のターミナルで、次を実行します。

```sh
$ cd ~/dev/part08/ch39-vanilla-api
$ node ../tools/serve.ts
http://localhost:5173/ で /Users/alice/dev/part08/ch39-vanilla-api を配っています（止めるのは Ctrl+C）
```

- 今いるフォルダのファイルを、`http://localhost:5173/ファイル名` で配ります。このターミナルも、動かしたままにします。
- 3つ目のターミナル（⌘T）を開き、`cd ~/dev/part08/ch39-vanilla-api` しておきます。ファイルを作るのは、このターミナルとエディタ（VS Code）です。

## 2. データから DOM の要素を作る

### 2.1 手を動かす: 要素を作って並べる

ブラウザは、HTML を読むと、**DOM**（Document Object Model）という「要素の木」を作ります。JavaScript から、この木に要素を足したり消したりすると、画面が変わります（第2部 第9章）。

`dom.html` を作ります。

```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>DOM を作る</title>
  </head>
  <body>
    <h1>タスク</h1>
    <ul id="tasks"></ul>
    <script type="module" src="dom.js"></script>
  </body>
</html>
```

`dom.js` を作ります。

```js
const tasks = [
  { id: 1, title: '牛乳を買う', status: 'todo', dueDate: '2026-11-20' },
  { id: 2, title: '<b>太字？</b>', status: 'doing', dueDate: null },
];

/** タスク1つ分の <li> を作る */
function renderTask(task) {
  const li = document.createElement('li');
  li.textContent = task.title; // 文字として入れる（< や > も、そのまま文字で出る）
  if (task.dueDate !== null) {
    const small = document.createElement('small');
    small.textContent = ` 締め切り: ${task.dueDate}`;
    li.append(small);
  }
  li.dataset.status = task.status; // <li data-status="todo">
  return li;
}

const ul = document.querySelector('#tasks');
ul.replaceChildren(...tasks.map(renderTask));
```

ブラウザで http://localhost:5173/dom.html を開きます。

```text
タスク
・牛乳を買う 締め切り: 2026-11-20
・<b>太字？</b>
```

| 書き方 | すること |
| --- | --- |
| `document.querySelector('#tasks')` | CSS のセレクタ（`#id`・`.class`・`タグ名`）に合う、最初の要素を探す。無ければ `null` |
| `document.createElement('li')` | 新しい `<li>` を作る（まだ画面には無い） |
| `el.textContent = '文字'` | 中身を、**文字として**入れる |
| `el.append(a, b, '文字')` | 中の最後に、要素や文字を足す |
| `el.dataset.status = 'todo'` | `data-status="todo"` の属性を付ける（CSS の `li[data-status='done']` や、テストで使う） |
| `el.replaceChildren(...要素)` | 中身を全部消して、渡した要素に置き換える |

- `...tasks.map(renderTask)` は、配列を1つずつ引数に広げる書き方です（第3部 第11章のスプレッド構文）。

### 2.2 textContent と innerHTML

2つ目のタスクの題名 `<b>太字？</b>` は、太字にならず、`<` や `>` がそのまま文字で出ました。`textContent` は、入れたものを**いつも文字として**扱うからです。

`innerHTML` を使うと、入れた文字が **HTML として読まれます**。

```js
li.innerHTML = task.title; // <b>太字？</b> が太字になる
```

題名は、利用者が入れたものです。HTML として読むと、利用者が書いたタグがそのまま動きます。第4部 第21章の XSS（クロスサイトスクリプティング）です。**利用者が入れた文字は、`textContent` で入れます**。DevTools の Elements で見ると、`textContent` で入れた `<` は `&lt;` になっていて、タグになっていないのが分かります。

> 第41章の React（JSX）は、`{task.title}` と書くだけで、この「文字として入れる」を自動でします。

## 3. fetch で API を呼ぶ

### 3.1 手を動かす: 一覧を読む

ここからは、1つの画面 `app.html` と `app.js` を、節ごとに育てていきます。完成形は [samples/app.html](samples/app.html) と [samples/app.js](samples/app.js) です。

`app.html` を作ります。

```html
<!doctype html>
<html lang="ja">
  <head>
    <meta charset="utf-8" />
    <title>タスク（素の JavaScript）</title>
    <style>
      body { font-family: sans-serif; max-width: 40rem; margin: 2rem auto; }
      li[data-status='done'] .title { text-decoration: line-through; color: gray; }
      #form-error { color: crimson; }
    </style>
  </head>
  <body>
    <h1>タスク</h1>
    <form id="new-task">
      <input name="title" placeholder="やること" />
      <input name="dueDate" type="date" />
      <button>追加</button>
      <p id="form-error"></p>
    </form>
    <p id="status"></p>
    <ul id="tasks"></ul>
    <script type="module" src="app.js"></script>
  </body>
</html>
```

`app.js` を作ります（3節の分）。

```js
const API = 'http://127.0.0.1:9500';

const list = document.querySelector('#tasks');
const statusText = document.querySelector('#status');

class ApiError extends Error {
  constructor(status, problem) {
    super(problem.detail ?? problem.title ?? `HTTP ${status}`);
    this.status = status;
    this.problem = problem;
  }
}

async function request(path, options = {}) {
  const res = await fetch(API + path, options);
  if (!res.ok) {
    const problem = await res.json().catch(() => ({}));
    throw new ApiError(res.status, problem);
  }
  return res.status === 204 ? null : res.json();
}

function renderTask(task) {
  const li = document.createElement('li');
  li.textContent = task.title;
  return li;
}

const page = await request('/api/tasks?limit=100&sort=dueDate');
list.replaceChildren(...page.items.map(renderTask));
statusText.textContent = `${page.items.length} 件`;
```

http://localhost:5173/app.html を開くと、練習用の API の5つのタスクが出ます。

| 書き方 | すること |
| --- | --- |
| `await fetch(URL, options)` | HTTP のリクエストを送り、応答（`Response`）を返す。**4xx・5xx でも失敗にならない**（つながらないときだけ失敗） |
| `res.ok` | ステータスが 200〜299 なら `true` |
| `await res.json()` | 本文を JSON として読む |
| `res.status === 204` | 本文の無い応答（DELETE の 204）。`res.json()` を呼ぶと失敗する |

- `fetch` は、404 や 500 でも、エラーを投げません。`res.ok` を見て、自分で `throw` します。投げるのは、第5部 第25章の problem+json の `detail`（無ければ `title`）を `message` にした `ApiError` です。
- `<script type="module">` の中では、関数の外でも `await` が書けます（トップレベル await。第3部 第14章）。

### 3.2 オリジンと CORS

画面は `http://localhost:5173`、API は `http://127.0.0.1:9500` から来ています。ホストもポートも違うので、**別のオリジン**です。ブラウザは、別のオリジンへの `fetch` の応答を、API が `Access-Control-Allow-Origin` で許したときだけ、JavaScript に見せます（第2部 第9章の CORS）。

DevTools の Network で `tasks?limit=…` の行を選び、Response Headers を見ます。

```text
Access-Control-Allow-Origin: http://localhost:5173
Access-Control-Expose-Headers: ETag,Location,…
```

練習用の API は、`http://localhost:5173` だけを許しています（[../api/server.ts](../api/server.ts) の `CORS_ORIGINS`）。第40章では、Vite の**プロキシ**で、画面と API を同じオリジンに見せる方法も学びます。

## 4. 読み込み中・失敗・成功を、状態から画面にする

### 4.1 手を動かす: 状態を1つのオブジェクトに

3節の `app.js` は、読み終わるまで何も出ず、API が止まっていると何も出ないまま終わります。画面には、少なくとも3つの**状態**があります。

| 状態 | 画面 |
| --- | --- |
| 読み込み中（`loading`） | 「読み込み中…」 |
| 失敗（`error`） | 「読み込めませんでした: 理由」 |
| 成功（`success`） | タスクの一覧 |

この3つを1つのオブジェクト `state` に持ち、**画面は state から毎回作る**ようにします。`app.js` の最後の3行（`const page = …` から下）を消して、次を足します。

```js
let state = { status: 'loading', tasks: [], error: null };

function setState(patch) {
  state = { ...state, ...patch };
  render();
}

function render() {
  if (state.status === 'loading') statusText.textContent = '読み込み中…';
  else if (state.status === 'error') statusText.textContent = `読み込めませんでした: ${state.error}`;
  else statusText.textContent = state.tasks.length === 0 ? 'タスクはありません' : `${state.tasks.length} 件`;
  list.replaceChildren(...state.tasks.map(renderTask));
}

async function load() {
  setState({ status: 'loading' });
  try {
    const page = await request('/api/tasks?limit=100&sort=dueDate');
    setState({ status: 'success', tasks: page.items, error: null });
  } catch (err) {
    setState({ status: 'error', error: err.message });
  }
}

load();
```

確かめます。

1. 1つ目のターミナルで API を Ctrl+C で止め、`API_DELAY_MS=1500 npm run api` で起動し直します（応答を 1.5 秒遅らせる）。ページを読み直すと、「読み込み中…」が見えてから一覧が出ます。
2. API を Ctrl+C で止めたまま、ページを読み直すと、「読み込めませんでした: Failed to fetch」が出ます。
3. `npm run api` で起動し直しておきます。

- `{ ...state, ...patch }` は、`state` の項目に、`patch` の項目を上書きした**新しい**オブジェクトです（第3部 第11章）。
- 画面を変えるのは `render` だけ、状態を変えるのは `setState` だけ、と決めておくと、「どこで画面が変わったか」を探さなくて済みます。この「状態 → 画面」の1方向の流れは、React の考え方そのものです（第41章）。

## 5. フォームで作る

### 5.1 手を動かす: submit を fetch に置き換える

`app.js` の `render` の後に、次を足します。

```js
const form = document.querySelector('#new-task');
const formError = document.querySelector('#form-error');

form.addEventListener('submit', async (event) => {
  event.preventDefault(); // ブラウザがページごと送り直すのを止める
  const data = new FormData(form);
  const body = { title: String(data.get('title')), dueDate: data.get('dueDate') || null };
  const button = form.querySelector('button');
  button.disabled = true; // 送っている間は、もう1回押せないように
  formError.textContent = '';
  try {
    await request('/api/tasks', { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
    form.reset();
    await load();
  } catch (err) {
    formError.textContent = err.problem?.errors?.[0]?.detail ?? err.message;
  } finally {
    button.disabled = false;
  }
});
```

題名に「洗濯」と入れて「追加」を押すと、一覧に足されます。題名を空のまま押すと、「title は 1〜100 文字です」が出ます（API の 422 の problem+json の `errors[0].detail`）。

| 書き方 | すること |
| --- | --- |
| `form.addEventListener('submit', fn)` | フォームが送られる（ボタンを押す・Enter を押す）ときに `fn` を呼ぶ |
| `event.preventDefault()` | ブラウザの決まりの動き（ページを読み直して送る）を止める |
| `new FormData(form)` | フォームの入力を `name` ごとに読む。`data.get('title')` |
| `data.get('dueDate') \|\| null` | 日付が空（`''`）なら `null`（API は `null` を「締め切りなし」と読む） |
| `err.problem?.errors?.[0]?.detail` | `?.` は、途中が `undefined` なら、そこで止めて `undefined` にする（第3部 第11章） |

- Flask で `<form method="post">` と書いたときは、ブラウザがページごと送り、サーバが新しい HTML を返していました。ここでは、ページを読み直さずに `fetch` で JSON を送り、画面の一部だけを変えています。

## 6. 画面とサーバのずれ

### 6.1 手を動かす: If-Match で変える・消す

画面に出ている一覧は、**読んだ時点の写し**です。ほかの人（ほかのタブ）が変えても、画面は自動では変わりません。古い写しを見たまま変えると、ほかの人の変更を上書きしてしまいます。第5部 第25章で、API に `If-Match`（読んだときの版）を求めるようにしたのは、これを防ぐためでした。

`renderTask` を、チェックボックスと削除のボタンを持つ形に替え、`toggle` と `remove` を足します（[samples/app.js](samples/app.js) の 2節と 6節の部分）。

```js
async function toggle(task) {
  try {
    await request(`/api/tasks/${task.id}`, {
      method: 'PATCH',
      headers: { 'Content-Type': 'application/json', 'If-Match': `"${task.version}"` },
      body: JSON.stringify({ status: task.status === 'done' ? 'todo' : 'done' }),
    });
  } catch (err) {
    alert(err.status === 412 ? 'ほかの画面で変えられていました。読み直します' : err.message);
  }
  await load();
}
```

確かめます。

1. ブラウザのタブを2つ開き、どちらも http://localhost:5173/app.html にします。
2. タブ A で「牛乳を買う」にチェックを付けます。タブ B の画面は、チェックが無いままです（古い写し）。
3. タブ B で、同じ「牛乳を買う」にチェックを付けます。「ほかの画面で変えられていました」が出て、読み直されます。

- タブ B は、`version` が 1 のときの写しを見ていました。サーバでは、タブ A が変えて 2 になっています。`If-Match: "1"` は今の ETag `"2"` と合わないので、API は 412 を返します。
- `alert` は、ボタンを押すまで止まる、ブラウザの小さな窓です。ここでは手早く知らせるために使いました（第45章で、使いやすい知らせ方を学びます）。

## 7. SSE でサーバから知らせを受け取る

### 7.1 手を動かす: EventSource

6節では、412 になってから読み直しました。もっと早く気づけるように、サーバから「変わった」という知らせを受け取ります。第5部 第27章の SSE（`/api/events`）を、ブラウザの `EventSource` で受け取ります。`app.js` の最後の `load();` の前に足します。

```js
const events = new EventSource(`${API}/api/events`);
events.addEventListener('task.created', (e) => {
  const task = JSON.parse(e.data);
  if (!state.tasks.some((t) => t.id === task.id)) setState({ tasks: [...state.tasks, task] });
});
events.addEventListener('task.updated', (e) => {
  const task = JSON.parse(e.data);
  setState({ tasks: state.tasks.map((t) => (t.id === task.id ? task : t)) });
});
events.addEventListener('task.deleted', (e) => {
  const task = JSON.parse(e.data);
  setState({ tasks: state.tasks.filter((t) => t.id !== task.id) });
});
events.addEventListener('reset', () => load()); // 送り直せないほど離れていたら、全部読み直す
```

タブを2つ開き、タブ A でチェックを付けると、タブ B もすぐに変わります。3つ目のターミナルから `curl` で作っても、両方のタブに出ます。

```sh
$ curl -s -X POST -H 'Content-Type: application/json' -d '{"title":"curl から"}' http://127.0.0.1:9500/api/tasks
```

| 書き方 | すること |
| --- | --- |
| `new EventSource(URL)` | SSE につなぐ。切れたら、自分でつなぎ直す（そのとき `Last-Event-ID` を送る） |
| `es.addEventListener('task.created', fn)` | `event: task.created` のイベントが来たら `fn(e)`。中身は `e.data`（文字列） |
| `es.close()` | やめる |

- 新しい状態は、いつも**新しい配列**で作ります（`[...配列, task]`・`map`・`filter`）。元の配列を書き換えない書き方は、第42章の React でも大事になります。
- SSE で知らせを受けても、写しであることは変わりません。知らせが届くまでの間に変えれば、やはり 412 になります。`If-Match` は、SSE があっても要ります。

## 8. 素の JavaScript のつらい所

ここまでで、画面は動きました。ただ、`app.js` を見ると、次のつらさがあります。

- **全部作り直す**: `render` は、1件変わっただけでも、`<li>` を全部作り直します。入力中の `<input>` が一覧の中にあれば、文字もフォーカスも消えます。
- **つなぎ忘れ**: 状態を変えたのに `render` を呼び忘れる、ボタンに `addEventListener` を付け忘れる、が起きやすい。
- **部品にしにくい**: `renderTask` の中から `toggle` を呼んでいて、部品を別の画面で使い回しにくい。
- **TypeScript で書けない**: ブラウザは `.ts` を読めない。第7部の型の守りが使えない。

次の第40章で、TypeScript とパッケージを使えるようにする**ビルドツール**（Vite）を、第41・42章で、「状態から画面を作る」を効率よくしてくれる **React** を学びます。

## 9. Flask と比べる

| | Flask（Jinja2 のテンプレート） | この章（素の JavaScript） |
| --- | --- | --- |
| HTML を作る場所 | サーバ。`render_template('tasks.html', tasks=tasks)` | ブラウザ。`document.createElement` |
| エスケープ | Jinja2 が `{{ task.title }}` を自動でエスケープ | `textContent` で入れる（`innerHTML` は自分で気をつける） |
| フォームを送る | ブラウザがページごと送り、サーバが新しい HTML を返す | `fetch` で JSON を送り、画面の一部だけを変える |
| 間違いを出す | サーバがエラーの文を入れた HTML を返す | problem+json を読んで、画面に入れる |
| 変わったことを知る | ページを読み直す | SSE（`EventSource`） |

Flask のアプリは、ページを開くたびにサーバが HTML を作り直す **MPA**（第2部 第10章）でした。この章の画面は、最初に HTML を1回だけ読み、後は JavaScript が画面を変える **SPA** の小さな形です。

## まとめ

- 画面は DOM の木。`createElement`・`append`・`replaceChildren` で作り、利用者が入れた文字は `textContent` で入れる。
- `fetch` は 4xx・5xx でも失敗しない。`res.ok` を見て、problem+json から自分のエラーを投げる。
- 別のオリジンの API は、API が CORS で許したときだけ、応答が読める。
- 「読み込み中・失敗・成功」を状態として持ち、画面は状態から作る。状態を変えるのは `setState` だけにする。
- フォームは `preventDefault` してから `fetch` で送る。送っている間はボタンを止める。
- 画面の一覧は写し。`If-Match` で古い写しからの上書きを防ぎ、SSE で早く気づく。

## 練習問題

[exercises/README.md](exercises/README.md) に8問あります（基本4問・応用3問・発展1問）。解答は [solutions/README.md](solutions/README.md) です。

## 参考資料

- MDN「DOM の紹介」: https://developer.mozilla.org/ja/docs/Web/API/Document_Object_Model/Introduction
- MDN「Fetch API の使用」: https://developer.mozilla.org/ja/docs/Web/API/Fetch_API/Using_Fetch
- MDN「FormData」: https://developer.mozilla.org/ja/docs/Web/API/FormData
- MDN「サーバー送信イベントの使用」: https://developer.mozilla.org/ja/docs/Web/API/Server-sent_events/Using_server-sent_events
- MDN「オリジン間リソース共有（CORS）」: https://developer.mozilla.org/ja/docs/Web/HTTP/Guides/CORS

---

前: [第7部の成果物 タスク管理 API を TypeScript に](../../part07-typescript/project-task-api/README.md) ／ 次: [第40章 ビルドツール](../ch40-build-tools/README.md) ／ 部の目次: [第8部 フロントエンドと React](../README.md)
