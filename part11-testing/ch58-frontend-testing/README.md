# 第58章 フロントエンドのテスト

第57章では、API を HTTP で確かめました。この章では、**画面**を確かめます。React の部品を Node.js の中のまねのブラウザ（jsdom）で描いて、人が見るもの（役割と名前）で探し、人と同じように打って押すテスト（Vitest + Testing Library）と、本物のブラウザで画面から API まで通して確かめるテスト（Playwright）を、小さなタスクの画面で手を動かして身につけます。第8部 第41章 8節で少し触れた Testing Library を、ここで本格的に使います。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 5〜6時間 |
| 前提 | 第56章、第57章、第8部 第41〜43章（React・Hooks・TanStack Query）、第8部 第45章（意味のある HTML・役割と名前） |
| この章のゴール | 部品を描いて、役割と名前で探せる / `getBy`・`queryBy`・`findBy` を使い分けられる / user-event で打って押し、props の関数が呼ばれたかを確かめられる / `fetch` を偽物にして、API を読む部品を確かめられる / フェイクタイマーと `renderHook` で、時間で動くフックを確かめられる / 不安定な画面のテストを直せる / Playwright で、本物のブラウザから API まで通して確かめられる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 練習用の画面（`app/`）と、本文で書くテストの完成形（`finished/`） |
| [exercises/](exercises/) | 練習問題（テストで確かめる） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - この章のコマンドは、`~/dev/part11/ch58-frontend-testing/` で実行します。
>
>   ```sh
>   $ cd ~/dev/part11/ch58-frontend-testing
>   ```
>
> - 1節で、練習用の画面 `samples/app` を `web/` にコピーし、以降は `web/` の中でテストを書きます。`web/` に入ってから打つコマンドは、そう書きます。
> - ポート: 手で動かす API は **9727**、画面（Vite）は **9728**。8節の E2E のテストは、それとぶつからない 9721・9722 で、自分で起動します。
> - 8節の Playwright は、最初にブラウザ（Chromium）をダウンロードします（数百 MB。8.1節）。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| 部品を役割と名前で探す（2・3節） | 成果物（第10部の画面の 34 個のテストを読み直す）、第13部 |
| user-event と、`fetch` の偽物（4・5節） | 成果物（ログイン・登録の画面のテスト） |
| 不安定なテストを避ける（7節） | 第59章（CI で何度も動かす） |
| Playwright の E2E（8節） | 成果物（登録 → メールのリンク → ログイン を自動で）、第59章（CI で動かす） |
| どこまでをどのテストで（9節） | 成果物、第13部（自分の題材のテストを決める） |

---

## 1. 画面のテストは、どこで動かすか

画面のテストには、大きく2つの動かし方があります。

| | 部品のテスト | E2E（エンドツーエンド）のテスト |
| --- | --- | --- |
| 道具 | **Vitest** + **jsdom** + **Testing Library** | **Playwright** |
| どこで動くか | Node.js の中。jsdom は、DOM（`document`・`HTMLElement` など）を JavaScript で作り直した「まねのブラウザ」 | 本物のブラウザ（Chromium など） |
| 何を描くか | 部品を1つ（`<TaskItem>` など） | 画面の全部。API も本物を起動する |
| 速さ | 1つ数十ミリ秒 | 1つ1秒ほど |
| 分からないこと | 見た目（CSS・はみ出し）、本物の通信、ページの移動 | 細かい場合分け（たくさん書くと遅い） |

jsdom には画面がありません。文字の大きさも、要素の位置も計算しません。だから、部品のテストでは「何が書かれているか」「押したら何が呼ばれるか」を確かめ、見た目と、全部をつないだ動きは E2E で確かめます（9節）。

**Flask では**: Flask のアプリは、サーバで HTML を作って返すことが多いので、`app.test_client()` で HTML を受け取り、文字が入っているかを確かめるのがふつうです。ブラウザで動く JavaScript は、そのテストでは動きません。ブラウザまで確かめたいときは、Selenium や pytest-playwright（Playwright の Python 版）を使います。この章の Playwright は、その Node.js 版です。

### 1.1 手を動かす: 確かめる画面を動かす

練習用の画面を `web/` にコピーします（`-R` はフォルダの中身ごと、の意味。第1章）。

```sh
$ cp -R samples/app web
$ cd web
$ node api-server.ts
http://127.0.0.1:9727/api/tasks で待っています
```

別のターミナルで、同じ `web/` に入って Vite を起動します（第8部 第40章）。

```sh
$ cd ~/dev/part11/ch58-frontend-testing/web
$ npx vite

  VITE v8.3.5  ready in 147 ms

  ➜  Local:   http://127.0.0.1:9728/
```

ブラウザで http://127.0.0.1:9728/ を開き、足す・チェックを付ける・消す、を試してください。

| ファイル | 中身 |
| --- | --- |
| [api-server.ts](samples/app/api-server.ts) | タスクの API（メモリ。最初は「牛乳を買う」と「第58章を読む」（完了）） |
| [src/api.ts](samples/app/src/api.ts) | API を呼ぶ関数（`fetchTasks`・`createTask`・`updateTask`・`deleteTask`）。失敗は `ApiError` |
| [src/TaskItem.tsx](samples/app/src/TaskItem.tsx) | タスク1つの行（チェックボックスと「消す」） |
| [src/AddTaskForm.tsx](samples/app/src/AddTaskForm.tsx) | タスクを足すフォーム（空なら送らない、送っている間は押せない） |
| [src/TaskListPanel.tsx](samples/app/src/TaskListPanel.tsx) | 一覧を読み、足す・切り替える・消す（TanStack Query） |
| [src/useDebouncedValue.ts](samples/app/src/useDebouncedValue.ts) | 値が変わってから少し待つフック（6節で使う） |
| [vite.config.ts](samples/app/vite.config.ts) | Vite の設定と、Vitest の設定（`test` の所） |

