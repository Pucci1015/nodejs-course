# 第58章 模範解答

問題文は [../exercises/README.md](../exercises/README.md) です。確かめるときは、`exercises` のフォルダで打ちます（解答のテストは `../exercises/` の部品と道具を読みます）。

| 問題 | 解答のファイル | 確かめ方（`exercises` で） |
| --- | --- | --- |
| 1 | [TaskCard.test.tsx](TaskCard.test.tsx) | `node ../../tools/check-tests.ts ../solutions/TaskCard.test.tsx --vitest` |
| 2 | [EditTitleForm.test.tsx](EditTitleForm.test.tsx) | `node ../../tools/check-tests.ts ../solutions/EditTitleForm.test.tsx --vitest` |
| 3 | [TaskFilter.tsx](TaskFilter.tsx) | `MODULE=../solutions/TaskFilter.tsx npx vitest run TaskFilter.test.tsx` |
| 4 | この README | |
| 5 | [TaskListPanel.test.tsx](TaskListPanel.test.tsx) | `node ../../tools/check-tests.ts ../solutions/TaskListPanel.test.tsx --vitest` |
| 6 | [flaky.test.tsx](flaky.test.tsx) | `node check-flaky.ts ../solutions/flaky.test.tsx` |
| 7 | [e2e/tasks.spec.ts](e2e/tasks.spec.ts) | `node check-e2e.ts ../solutions/e2e/tasks.spec.ts` |
| 8 | [useAutoSave.test.ts](useAutoSave.test.ts) | `node ../../tools/check-tests.ts ../solutions/useAutoSave.test.ts --vitest` |

`check-tests.ts` は、`--vitest` のとき、テストのファイルのあるフォルダを Vitest の root にして動かします（Vitest は root の外のテストを探さないため）。

---

## 問題1 期限つきのタスクの行

```sh
$ node ../../tools/check-tests.ts ../solutions/TaskCard.test.tsx --vitest
[OK] 正しい実装（TaskCard.tsx）で、すべてのテストが通る
[OK] ミュータント1（完了のタスクにも、チェックが付かない）を見つけた
[OK] ミュータント2（チェックを押すと、今の done をそのまま渡す（反対にしない））を見つけた
[OK] ミュータント3（「消す」ボタンの名前に題名が入っていない）を見つけた
[OK] ミュータント4（完了のタスクでも「期限切れ」と出す）を見つけた
[OK] ミュータント5（期限が今日のときも「期限切れ」と出す）を見つけた
[OK] ミュータント6（期限が無いとき「期限なし」と出さない（何も出さない））を見つけた
[OK] ミュータント7（「消す」を押すと、onDelete に id ではなく 0 を渡す）を見つけた
すべて成功しました
```

期限の場合分けは、表にして並べました。

```tsx
  test.each([
    { dueDate: '2026-12-09', done: false, overdue: true },
    { dueDate: '2026-12-10', done: false, overdue: false },
    { dueDate: '2026-12-11', done: false, overdue: false },
    { dueDate: '2026-12-09', done: true, overdue: false },
  ])('期限 $dueDate・done $done → 期限切れ: $overdue', ({ dueDate, done, overdue }) => {
    render(<TaskCard task={card({ dueDate, done })} today={TODAY} onToggle={vi.fn()} onDelete={vi.fn()} />);

    expect(screen.getByText(`期限: ${dueDate}`)).toBeDefined();
    expect(screen.queryByText('期限切れ') !== null).toBe(overdue);
  });
```

**つまずきやすい所**

- チェックを押したテストを、未完了のタスクでしか書かないと、ミュータント2（`onToggle(id, task.done)`）は見つかりますが、「完了 → 未完了」の向きが確かめられていません。解答では `test.each` で両方の向きを並べました。
- 「消す」を `getByRole('button', { name: '消す' })` で探すと、ミュータント3を見逃します。名前に題名が入っていることが、スクリーンリーダーで「どれを消すか」が分かる決まりです。
- `card()` のように、変えたい所だけ渡してテストのデータを作る関数があると、各テストが「何を変えたテストか」を読みやすくなります（第56章 5節）。

