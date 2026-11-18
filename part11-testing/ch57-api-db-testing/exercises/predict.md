# 練習問題4 考えて答える

答えを書いてから、動かして確かめられるものは確かめてください。答えは [../solutions/README.md](../solutions/README.md) の問題4にあります。

## 問1 一部だけ比べると、どうなるか

`assert.partialDeepStrictEqual(実際, 期待)` で、次の3つは成功するでしょうか、失敗するでしょうか。

```ts
const body = {
  title: '入力が正しくありません',
  status: 422,
  errors: [
    { pointer: '/dueDate', detail: '期限に過去の日は選べません' },
    { pointer: '/title', detail: '題名は 1〜100 文字にしてください' },
  ],
};

// A
assert.partialDeepStrictEqual(body, { status: 422 });
// B
assert.partialDeepStrictEqual(body, { errors: [{ pointer: '/title' }] });
// C
assert.partialDeepStrictEqual(body, { status: 422, errors: [{ pointer: '/title', detail: '題名は必須です' }] });
```

B の結果から、「`errors` に `/title` だけが入っている」ことを確かめたいときは、どう書けばよいでしょう。

## 問2 同時に動かすと

2つのテストのファイル `a.test.ts` と `b.test.ts` が、どちらも次の部品でデータベースを用意しています（本文5.1節と違い、スキーマの名前が決まっています）。

```ts
const pool = new pg.Pool({ connectionString: DATABASE_URL, options: '-c search_path=test_shared' });
beforeEach(() => pool.query('TRUNCATE tasks RESTART IDENTITY'));
```

1. `node --test a.test.ts b.test.ts` と動かすと、何が起きることがあるでしょう。いつも失敗するでしょうか
2. `node --test --test-concurrency=1 a.test.ts b.test.ts` ではどうでしょう
3. 本文の `createTestDb()` は、この問題をどう避けているでしょう

## 問3 偽物が約束していないこと

本文の `memory-repo.ts`（偽物）と `pg-repo.ts`（本物）に、サービスを通さずに直接、題名が 101 文字のタスクを `insert` しました。

1. それぞれ、どうなるでしょう
2. 本文の約束のテスト（`repo-contract.ts`）は、この違いを見つけるでしょうか
3. この違いが困るのは、どんなときでしょう。約束のテストに「101 文字なら失敗する」を足すべきでしょうか

## 問4 閉じ忘れると

本文2.3節の `http.test.ts` から、`afterEach(() => server.close());` の行を消して `node --test http.test.ts` を動かしました。テストは ✔ になるでしょうか。そして、`node --test` は終わるでしょうか。