`vite.config.ts` の `test` の所は、Vitest の設定です。

```ts
  test: {
    environment: 'jsdom',
    include: ['src/**/*.test.{ts,tsx}'],
  },
```

| 書いたもの | 意味 |
| --- | --- |
| `environment: 'jsdom'` | テストのファイルを、jsdom の中で動かす（`document` が使える）。第8部では、ファイルの先頭の `// @vitest-environment jsdom` で決めた |
| `include` | `src` の `.test.ts`・`.test.tsx` だけをテストにする。8節の E2E のファイル（`e2e/`）は Vitest で動かさない |

試したら、2つのターミナルで `Ctrl+C` を押して止めます。

## 2. 部品を描いて、探して、確かめる

部品のテストの形は、第8部 第41章 8節と同じです。**描く**（`render`）→ **探す**（`screen.getByRole`）→ **確かめる**（`expect`）。

### 2.1 手を動かす: 最初の部品のテスト

`web/src/TaskItem.test.tsx` を作ります。

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { TaskItem } from './TaskItem.tsx';

afterEach(cleanup);

describe('TaskItem', () => {
  test('題名が、チェックボックスの名前になる', () => {
    render(<TaskItem task={{ id: 1, title: '牛乳を買う', done: false }} onToggle={vi.fn()} onDelete={vi.fn()} />);

    const checkbox = screen.getByRole<HTMLInputElement>('checkbox', { name: '牛乳を買う' });
    expect(checkbox.checked).toBe(false);
    expect(screen.queryByText('完了')).toBeNull();
  });
});
```

`web/` で動かします（`run` は「1回動かして終わる」。付けないと、ファイルを保存するたびに動かし直す見張りの形になります）。

```sh
$ npx vitest run src/TaskItem.test.tsx

 RUN  v4.1.12 /Users/alice/dev/part11/ch58-frontend-testing/web

 Test Files  1 passed (1)
      Tests  1 passed (1)
```

| 書いたもの | 意味 |
| --- | --- |
| `render(<TaskItem … />)` | jsdom の `document.body` の中に、部品を描く |
| `vi.fn()` | 呼ばれたことを覚える、偽物の関数（第56章の `t.mock.fn()` の Vitest 版） |
| `screen.getByRole('checkbox', { name: '牛乳を買う' })` | 「名前が『牛乳を買う』のチェックボックス」を探す。見つからなければ例外 |
| `<HTMLInputElement>` | 見つけた要素の型を伝える（`checked` を読むため）。確かめはしない |
| `queryByText('完了')` | 見つからなければ `null` を返す。「無い」ことを確かめるときに使う |
| `afterEach(cleanup)` | 描いたものを、テストごとに片付ける（片付けないと、次のテストに前の部品が残る） |

チェックボックスの**名前**は、`<label>` の中の文から決まります。`TaskItem` は `<label><input type="checkbox" />{task.title}</label>` と書いてあるので、名前が「牛乳を買う」になります。目の見えない人が使う**スクリーンリーダー**も、この名前を読み上げます（第8部 第45章）。役割と名前で探すテストは、「その名前で読み上げられる」ことも一緒に確かめています。

### 2.2 手を動かす: 見つからないときの出力を読む

わざと間違えます。`{ name: '牛乳を買う' }` を `{ name: '牛乳' }` に変えて動かします。

```sh
$ npx vitest run src/TaskItem.test.tsx
 FAIL  src/TaskItem.test.tsx > TaskItem > 題名が、チェックボックスの名前になる
TestingLibraryElementError: Unable to find an accessible element with the role "checkbox" and name "牛乳"

Here are the accessible roles:

  listitem:

  Name "":
  <li
    class="task"
  />

  --------------------------------------------------
  checkbox:

  Name "牛乳を買う":
  <input
    type="checkbox"
  />

  --------------------------------------------------
  button:

  Name "「牛乳を買う」を消す":
  <button
    aria-label="「牛乳を買う」を消す"
    type="button"
  />