## 問題2 題名を直すフォーム

```sh
$ node ../../tools/check-tests.ts ../solutions/EditTitleForm.test.tsx --vitest
[OK] 正しい実装（EditTitleForm.tsx）で、すべてのテストが通る
[OK] ミュータント1（前後の空白を除かずに onSave に渡す）を見つけた
…
[OK] ミュータント7（エラーの理由を role="alert" ではなく、ただの文で出す（出たことが読み上げられない））を見つけた
すべて成功しました
```

描く所をまとめる関数 `setup` を作りました。テストごとに新しい `user`・`vi.fn()` を作るので、テストの間で何も共有しません（本文7節）。

```tsx
function setup(onSave: (title: string) => Promise<void> = vi.fn(async () => {})) {
  const user = userEvent.setup();
  const onCancel = vi.fn();
  const onSaveMock = vi.fn(onSave);
  render(<EditTitleForm initialTitle="牛乳を買う" onSave={onSaveMock} onCancel={onCancel} />);
  const input = screen.getByRole<HTMLInputElement>('textbox', { name: '題名' });
  return { user, onSave: onSaveMock, onCancel, input };
}
```

**つまずきやすい所**

- `user.type(欄, '豆乳を買う')` は、今入っている「牛乳を買う」の後ろに打ちます（人が欄を押して打つのと同じ）。打ち直すときは先に `user.clear(欄)`。
- 「変わっていない」は、`'  {Enter}'`（空白を足しただけ）で確かめると、「前後の空白を除いてから比べる」ことまで確かめられます。
- 「保存に失敗」のテストで、`onSave` に `() => Promise.reject(new Error(…))` を渡してもかまいません。解答では `deferred()` で、失敗させる瞬間を自分で決めました。どちらでも、理由が出るまで `findByRole('alert')` で待ちます。

## 問題3 テストが探せる部品を作る

```tsx
export function TaskFilter({ tasks, filter, onChange }: Props): ReactNode {
  const name = useId();
  const doneCount = tasks.filter((t) => t.done).length;
  const options: { value: Filter; label: string; count: number }[] = [
    { value: 'all', label: 'すべて', count: tasks.length },
    { value: 'open', label: '未完了', count: tasks.length - doneCount },
    { value: 'done', label: '完了', count: doneCount },
  ];

  return (
    <div>
      <fieldset>
        <legend>表示するタスク</legend>
        {options.map((o) => (
          <label key={o.value}>
            <input type="radio" name={name} value={o.value} checked={filter === o.value} onChange={() => onChange(o.value)} />
            {o.label} ({o.count})
          </label>
        ))}
      </fieldset>
      <p role="status">{tasks.length === 0 ? 'タスクはありません' : `${tasks.length} 件中 ${doneCount} 件完了`}</p>
    </div>
  );
}
```

```sh
$ MODULE=../solutions/TaskFilter.tsx npx vitest run TaskFilter.test.tsx
 Test Files  1 passed (1)
      Tests  9 passed (9)
```

**なぜそうなるか**: テストは「表示するタスク」という名前の `group` を探します。`<fieldset>` の役割が `group`、その名前が `<legend>` の文です。`<div>` に見出しの文を並べただけでは、見た目は同じでも、役割も名前も無いので見つかりません。役割と名前で探すテストを先に書くと、スクリーンリーダーでも分かる作りに自然になります。

**つまずきやすい所**

- `name` を `"filter"` のような決まった文字にすると、最後のテスト（2つ描く）で失敗します。同じ `name` のラジオボタンは、ページ全体で1つのまとまりになるので、2つ目のフィルタを選ぶと1つ目のチェックが外れてしまいます。
- `checked` だけを書いて `onChange` を書かないと、React が「読み取り専用にするなら `readOnly` を」と警告します（第8部 第41章の、制御されたフォーム）。

