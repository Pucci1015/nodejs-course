# 練習問題4 考えて答える

答えを書いてから、動かして確かめられるものは確かめてください。答えは [../solutions/README.md](../solutions/README.md) の問題4にあります。

## 問1 いつ探すか

本文の `TaskListPanel` を、`fetch` を偽物にして描きました。偽物の API は、一覧（「牛乳を買う」の1つ）をすぐに返します。

```tsx
mockFetch(() => jsonResponse({ items: [{ id: 1, title: '牛乳を買う', done: false }] }));
const { wrapper } = createWrapper();
render(<TaskListPanel />, { wrapper });

// A
screen.getByText('牛乳を買う');
// B
expect(screen.queryByText('牛乳を買う')).toBeNull();
// C
await screen.findByText('牛乳を買う');
```

1. A・B・C を、それぞれ描いた直後に書いたとき、成功するでしょうか、失敗するでしょうか（1つずつ、別のテストに書いたとします）
2. 偽物の API が、1.5 秒待ってから返すようにしました。C はどうなるでしょう

## 問2 act を外すと

本文6節の `useDebouncedValue` のテストから、`act(() => { … })` を外して、次のように書きました。

```ts
vi.useFakeTimers();
const { result, rerender } = renderHook(({ value }) => useDebouncedValue(value, 300), { initialProps: { value: 'a' } });
rerender({ value: 'ab' });
vi.advanceTimersByTime(300);
expect(result.current).toBe('ab');
```

成功するでしょうか。失敗するなら、`result.current` は何でしょう。なぜでしょう。

## 問3 Playwright の check()

本文の画面で、E2E のテストに次のように書きました。

```ts
const checkbox = page.getByRole('checkbox', { name: '牛乳を買う' });
await checkbox.check();                       // D
expect(await checkbox.isChecked()).toBe(true); // E
await expect(checkbox).toBeChecked();         // F
```

1. D は成功するでしょうか（ヒント: この画面のチェックボックスは、いつチェックが付くでしょう）
2. D を `await checkbox.click();` に替えました。E と F の違いは何でしょう。どちらで書くべきでしょう

## 問4 どこで確かめるか

次の5つを確かめたいとします。Vitest + jsdom（部品のテスト）と、Playwright（本物のブラウザの E2E）の、どちらで確かめるのがよいでしょう。

1. チェックボックスの名前が、タスクの題名になっている
2. 完了のタスクに、取り消し線が引かれて見える
3. スマートフォンの幅で、「消す」ボタンが画面の外にはみ出さない
4. 「追加」を押すと、`onAdd` が、前後の空白を除いた題名で呼ばれる
5. 足したタスクが、読み込み直しても残る