…
```

`getByRole` が見つけられないと、**今の画面にある役割と名前の一覧**を出します。名前は、一部ではなく全体が合わないといけません（`'牛乳'` では見つからない）。一部で探したいときは、`{ name: /牛乳/ }` のように正規表現を渡します。確かめたら `'牛乳を買う'` に戻します。

## 3. 何で探すか

Testing Library には、探し方がたくさんあります。**人が画面を見て探すのと同じもの**で探すほど、作り替えても壊れにくく、使いやすさも一緒に確かめられます。上から順に使います。

| 順 | 探し方 | 使う所 |
| --- | --- | --- |
| 1 | `getByRole(役割, { name })` | ほとんどすべて（ボタン、リンク、入力欄、見出し、一覧） |
| 2 | `getByLabelText('新しいタスク')` | 入力欄（`getByRole('textbox', { name })` でも同じ） |
| 3 | `getByText('…')` | 役割の無い文（説明、件数） |
| 4 | `getByTestId('…')` | ほかで探せないときだけ。`data-testid="…"` を付ける（人には見えない） |

この章で使う役割です。どれも、HTML の要素から自動で決まります（第8部 第45章）。

| 役割 | 要素 | 名前の決まり方 |
| --- | --- | --- |
| `button` | `<button>` | 中の文。`aria-label` があればそちら |
| `checkbox`・`radio` | `<input type="checkbox">`・`type="radio"` | 包んでいる `<label>` の文 |
| `textbox` | `<input>`（type が text など）・`<textarea>` | 包んでいる `<label>` の文 |
| `heading` | `<h1>`〜`<h6>` | 中の文 |
| `list`・`listitem` | `<ul>`・`<li>` | `aria-label` |
| `form` | `<form>` | `aria-label`（名前が無い `<form>` は、役割が付かない） |
| `group` | `<fieldset>` | `<legend>` の文 |
| `status` | `role="status"` | （中身が変わると、読み上げられる） |
| `alert` | `role="alert"` | （出たときに、すぐ読み上げられる） |

探す関数は、見つからないときの動きで3つに分かれます。

| 関数 | 1つ見つかった | 見つからない | 使う所 |
| --- | --- | --- | --- |
| `getBy…` | 要素 | すぐ例外 | 今あるはずのもの |
| `queryBy…` | 要素 | `null` | 無いことを確かめる |
| `findBy…` | 要素（Promise） | 1秒まで待って、例外 | これから出るもの（`await` を付ける） |

`getAllBy…`・`queryAllBy…`・`findAllBy…` は、いくつでも配列で返します（`getAllBy…` は0個なら例外）。2つ以上見つかると、`getBy…` は例外を投げます。そのときは、**`within(要素)`** で、探す範囲を絞ります。

```tsx
const list = screen.getByRole('list', { name: 'タスク' });
const items = within(list).getAllByRole('listitem');
within(items[0]!).getByRole('checkbox', { name: '牛乳を買う' });
```

### 3.1 手を動かす: 押したら呼ばれるか

`TaskItem.test.tsx` に、2つ足します。

```tsx
import userEvent from '@testing-library/user-event';
// …

  test('完了のタスクは、チェックが付き「完了」と出る', () => {
    render(<TaskItem task={{ id: 2, title: '第58章を読む', done: true }} onToggle={vi.fn()} onDelete={vi.fn()} />);

    const checkbox = screen.getByRole<HTMLInputElement>('checkbox', { name: '第58章を読む' });
    expect(checkbox.checked).toBe(true);
    expect(screen.getByText('完了')).toBeDefined();
  });

  test('チェックを押すと、onToggle(id, true) が呼ばれる', async () => {
    const user = userEvent.setup();
    const onToggle = vi.fn();
    render(<TaskItem task={{ id: 1, title: '牛乳を買う', done: false }} onToggle={onToggle} onDelete={vi.fn()} />);

    await user.click(screen.getByRole('checkbox', { name: '牛乳を買う' }));

    expect(onToggle).toHaveBeenCalledTimes(1);
    expect(onToggle).toHaveBeenCalledWith(1, true);
  });
```

| 書いたもの | 意味 |
| --- | --- |
| `userEvent.setup()` | 人のまねをして操作する道具を作る（4節）。テストごとに作る |
| `await user.click(…)` | 押す。操作は Promise なので `await` を付ける |
| `toHaveBeenCalledTimes(1)` | ちょうど1回呼ばれた |
| `toHaveBeenCalledWith(1, true)` | その引数で呼ばれた（`toHaveBeenCalledExactlyOnceWith` なら、2つをまとめて確かめる） |

「消す」ボタンのテストも足してください（名前は `「牛乳を買う」を消す`）。完成形は [samples/finished/src/TaskItem.test.tsx](samples/finished/src/TaskItem.test.tsx) です。

## 4. 人と同じように操作する（user-event）

`@testing-library/user-event` は、人が打つ・押すときにブラウザで起きることを、順にまねします。たとえば `user.type(欄, 'ab')` は、欄を押してフォーカスを移し、`a` のキーを押す → 文字が入る → 離す、`b` を…、と、1文字ずつイベントを出します。

Testing Library には、イベントを1つだけ出す `fireEvent` もあります。`fireEvent.change(欄, { target: { value: 'ab' } })` は、値を書き換えて `change` を1回出すだけです。キーの押し下げも、フォーカスの移動も起きません。押せないボタン（`disabled`）も押せてしまいます。人がしないことができてしまうので、ふだんは user-event を使います。

| 書き方 | すること |
| --- | --- |
| `await user.type(欄, '牛乳を買う')` | 欄を押してから、1文字ずつ打つ |
| `await user.type(欄, '牛乳を買う{Enter}')` | `{Enter}` は Enter キー。ほかに `{Escape}`・`{Tab}`・`{Backspace}` |
| `await user.clear(欄)` | 欄を空にする |
| `await user.click(要素)` | 押す（`disabled` なら何も起きない） |
| `await user.keyboard('{Escape}')` | 今フォーカスのある所で、キーを押す |

### 4.1 手を動かす: フォームのテスト

`web/src/AddTaskForm.test.tsx` を作ります。

```tsx
import { cleanup, render, screen } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { AddTaskForm } from './AddTaskForm.tsx';

afterEach(cleanup);