## 問題4 考えて答える

### 問1 いつ探すか

1. **A は失敗**します。描いた直後は、`fetch` の答えがまだ届いていないので、画面には「読み込み中…」しかありません（偽物の `fetch` がすぐ答えても、Promise の解決はテストの次の行より後です）。**B は成功**します（まだ無いので `null`）。**C は成功**します（出るまで待つ）。

   ```
   TestingLibraryElementError: Unable to find an element with the text: 牛乳を買う. …
   …
         <p
           role="status"
         >
           読み込み中…
         </p>
   ```

2. **C は失敗**します。`findBy…` が待つのは、既定で 1 秒（1000 ミリ秒）までです。1.5 秒かかる答えは間に合いません（実際に動かすと、約 1008ms で失敗しました）。待つ時間は `findByText('…', {}, { timeout: 2000 })` で延ばせますが、部品のテストの偽物は、遅くする理由がなければすぐ答えるようにします。

### 問2 act を外すと

**失敗**します。`result.current` は `'a'` のままです。

```
AssertionError: expected 'a' to be 'ab' // Object.is equality
```

偽物の時計を進めると、タイマーの中の `setDebounced('ab')` は呼ばれます。けれども React は、state の更新をすぐには画面に反映せず、後でまとめて描き直します。`act(() => { … })` は「この中で起きた更新を、`act` が終わるまでに全部描き直して」と React に頼む関数です。`render`・`rerender`・user-event の操作・`findBy…` は、中で `act` を使っているので、ふだんは自分で書きません。自分で時計を進めるときだけ、`act` で包みます。

### 問3 Playwright の check()

1. **D は失敗**します。

   ```
   Error: locator.check: Clicking the checkbox did not change its state
   ```

   `check()` は、押した後に「チェックが付いたか」まで確かめ、付いていなければ失敗します。この画面のチェックボックスは、`checked={task.done}` で、サーバの答えを読み直した後に付きます。押した直後は、まだ付いていません。

2. `click()` で押した後、**E は失敗することがあり**、**F は成功**します。E は `isChecked()` でその瞬間の状態を1回読むだけなので、サーバの答えが来る前に読むと `false` です。F は、付くまで（5 秒まで）確かめ直します。ロケーターは、F のように待つ形の `expect` で確かめます（本文8.4節）。

### 問4 どこで確かめるか

| | テスト | 理由 |
| --- | --- | --- |
| 1 チェックボックスの名前 | Vitest + jsdom | DOM の形と名前は jsdom で分かる。速い |
| 2 取り消し線が見える | Playwright | jsdom は CSS で見た目を計算しない。本物のブラウザで、スクリーンショットや `toHaveCSS` で確かめる |
| 3 スマートフォンの幅ではみ出さない | Playwright | jsdom は大きさ・位置を計算しない（どの要素も幅 0）。`page.setViewportSize` で幅を変えて確かめる |
| 4 `onAdd` の引数 | Vitest + jsdom | props の関数の呼ばれ方は、部品のテストがいちばん速く、細かく書ける |
| 5 読み込み直しても残る | Playwright | 画面・中継・API・保存がつながっていることは、E2E でしか分からない |

## 問題5 API を読む部品の、書き換えと失敗

```sh
$ node ../../tools/check-tests.ts ../solutions/TaskListPanel.test.tsx --vitest
[OK] 正しい実装（TaskListPanel.tsx）で、すべてのテストが通る
[OK] ミュータント1（完了を切り替えた後、一覧を読み直さない）を見つけた
…
[OK] ミュータント6（足すのに失敗しても（422 など）、フォームに理由が届かない（例外を握りつぶす））を見つけた
すべて成功しました
```

