# 練習問題4 考えて答える

答えを書いてから、動かして確かめられるものは確かめてください。答えは [../solutions/README.md](../solutions/README.md) の問題4にあります。

## 問1 何個成功して、終了ステータスはいくつか

次の `forget.test.ts` を `node --test forget.test.ts` で動かすと、それぞれのテストは ✔ と ✖ のどちらで表示され、終了ステータス（`echo $?`）はいくつになるでしょう。理由も書いてください。

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';

async function save(x: number) {
  await new Promise((resolve) => setTimeout(resolve, 10));
  if (x < 0) throw new Error('負の数');
}

test('A: await を忘れた', () => {
  void save(-1);
});

test('B: rejects を await しない', () => {
  assert.rejects(save(1));
});

test('C: 同じ中身のオブジェクト', () => {
  assert.equal({ a: 1 }, { a: 1 });
});
```

## 問2 どの層で確かめるか

次のそれぞれを、単体テスト・結合テスト（API に HTTP で頼む、データベースは本物）・E2E テスト（ブラウザ）のどれで確かめるのがよいでしょう。理由も1行で。

1. 期限の文（`dueLabel`）が、6日後は「あと 6 日」、7日後は「12月17日まで」になる
2. ログインしていないと `GET /api/tasks` が 401 になる
3. 同じ題名の、終わっていないタスクを2つ作ると 409 になる（データベースの部分ユニークインデックス）
4. 登録のメールのリンクを開いて「確認する」を押すと、ログインのページに「確認しました」と出る

## 問3 カバレッジは何 % か

本文8節の `shipping.ts` に、次のテストだけを書いて、カバレッジを測りました。line % と branch % は、それぞれいくつになるでしょう。そして、このテストの問題は何でしょう。

```ts
test('いろいろ呼ぶ', () => {
  shippingFee(1000);
  shippingFee(1000, { island: true });
  shippingFee(3000, { member: true });
  shippingFee(5000);
  shippingFee(5000, { island: true });
  assert.throws(() => shippingFee(-1));
  assert.throws(() => shippingFee(1.5));
});
```

## 問4 このミュータントは見つけられるか

練習問題1の `slug.ts` の、最後の `.replace(/-$/, '') // 切ったところが - なら消す` の行を消したミュータントを考えます。

1. これは、どんなテストでも見つけられない「等価なミュータント」でしょうか
2. 見つけられるなら、それを見つけるテストを1つ書いてください。見つけられないなら、理由を書いてください