describe('AddTaskForm', () => {
  test('打って Enter で、前後の空白を除いた題名を渡し、欄を空にする', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn(async () => {});
    render(<AddTaskForm onAdd={onAdd} />);

    const input = screen.getByRole<HTMLInputElement>('textbox', { name: '新しいタスク' });
    await user.type(input, '  牛乳を買う {Enter}');

    expect(onAdd).toHaveBeenCalledWith('牛乳を買う');
    expect(input.value).toBe('');
  });

  test('空のままなら送らず、理由を出して欄にフォーカスを戻す', async () => {
    const user = userEvent.setup();
    const onAdd = vi.fn(async () => {});
    render(<AddTaskForm onAdd={onAdd} />);

    await user.type(screen.getByRole('textbox', { name: '新しいタスク' }), '   ');
    await user.click(screen.getByRole('button', { name: '追加' }));

    expect(onAdd).not.toHaveBeenCalled();
    expect(screen.getByRole('alert').textContent).toBe('題名を入れてください');
    const input = screen.getByRole('textbox', { name: '新しいタスク' });
    expect(input.getAttribute('aria-invalid')).toBe('true');
    expect(document.activeElement).toBe(input);
  });
});
```

| 書いたもの | 意味 |
| --- | --- |
| `vi.fn(async () => {})` | 呼ばれると、すぐ解決する Promise を返す偽物（`onAdd` は Promise を返す約束なので） |
| `not.toHaveBeenCalled()` | 一度も呼ばれていない |
| `getAttribute('aria-invalid')` | 欄が「正しくない」と伝えているか（第8部 第45章） |
| `document.activeElement` | 今フォーカスのある要素 |

### 4.2 手を動かす: 送っている途中を確かめる

「送っている間はボタンを押せない」を確かめるには、`onAdd` が**まだ終わっていない**瞬間を作ります。自分で解決できる Promise を作る関数 `deferred` を、ファイルの上に書きます（第8部 第43章の `deferred` と同じ考え）。

```tsx
function deferred() {
  let resolve!: () => void;
  let reject!: (err: Error) => void;
  const promise = new Promise<void>((res, rej) => {
    resolve = res;
    reject = rej;
  });
  return { promise, resolve, reject };
}
```

```tsx
  test('送っている間は、ボタンを押せない', async () => {
    const user = userEvent.setup();
    const sending = deferred();
    render(<AddTaskForm onAdd={() => sending.promise} />);

    await user.type(screen.getByRole('textbox', { name: '新しいタスク' }), '牛乳を買う');
    await user.click(screen.getByRole('button', { name: '追加' }));

    const button = screen.getByRole<HTMLButtonElement>('button', { name: '追加中…' });
    expect(button.disabled).toBe(true);

    sending.resolve();
    expect((await screen.findByRole<HTMLButtonElement>('button', { name: '追加' })).disabled).toBe(false);
  });
```

| 書いたもの | 意味 |
| --- | --- |
| `let resolve!: () => void` | 「後で必ず入る」と TypeScript に伝える（`!`）。Promise を作る関数の中で入れる |
| `onAdd={() => sending.promise}` | `sending.resolve()` を呼ぶまで、終わらない |
| `sending.resolve()` の後の `findByRole` | 終わった後の描き直しは、少し後に起きる。出てくるまで待つ |

失敗したとき（`onAdd` が例外）に理由が出て、打った題名が残ることも確かめてください。完成形は [samples/finished/src/AddTaskForm.test.tsx](samples/finished/src/AddTaskForm.test.tsx) です。

## 5. API を読む部品を確かめる

`TaskListPanel` は、描かれると `fetch('/api/tasks')` で一覧を読みます。部品のテストでは本物の API を起動せず、`fetch` を偽物に替えます（第8部 第43章と同じ）。道具を `web/src/test-helpers.tsx` に置きます。中身は [samples/finished/src/test-helpers.tsx](samples/finished/src/test-helpers.tsx) からコピーしてください（`cp ../samples/finished/src/test-helpers.tsx src/`）。

| 道具 | すること |
| --- | --- |
| `jsonResponse(本文, 状態)` | JSON の `Response` を作る。400 以上なら `application/problem+json` |
| `mockFetch(handler)` | `vi.stubGlobal('fetch', …)` で、`fetch` を偽物に替える。`handler(パス, init)` が `Response` を返す |
| `createWrapper()` | テストごとに新しい `QueryClient` を作り、それで包む部品を返す。失敗しても、やり直さない（`retry: false`） |
| `fakeTaskApi(seed, override?)` | 覚えているタスクで答える偽物の API（5.3節）。届いたリクエストを `requests` に記録する |

### 5.1 手を動かす: 読み込み中から一覧まで

`web/src/TaskListPanel.test.tsx` を作ります。

```tsx
import { cleanup, render, screen, within } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { afterEach, describe, expect, test, vi } from 'vitest';
import { TaskListPanel } from './TaskListPanel.tsx';
import { createWrapper, fakeTaskApi, jsonResponse, mockFetch } from './test-helpers.tsx';

afterEach(() => {
  cleanup();
  vi.unstubAllGlobals();
});

function renderPanel() {
  const { wrapper } = createWrapper();
  return render(<TaskListPanel />, { wrapper });
}

describe('TaskListPanel', () => {
  test('読み込み中と出て、読めたら一覧と件数を出す', async () => {
    mockFetch(() =>
      jsonResponse({
        items: [
          { id: 1, title: '牛乳を買う', done: false },
          { id: 2, title: '第58章を読む', done: true },
        ],
      }),
    );
    renderPanel();

    expect(screen.getByRole('status').textContent).toBe('読み込み中…');

    const list = await screen.findByRole('list', { name: 'タスク' });
    const items = within(list).getAllByRole('listitem');
    expect(items).toHaveLength(2);
    within(items[0]!).getByRole('checkbox', { name: '牛乳を買う' });
    within(items[1]!).getByRole('checkbox', { name: '第58章を読む' });
    expect(screen.getByText('2 件中 1 件完了')).toBeDefined();
    expect(screen.queryByRole('status')).toBeNull();
  });
});
```

| 書いたもの | 意味 |
| --- | --- |
| `vi.unstubAllGlobals()` | `fetch` を本物に戻す（戻さないと、次のテストに偽物が残る） |
| `render(…, { wrapper })` | `<QueryClientProvider>` で包んで描く。`TaskListPanel` は `useQuery` を使うので、包まないと例外 |
| 描いた直後の `getByRole('status')` | `fetch` の答えはまだ届いていない（Promise は、テストの次の行より後に解決する）。だから「読み込み中…」が見える |
| `await screen.findByRole('list', …)` | 一覧が出るまで待つ。ここを `getByRole` にすると、まだ無いので失敗する（練習問題4） |
| `within(items[0]!)` | `!` は「`undefined` ではない」と TypeScript に伝える（`noUncheckedIndexedAccess` のため）。無ければ `getByRole` が例外を投げる |

### 5.2 手を動かす: 失敗と「もう一度」

```tsx
  test('読めなかったら理由を出し、「もう一度」で読み直す', async () => {
    const user = userEvent.setup();
    let calls = 0;
    const fetchMock = mockFetch(() => {
      calls += 1;
      return calls === 1
        ? jsonResponse({ title: 'サーバのエラー', status: 500 }, 500)
        : jsonResponse({ items: [{ id: 1, title: '牛乳を買う', done: false }] });
    });
    renderPanel();

    const alert = await screen.findByRole('alert');
    expect(within(alert).getByText('一覧を読み込めませんでした')).toBeDefined();

    await user.click(within(alert).getByRole('button', { name: 'もう一度' }));

    expect(await screen.findByRole('checkbox', { name: '牛乳を買う' })).toBeDefined();
    expect(fetchMock).toHaveBeenCalledTimes(2);
  });