チェックのテストは、送ったもの（`api.requests`）と、読み直した後の画面（件数）の両方を確かめます。

```tsx
    await user.click(await screen.findByRole('checkbox', { name: '牛乳を買う' }));

    expect(await screen.findByText('1 件中 1 件完了')).toBeDefined();
    expect(screen.getByRole<HTMLInputElement>('checkbox', { name: '牛乳を買う' }).checked).toBe(true);
    expect(api.requests[1]).toEqual({ method: 'PATCH', url: '/api/tasks/1', body: { done: true } });
```

422 のテストは、`override` で `POST` だけを失敗させ、フォームの中から探します。

```tsx
    fakeTaskApi([{ id: 1, title: '牛乳を買う', done: false }], (method) =>
      method === 'POST'
        ? jsonResponse({ title: '入力が正しくありません', errors: [{ pointer: '/title', detail: '同じ題名のタスクがあります' }] }, 422)
        : undefined,
    );
    // …
    const form = screen.getByRole('form', { name: 'タスクを足す' });
    expect((await within(form).findByRole('alert')).textContent).toBe('同じ題名のタスクがあります');
```

**つまずきやすい所**

- 送った本文だけを確かめると、ミュータント1・3（読み直さない）を見逃します。画面が新しい状態になったか（件数・消えたか）まで確かめます。
- 「消えた」を `queryByRole(…)` で確かめるとき、すぐに確かめると、まだ消えていないので失敗します。解答では、先に件数（`1 件中 0 件完了`）が出るまで `findByText` で待ち、その後で `queryByRole` が `null` かを確かめました。`waitFor(() => expect(…).toBeNull())`（`@testing-library/react` の、通るまで何度も確かめ直す関数）や、消えるまで待つ `waitForElementToBeRemoved` でも書けます。
- 「変えるのに失敗」は、`mockFetch` で、`GET` は成功・`PATCH` は 500 にしました。`fakeTaskApi` の `override` で `PATCH` だけ 500 を返しても同じです。

## 問題6 ときどき失敗するテストを直す

```sh
$ node check-flaky.ts ../solutions/flaky.test.tsx
[OK] 遅れ 0ms・順番 1: すべて通った
…
[OK] 遅れ 150ms・順番 4: すべて通った
すべて成功しました
```

直した所は3つです（`// 修正:` のコメント）。

| 原因 | 何が起きていたか | 直し方 |
| --- | --- | --- |
| 50ms だけ待ってから `getByRole` | 応答が 150ms かかると、まだ一覧が無い | `await screen.findByRole(…)` で、出るまで待つ |
| `QueryClient` をファイルで1つ作っていた | 「一覧に題名が出る」が先に動くと、読んだ一覧が覚えられていて、次のテストで「読み込み中…」が出ない | `createWrapper()` で、テストごとに作る |
| `onAdd` の `vi.fn()` をファイルで1つ作っていた | 「追加を押して送る」が先に動くと、呼ばれた回数が 1 から始まり、`toHaveBeenCalledTimes(1)` が失敗する | テストの中で作る |

**なぜそうなるか**: 1つ目は「時間」、2つ目と3つ目は「共有」が原因です（第57章 9節）。ファイルの上から順に動かすと、共有しているものを最初に使うテストが、たまたまきれいな状態から始まるので、通ってしまいます。順番を混ぜる（`--sequence.shuffle`）と見つかります。

**つまずきやすい所**: `beforeEach(() => onAdd.mockClear())` で、テストごとに回数を消しても直ります。けれども、テストの中で作るほうが「このテストの偽物」だと読んで分かります。`QueryClient` は `queryClient.clear()` で消す方法もありますが、`retry` などの設定もテストごとに決まる `createWrapper` のほうが確実です。

## 問題7 画面から API まで通す E2E