```

1回目は 500、2回目は一覧、と、呼ばれた回数で答えを変えています。`createWrapper` の `retry: false` が無いと、TanStack Query が自動でやり直すので、1回目の失敗が画面に出るまで何秒もかかります。

### 5.3 手を動かす: 偽物の API に、データを覚えさせる

足す・変える・消すのテストでは、「書いた後に読み直すと、新しい一覧が返る」偽物が要ります。`fakeTaskApi` は、メモリにタスクを覚えていて、`POST`・`PATCH`・`DELETE` で書き換えます（第57章の、メモリのリポジトリと同じ考え）。

```tsx
  test('足すと POST で送り、一覧を読み直して最後に出す', async () => {
    const user = userEvent.setup();
    const api = fakeTaskApi([{ id: 1, title: '牛乳を買う', done: false }]);
    renderPanel();
    await screen.findByRole('list', { name: 'タスク' });

    await user.type(screen.getByRole('textbox', { name: '新しいタスク' }), 'パンを買う{Enter}');

    expect(await screen.findByRole('checkbox', { name: 'パンを買う' })).toBeDefined();
    expect(api.requests.map((r) => `${r.method} ${r.url}`)).toEqual(['GET /api/tasks', 'POST /api/tasks', 'GET /api/tasks']);
    expect(api.requests[1]?.body).toEqual({ title: 'パンを買う' });
    expect(screen.getByText('2 件中 0 件完了')).toBeDefined();
  });
```

```sh
$ npx vitest run src/TaskListPanel.test.tsx
 Test Files  1 passed (1)
      Tests  3 passed (3)
```

画面に出たもの（新しいタスク）と、送ったもの（`POST` と本文、その後の読み直し）の両方を確かめています。

`fetch` を替える代わりに、**MSW**（Mock Service Worker）というパッケージで、ネットワークの所で偽物の API を立てる方法もよく使われます。考え方は同じです（この教材では使いません）。

## 6. 時間で動くもの（フェイクタイマー）

`useDebouncedValue(value, 300)` は、値が変わってから 300 ミリ秒、次の変更が無かったら新しい値を返すフックです。本当に 300 ミリ秒待つテストは、遅く、不安定です。第56章の `t.mock.timers` と同じく、Vitest の**フェイクタイマー**で時計を進めます。

部品ではなくフックを確かめるときは、**`renderHook`** を使います。フックを呼ぶだけの小さな部品を作って描き、戻り値を `result.current` で読めるようにしてくれます。

### 6.1 手を動かす: フックのテスト

`web/src/useDebouncedValue.test.ts` を作ります（JSX を書かないので `.ts`）。

```ts
import { act, renderHook } from '@testing-library/react';
import { afterEach, beforeEach, expect, test, vi } from 'vitest';
import { useDebouncedValue } from './useDebouncedValue.ts';

beforeEach(() => {
  vi.useFakeTimers();
});
afterEach(() => {
  vi.useRealTimers();
});

test('最後に変わってから 300ms たつまで、前の値のまま', () => {
  const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), {
    initialProps: { value: 'a' },
  });
  expect(result.current).toBe('a');

  rerender({ value: 'ab' });
  act(() => {
    vi.advanceTimersByTime(200);
  });
  rerender({ value: 'abc' }); // 200ms の所でまた変わる → 数え直し
  act(() => {
    vi.advanceTimersByTime(299);
  });
  expect(result.current).toBe('a');

  act(() => {
    vi.advanceTimersByTime(1);
  });
  expect(result.current).toBe('abc');
});
```

| 書いたもの | 意味 |
| --- | --- |
| `vi.useFakeTimers()` | `setTimeout`・`Date` などを、偽物の時計に替える。`useRealTimers()` で戻す |
| `renderHook(fn, { initialProps })` | `fn(props)` の中でフックを呼ぶ部品を描く。`result.current` が最新の戻り値 |
| `rerender({ value: 'ab' })` | 新しい props で描き直す（フックに新しい値を渡す） |
| `vi.advanceTimersByTime(299)` | 偽物の時計を 299 ミリ秒進め、その間のタイマーを動かす |
| `act(() => { … })` | 中で起きた state の更新を、終わるまでに画面（`result.current`）まで届ける |

`act` を外すとどうなるかは、練習問題4で考えます。user-event で打つテストと一緒に使うときは、`userEvent.setup({ advanceTimers: vi.advanceTimersByTime })` と書きます（user-event が、キーの間の待ち時間に偽物の時計を進めるように）。

## 7. 不安定な画面のテストを避ける

画面のテストが「ときどき失敗する」原因は、第57章 9節の5つ（時間・順番・共有・外の世界・片付け忘れ）と同じです。画面では、とくに次のものがよく起きます。

| 書き方 | 何が起きるか | 直し方 |
| --- | --- | --- |
| `await new Promise((r) => setTimeout(r, 50))` の後に `getBy…` | 応答が 50ms より遅いと、まだ無い | `findBy…` で、出るまで待つ |
| `QueryClient` をファイルで1つ作って使い回す | 前のテストで読んだ一覧が残っていて、「読み込み中…」が出ない | テストごとに作る（`createWrapper`） |
| `vi.fn()` をファイルで1つ作って使い回す | 前のテストで呼ばれた回数が残る | テストごとに作る（か `beforeEach` で `mockClear()`） |
| `await` を付けずに `user.click(…)` | 押し終わる前に、次の行が動く | 必ず `await` |
| `cleanup`・`vi.unstubAllGlobals`・`vi.useRealTimers` を忘れる | 前のテストの部品・偽物・時計が残る | `afterEach` で戻す |

順番が原因の失敗は、ふつうに動かすと見つかりません。Vitest は、テストの順番を混ぜて動かせます。

```sh
$ npx vitest run --sequence.shuffle --sequence.seed=3
```

| オプション | 意味 |
| --- | --- |
| `--sequence.shuffle` | ファイルと、ファイルの中のテストの順番を混ぜる |
| `--sequence.seed=3` | 混ぜ方を決める数。同じ数なら同じ順になるので、失敗をもう一度起こせる |

練習問題6で、遅れと順番を変えながら何度も動かして、不安定なテストを直します。

## 8. 本物のブラウザで確かめる（Playwright）

**Playwright** は、本物のブラウザを動かして、ページを開く・押す・打つ・確かめるテストを書く道具です。この節では、API と Vite を起動して、画面から API まで通して確かめます。

### 8.1 ブラウザを入れる

Playwright のパッケージ（`@playwright/test` 1.63.0）は、`setup-part11.sh` で入っています。動かすブラウザは別にダウンロードします。

```sh
$ npx playwright install chromium
```

| 打ったもの | 意味 |
| --- | --- |
| `npx playwright install` | Playwright が動かすブラウザをダウンロードする。版は `@playwright/test` の版に合わせて決まる |
| `chromium` | Chromium（Chrome の元になっているブラウザ）だけを入れる。付けないと Firefox・WebKit（Safari の元）も入る |

ダウンロードしたブラウザは、Mac では `~/Library/Caches/ms-playwright` に置かれます（教材のフォルダや `~/dev` には入りません）。`@playwright/test` の版を上げたら、もう一度このコマンドを打ちます。

### 8.2 手を動かす: 設定を書く

`web/playwright.config.ts` を作ります。

```ts
import { defineConfig, devices } from '@playwright/test';

const API_PORT = 9721;
const WEB_PORT = 9722;
const ports = { API_PORT: String(API_PORT), WEB_PORT: String(WEB_PORT) };

export default defineConfig({
  testDir: 'e2e',
  workers: 1,
  fullyParallel: false,
  timeout: 15_000,
  reporter: 'list',
  outputDir: 'test-results',
  use: {
    baseURL: `http://127.0.0.1:${WEB_PORT}`,
    trace: 'retain-on-failure',
  },
  projects: [{ name: 'chromium', use: { ...devices['Desktop Chrome'] } }],
  webServer: [
    {
      command: 'node api-server.ts',
      env: { ...ports, TEST_RESET: '1' },
      url: `http://127.0.0.1:${API_PORT}/api/tasks`,
      reuseExistingServer: false,
    },
    {
      command: 'npx vite',
      env: ports,
      url: `http://127.0.0.1:${WEB_PORT}`,
      reuseExistingServer: false,
    },
  ],
});
```

| 書いたもの | 意味 |
| --- | --- |
| `testDir: 'e2e'` | `e2e/` の中の `.spec.ts` をテストにする（Vitest の `.test.tsx` と分ける） |
| `workers: 1`・`fullyParallel: false` | 1つずつ順に動かす。API のデータは1つしかないので、同時に動かすと互いに書き換えてしまう |
| `timeout: 15_000` | 1つのテストは 15 秒まで |
| `outputDir` | 失敗したときの記録を置くフォルダ |
| `baseURL` | `page.goto('/')` の `/` を、この URL から数える |
| `trace: 'retain-on-failure'` | 失敗したテストだけ、操作の記録（**トレース**）を残す（8.6節） |
| `projects` | どのブラウザで動かすか。`devices['Desktop Chrome']` は画面の大きさなどの決まった設定 |
| `webServer` | テストの前にコマンドでサーバを起動し、`url` が答えるまで待つ。終わったら止める |
| `env` | そのコマンドに渡す環境変数。`vite.config.ts` と `api-server.ts` が `API_PORT`・`WEB_PORT` を読む |
| `reuseExistingServer: false` | その番号で、もう何かが動いていたら、使わずに止まる（知らないサーバを相手にしない） |

手で起動した API（9727）や Vite（9728）と番号を分けたので、開発しながら E2E を動かしてもぶつかりません。

### 8.3 テストのための入り口

E2E のテストは、本物の API を相手にします。テストで足したタスクは、次のテストにも残ります。第57章では、テストごとに表を空にしました。ここでは、API に**テストのためだけの入り口** `POST /api/test/reset`（データを最初の2つに戻す）を作ってあります。

```ts
  if (allowReset) {
    app.post('/api/test/reset', (_req, res) => {
      reset();
      res.status(204).end();
    });
  }