```sh
$ node check-e2e.ts ../solutions/e2e/tasks.spec.ts
[OK] 正しい API で、すべてのテストが通る
[OK] ミュータント1（PATCH（完了の切り替え）に、それらしい応答を返すが、保存しない）を見つけた
[OK] ミュータント2（DELETE に 204 を返すが、消さない）を見つけた
[OK] ミュータント3（PATCH で、いつも done を true にする（完了を外せない））を見つけた
すべて成功しました
```

```ts
test('チェックを付けると完了になり、読み込み直しても完了のまま', async ({ page }) => {
  await page.goto('/');
  const checkbox = page.getByRole('checkbox', { name: '牛乳を買う' });

  await checkbox.click();

  await expect(checkbox).toBeChecked();
  await expect(page.getByText('2 件中 2 件完了')).toBeVisible();
  await page.reload();
  await expect(page.getByRole('checkbox', { name: '牛乳を買う' })).toBeChecked();
});
```

**つまずきやすい所**

- `checkbox.check()` は使えません（練習問題4の問3）。`click()` で押して、待つ形の `expect` で確かめます。
- 未完了 → 完了の向きだけを書くと、ミュータント3（いつも `true`）を見逃します。完了 → 未完了の向きも確かめます。
- この画面は、書き換えた後に一覧を読み直すので、ミュータント1（保存しない）は、読み込み直さなくても見つかります。それでも `page.reload()` を入れておくと、「画面だけが変わった」のか「保存された」のかを、画面の作りに頼らずに確かめられます。
- テストの名前で動かすものを絞るときは、`npx playwright test e2e/tasks.spec.ts -g '消す'` です。

## 問題8 自動で保存するフックの、時間の動き

```sh
$ node ../../tools/check-tests.ts ../solutions/useAutoSave.test.ts --vitest
[OK] 正しい実装（useAutoSave.ts）で、すべてのテストが通る
[OK] ミュータント1（最初の値も、delayMs たったら保存する）を見つけた
…
[OK] ミュータント7（待っている間も pending ではなく、前の状態を返す）を見つけた
すべて成功しました
```

時計を進める所を、関数にまとめました。

```ts
function advance(ms: number) {
  act(() => {
    vi.advanceTimersByTime(ms);
  });
}
```

`saved`・`error` は、`save` が返す Promise を自分で解決・失敗させて確かめます。

```ts
  test('保存が終わったら saved、失敗したら error', async () => {
    const first = deferred();
    const second = deferred();
    const save = vi.fn().mockReturnValueOnce(first.promise).mockReturnValueOnce(second.promise);
    const { result, rerender } = setup(save);

    rerender({ value: 'ab' });
    advance(1000);
    await act(async () => first.resolve());
    expect(result.current).toBe('saved');

    rerender({ value: 'abc' });
    advance(1000);
    await act(async () => second.reject(new Error('つながりません')));
    expect(result.current).toBe('error');
  });
```

| 書いたもの | 意味 |
| --- | --- |
| `vi.fn().mockReturnValueOnce(a).mockReturnValueOnce(b)` | 1回目は `a`、2回目は `b` を返す偽物 |
| `await act(async () => first.resolve())` | 解決させてから、`.then` の中の `setRecord` と描き直しが終わるまで待つ |
| `unmount()` | フックを描いている部品を取り除く。片付けの関数（`useEffect` の return）が動く |

**つまずきやすい所**

- 「続けて変える」で、最初の変更から 1000ms の所（ミュータント2・3 が動く所）で「まだ呼ばれていない」を確かめないと、数え直していることが確かめられません。解答では、600ms・600ms で変えた後、まだ呼ばれていないことを確かめてから、残りの 400ms を進めました。
- `advance` を `act` で包まないと、状態が `pending` のまま読めます（練習問題4の問2）。
- アンマウントの後に時計を進めて、「もう1回は保存しない」ことも確かめておくと、タイマーの止め忘れ（片付けで保存した後に、タイマーでもう1回保存する）を見つけられます。