```

この入り口は、`TEST_RESET=1` のとき（`webServer` の `env`）だけ作ります。だれでもデータを消せる入り口なので、**本番では絶対に作りません**。手で起動したもの（`node api-server.ts`）には、ありません。

```sh
$ curl -s -X POST http://127.0.0.1:9728/api/test/reset -o /dev/null -w '%{http_code}\n'
404
```

（`-o /dev/null` は本文を捨てる、`-w '%{http_code}\n'` は状態の番号だけを出す。第2部 第6章）

### 8.4 手を動かす: 最初の E2E のテスト

`web/e2e/tasks.spec.ts` を作ります。

```ts
import { expect, test } from '@playwright/test';

test.beforeEach(async ({ request }) => {
  const res = await request.post('/api/test/reset');
  expect(res.status()).toBe(204);
});

test('一覧が出る', async ({ page }) => {
  await page.goto('/');

  await expect(page.getByRole('heading', { name: 'やること' })).toBeVisible();
  await expect(page.getByRole('listitem')).toHaveCount(2);
  await expect(page.getByRole('checkbox', { name: '牛乳を買う' })).not.toBeChecked();
  await expect(page.getByRole('checkbox', { name: '第58章を読む' })).toBeChecked();
});

test('足したタスクは最後に出て、読み込み直しても残る', async ({ page }) => {
  await page.goto('/');

  await page.getByRole('textbox', { name: '新しいタスク' }).fill('パンを買う');
  await page.getByRole('button', { name: '追加' }).click();

  await expect(page.getByRole('listitem').last()).toContainText('パンを買う');
  await expect(page.getByRole('textbox', { name: '新しいタスク' })).toHaveValue('');
  await page.reload();
  await expect(page.getByRole('checkbox', { name: 'パンを買う' })).toBeVisible();
});
```

`web/` で動かします。

```sh
$ npx playwright test

Running 2 tests using 1 worker

  ✓  1 [chromium] › e2e/tasks.spec.ts:8:1 › 一覧が出る (629ms)
  ✓  2 [chromium] › e2e/tasks.spec.ts:17:1 › 足したタスクは最後に出て、読み込み直しても残る (1.1s)

  2 passed (3.7s)
```

| 書いたもの | 意味 |
| --- | --- |
| `async ({ page })` | Playwright が、テストごとに新しいブラウザのタブ（`page`）を用意して渡す。Cookie なども、テストごとにまっさら |
| `({ request })` | ブラウザを通さずに HTTP で頼む道具。`baseURL` から数える（Vite の中継で API に届く） |
| `page.getByRole(…)` | **ロケーター**。Testing Library と同じく役割と名前で探す。作った時点では探さず、使うときに探す |
| `.fill('パンを買う')` | 欄を空にして打つ |
| `.click()` | 押す。押せるようになる（見えて、動いていない、`disabled` でない）まで待ってから押す |
| `await expect(ロケーター).toHaveCount(2)` | そうなるまで待つ（既定で 5 秒まで）。応答を待つ `sleep` は要らない |
| `.last()`・`toContainText` | 最後の1つ・その文を含む |
| `page.reload()` | 読み込み直す。サーバに保存されたかを確かめる |

部品のテストとの大きな違いは、**`expect` が待つ**ことです。`await expect(locator).toBeChecked()` は、チェックが付くまで、何度も確かめ直します。一方、`expect(await locator.isChecked()).toBe(true)` は、その瞬間に1回読むだけなので、応答が遅いと失敗します。ロケーターは、待つ形の `expect` で確かめます。

### 8.5 失敗を読む

`toHaveCount(2)` を `toHaveCount(3)` に変えて動かします。

```sh
$ npx playwright test
  ✘  1 [chromium] › e2e/tasks.spec.ts:8:1 › 一覧が出る (5.7s)
…
    Error: expect(locator).toHaveCount(expected) failed

    Locator:  getByRole('listitem')
    Expected: 3
    Received: 2
    Timeout:  5000ms

    Call log:
      - Expect "toHaveCount" getByRole('listitem') with timeout 5000ms
      - waiting for getByRole('listitem')
        14 × locator resolved to 2 elements
           - unexpected value "2"
…
    Error Context: test-results/tasks-一覧が出る-chromium/error-context.md

    attachment #2: trace (application/zip) ───────────────────
    test-results/tasks-一覧が出る-chromium/trace.zip
    Usage:

        npx playwright show-trace test-results/tasks-一覧が出る-chromium/trace.zip
```

5 秒の間に 14 回確かめ直し、ずっと 2 個だったので失敗した、と分かります。

| 道具 | すること |
| --- | --- |
| `error-context.md` | 失敗したときの画面の、役割と名前の木（Testing Library の一覧と同じ考え） |
| `npx playwright show-trace …/trace.zip` | トレースを開く。操作ごとの画面の写真、DOM、ネットワーク、コンソールを、時間を戻して見られる |
| `npx playwright test --headed` | ブラウザの窓を出して動かす（ふだんは窓を出さない **headless**） |
| `npx playwright test --ui` | テストを選んで動かし、1歩ずつ見られる画面を開く |
| `npx playwright test -g '一覧'` | 名前に「一覧」を含むテストだけ動かす（`-g` は grep） |

確かめたら `2` に戻します。

### 8.6 E2E に向いた書き方

| 書き方 | 理由 |
| --- | --- |
| テストごとに、データを決まった状態に戻す（`beforeEach` で reset） | 前のテストに左右されない。どの順でも、1つだけでも動く |
| 役割と名前で探す | CSS のクラス名や DOM の形を変えても壊れない |
| 待つ形の `expect` で確かめる | 「何秒待てば十分か」を考えなくてよい |
| 読み込み直して確かめる | 画面に出ただけでなく、サーバに保存されたことまで分かる |
| 1つのテストで、利用者の1つの目的を通す | 細かい場合分けは、部品のテストで確かめる（9節） |

## 9. どこまでを、どのテストで確かめるか

第56章 7節の考えを、画面に当てはめます。

| 確かめたいこと | テスト |
| --- | --- |
| 入力の決まり、表示の出し分け（空・読み込み中・失敗）、押したら呼ばれる関数 | 部品のテスト（たくさん） |
| フックの時間の動き | `renderHook` + フェイクタイマー |
| API を呼ぶ部品の、成功と失敗 | 部品のテスト + `fetch` の偽物 |
| 画面・Vite の中継・API・保存がつながっているか | E2E（大事な流れを少し） |
| 見た目（CSS）、ブラウザごとの違い | E2E（スクリーンショットを比べる方法もある） |

テストが通っていない行を知るには、Vitest の**カバレッジ**を使います（第56章 8節の、Vitest 版）。`vite.config.ts` の `coverage` で、数えるファイルを決めてあります。

```sh
$ npx vitest run --coverage
…
 % Coverage report from v8
-------------------|---------|----------|---------|---------|-------------------
File               | % Stmts | % Branch | % Funcs | % Lines | Uncovered Line #s 
-------------------|---------|----------|---------|---------|-------------------
All files          |   82.43 |    81.08 |   73.33 |   85.07 |                   
 AddTaskForm.tsx   |     100 |       90 |     100 |     100 | 29                
 App.tsx           |       0 |      100 |       0 |       0 | 8-9               
 TaskListPanel.tsx |   83.33 |       80 |      70 |   81.25 | 16,51-52          
 api.ts            |   83.33 |    81.81 |   57.14 |   88.23 | 44-48             
 main.tsx          |       0 |        0 |     100 |       0 | 6-8               
-------------------|---------|----------|---------|---------|-------------------
```

| 打ったもの・出たもの | 意味 |
| --- | --- |
| `--coverage` | V8（Node.js の JavaScript エンジン）の記録で、通った行を数える（`@vitest/coverage-v8`） |
| `TaskListPanel.tsx` の 16・51-52 行 | 完了の切り替え・消すの所。練習問題5で確かめる |
| `App.tsx`・`main.tsx` が 0 | 画面の入り口は、部品のテストでは描かない。E2E が通っている |
| 100% のファイル（`TaskItem.tsx` など） | 表に出ない（執筆時点の Vitest 4.1 の既定） |

`coverage/index.html` をブラウザで開くと、行ごとに色が付いた表が見られます。第56章と同じく、数字は「テストが通っていない所を探す道具」で、目標にしすぎないことが大事です。

## 10. Flask（とブラウザのテスト）との対応

| Flask・Python | この章 |
| --- | --- |
| `client.get('/')` で HTML を受け取り、`'牛乳を買う' in html` | `render` して `getByRole`・`getByText`（ブラウザで動く画面の部品） |
| BeautifulSoup で HTML を探す | Testing Library の `screen`・`within` |
| `unittest.mock.patch('requests.get')` | `vi.stubGlobal('fetch', …)`（`mockFetch`） |
| freezegun（時間を止める） | `vi.useFakeTimers()`・`vi.advanceTimersByTime()` |
| Selenium・pytest-playwright | Playwright（Node.js 版。同じ会社の同じ道具） |
| pytest のフィクスチャの `page` | Playwright のテストの引数 `({ page })`（Playwright もフィクスチャと呼ぶ） |
| `flask run` してから pytest | `webServer` が、起動と停止をしてくれる |

## まとめ

- 部品のテストは、Vitest + jsdom で部品を描き、役割と名前で探して確かめる。見つからないときの一覧（役割と名前）を読む。
- `getBy`（今ある）・`queryBy`（無いことを確かめる）・`findBy`（出るまで待つ）を使い分け、`within` で範囲を絞る。
- 操作は user-event で、人と同じように打って押す（`await` を付ける）。props の関数は `vi.fn()` で、呼ばれ方を確かめる。
- API を読む部品は、`fetch` を偽物にし、テストごとに新しい `QueryClient` で描く。書き換えのテストは、データを覚えた偽物で。
- 時間で動くものは、フェイクタイマーと `renderHook`・`act` で確かめる。
- 決まった時間待つ・共有する・片付けない、が不安定さの原因。`--sequence.shuffle` で順番を変えて探す。
- Playwright は本物のブラウザで、画面から API まで通して確かめる。テストごとにデータを戻し、待つ形の `expect` で確かめる。

## 練習問題

[exercises/README.md](exercises/README.md) にあります。8問です。

## 参考資料

- Testing Library「Queries」「About Queries（優先順位）」: https://testing-library.com/docs/queries/about
- Testing Library「user-event」: https://testing-library.com/docs/user-event/intro
- Testing Library「React Testing Library の API（`render`・`renderHook`）」: https://testing-library.com/docs/react-testing-library/api
- Vitest Docs「Mocking」「Fake Timers」「Coverage」: https://vitest.dev/guide/mocking ・ https://vitest.dev/guide/coverage
- Playwright Docs「Writing tests」「Locators」「Assertions」「Web server」「Trace viewer」: https://playwright.dev/docs/writing-tests ・ https://playwright.dev/docs/locators ・ https://playwright.dev/docs/test-assertions ・ https://playwright.dev/docs/test-webserver ・ https://playwright.dev/docs/trace-viewer
- WAI-ARIA の役割（MDN「ARIA roles」）: https://developer.mozilla.org/ja/docs/Web/Accessibility/ARIA/Roles
- jsdom: https://github.com/jsdom/jsdom

---

第11部の目次: [../README.md](../README.md) ／ 前の章: [第57章 API とデータベースのテスト](../ch57-api-db-testing/README.md) ／ 次の章: [第59章 静的解析と CI](../ch59-lint-ci/README.md)
