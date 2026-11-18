# 第56章 模範解答

問題は [../exercises/README.md](../exercises/README.md) にあります。

| 問題 | 解答のファイル | 確かめ方（`exercises/` で） |
| --- | --- | --- |
| 1 | [slug.test.ts](slug.test.ts) | `node ../../tools/check-tests.ts ../solutions/slug.test.ts` |
| 2 | [due-label.ts](due-label.ts) | `MODULE=../solutions/due-label.ts node --test due-label.test.ts` |
| 3 | [password-rules.test.ts](password-rules.test.ts) | `node ../../tools/check-tests.ts ../solutions/password-rules.test.ts` |
| 4 | このファイルの問題4 | |
| 5 | [digest.test.ts](digest.test.ts) | `node ../../tools/check-tests.ts ../solutions/digest.test.ts` |
| 6 | [debounce.test.ts](debounce.test.ts) | `node ../../tools/check-tests.ts ../solutions/debounce.test.ts` |
| 7 | [discount.test.ts](discount.test.ts) | 問題7の節を見てください |
| 8 | [limiter.test.ts](limiter.test.ts) | `node ../../tools/check-tests.ts ../solutions/limiter.test.ts` |

テストの解答は、確かめる実装を `../exercises/○○.ts` から読みます（`MODULE` が無いとき）。

---

## 問題1 スラッグを作る関数のテスト

決まりの表の1行に、テストを1つ書きました（[slug.test.ts](slug.test.ts)）。

```ts
test('大文字は小文字になる', () => {
  assert.equal(toSlug('Buy Milk'), 'buy-milk');
});

test('続いた - は1つになる', () => {
  assert.equal(toSlug('a  -  b'), 'a-b');
});

test('50 文字で切り、切ったところの - は消す', () => {
  assert.equal(toSlug('a'.repeat(60)), 'a'.repeat(50));
  assert.equal(toSlug(`${'a'.repeat(49)} b`), 'a'.repeat(49)); // 50 文字目が - になる
});

test('使える文字が無ければ null', () => {
  assert.equal(toSlug('牛乳'), null);
  assert.equal(toSlug(''), null);
});
```

- `'a  -  b'` は、空白が `-` になった後 `a-----b` になるので、「続いた `-` を1つにする」を確かめられます。
- 50 文字の決まりは、「60 文字を 50 文字に切る」だけでは、「切ったところの `-` を消す」を確かめられません。49 文字の `a` の後に空白を置くと、50 文字目がちょうど `-` になります（問題4の問4）。
- `null` の決まりは、`assert.equal(…, null)` で確かめます。ミュータント6（空の文字列を返す）は、`'' !== null` なので見つかります。

**つまずきやすい所**: 1つのテストに、たくさんの決まりを詰め込むと、ミュータントは見つかっても、失敗したときに「どの決まりが破れたか」が名前から分かりません。

## 問題2 「今」を引数で受け取る形に直す

```ts
export function dueLabel(due: string | null, now: Date): string {
  if (due === null) return '期限なし';
  const today = new Intl.DateTimeFormat('en-CA', { timeZone: TIME_ZONE }).format(now);
  const days = (Date.parse(due) - Date.parse(today)) / DAY_MS;
  if (days < 0) return `${-days} 日過ぎ`;
  if (days === 0) return '今日まで';
  if (days === 1) return '明日まで';
  if (days < 7) return `あと ${days} 日`;
  const [, month, day] = due.split('-').map(Number);
  return `${month}月${day}日まで`;
}
```

- 変えたのは、`new Date()` を引数の `now` にしたことだけです。呼ぶ側（画面など）は `dueLabel(task.dueDate, new Date())` と書きます。
- 小さい日数から順に `if` を並べると、どの範囲がどの文になるかが、上から読めます。
- `'2027-01-05'.split('-').map(Number)` は `[2027, 1, 5]` です。分割代入の最初を空にして（`[, month, day]`）、年を読み飛ばしています。

**つまずきやすい所**: `new Date(due).getMonth()` で月を読むと、`getMonth()` は 0 から数え（1月が 0）、しかも Mac の時間帯で読むので、ずれることがあります。期限の文字列から直接読むほうが確実です。

## 問題3 パスワードの決まりの境界を表で

```ts
const cases: [string, string, Problem[]][] = [
  ['ふつうのパスワード', 'correct horse battery', []],
  ['11 文字は短すぎる', 'a'.repeat(11), ['too_short']],
  ['12 文字は通る', 'b'.repeat(12), []],
  ['64 文字は通る', 'c'.repeat(64), []],
  ['65 文字は長すぎる', 'd'.repeat(65), ['too_long']],
  ['絵文字も1文字と数える（12 文字）', `abcdef${'🍣'.repeat(6)}`, []],
  ['絵文字も1文字と数える（11 文字）', `abcde${'🍣'.repeat(6)}`, ['too_short']],
  ['@ より前を含む', 'my name is alice!!', ['contains_email']],
  ['大文字でも含むとみなす', 'my name is ALICE!!', ['contains_email']],
  ['よく使われるもの', 'password1234', ['common']],
  ['大文字にしても、よく使われるもの', 'PASSWORD1234', ['common']],
];
```

- 境目は「11 と 12」「64 と 65」です。12 文字だけ、65 文字だけ、のように片側しか無いと、`<` と `<=` の取り違え（ミュータント1・2）を見つけられません。
- `abcdef` + 🍣 6個 は、文字の数では 12、`length` では 18 です。`length` で数える間違い（ミュータント3）は、「11 文字なのに通ってしまう」側で見つかります（`abcde` + 🍣 6個 は `length` では 17）。
- `@` より前が 3 文字の境目は、`alice`（5文字）では確かめられないので、`bob@example.com` と `bo@example.com` で別のテストを足しました（[password-rules.test.ts](password-rules.test.ts) の最後）。
- 長さの行では、ほかの問題が出ないように、`a` だけの文字列を使っています（`alice` を含まない・よく使われるものでもない）。

**つまずきやすい所**: `'a'.repeat(12)` は `contains_email` にはなりませんが、もし `EMAIL` が `aaa@example.com` だったら引っかかります。表の1行が「1つの決まりの境目だけ」を確かめるように、ほかの決まりに触れない値を選びます。

## 問題4 考えて答える

### 問1

A は ✔、B は ✔、C は ✖ と表示され、終了ステータスは **1** です。

```
✔ A: await を忘れた (…ms)
✔ B: rejects を await しない (…ms)
✖ C: 同じ中身のオブジェクト (…ms)
ℹ Error: Test "A: await を忘れた" at forget.test.ts:9:1 generated asynchronous activity after the test ended. This activity created the error "Error: 負の数" and would have caused the test to fail, but instead triggered an unhandledRejection event.
ℹ Error: Test "B: rejects を await しない" at forget.test.ts:13:1 generated asynchronous activity after the test ended. This activity created the error "AssertionError [ERR_ASSERTION]: Missing expected rejection." …
```

- A と B は、テストの関数が Promise を待たずに終わるので、その時点では「成功」です。10ms 後に例外が起きますが、もうテストは終わっています。
- `node:test` は、テストが終わった後の失敗（unhandled rejection）を見つけて `ℹ Error:` と知らせ、**全体の終了ステータスを 1 にします**。✔ が並んでいても、CI では失敗になります。直し方は、`async () => { await save(-1) … }`・`await assert.rejects(…)` と、待つことです。
- C は、`assert.equal` が `===` で比べるので、別々に作った2つのオブジェクトは等しくありません。`Values have same structure but are not reference-equal` と出ます。中身を比べるのは `assert.deepEqual` です。

A・C を消して B だけにしても、終了ステータスは 1 です（実際に確かめました）。ESLint の `@typescript-eslint/no-floating-promises` は、B のような「待っていない Promise」を見つけてくれます（第59章）。

### 問2

1. **単体テスト**。入力（日付）と出力（文）だけで決まる関数なので、境目（6日と7日）を表でたくさん確かめるのが速くて確実です。
2. **結合テスト**。ミドルウェアの並び（`requireUser` を付け忘れていないか）は、HTTP で頼まないと分かりません。データベースは要りますが、ブラウザは要りません。
3. **結合テスト**（データベースは本物）。部分ユニークインデックスはデータベースの決まりなので、偽物のリポジトリでは確かめられません。
4. **E2E テスト**。メールのリンク（`#token=…`）・画面・API・データベースのつながりを確かめたいので、ブラウザで通しで動かします。画面だけの動き（ボタンを押すと POST する）は、第58章の画面のテストでも確かめられます。

### 問3

line % も branch % も **100%** です（実際に測りました）。すべての行と分かれ道を通っているからです。

問題は、送料の値を1つも確かめていないことです。`shippingFee(5000, { island: true })` が 500 ではなく 600 を返すように壊れても、このテストは通ります。カバレッジは「通ったか」だけを測り、「正しいか」は測りません（本文8.2節）。

### 問4

1. 等価では**ありません**。`slice(0, 50)` で切ったところが、ちょうど `-` になることがあるからです。
2. たとえば次のテストで見つかります。49 文字の `a` と空白と `b` は、`aaa…a-b`（51 文字）になり、50 文字で切ると最後が `-` になります。

   ```ts
   test('切ったところの - は消す', () => {
     assert.equal(toSlug(`${'a'.repeat(49)} b`), 'a'.repeat(49));
   });
   ```

   練習問題1のミュータントには、この行を消したものは入っていません。check-tests.ts がすべて `[OK]` でも、見つけられない間違いが残っているかもしれない、ということです。ミュータントは「テストの弱い所を見つける」道具で、「テストが完全だ」という証明ではありません。

## 問題5 偽物の関数で、送った相手を確かめる

偽物を作る部品を1つ書き、テストごとに「人ごとのタスク」と「送れない相手」を変えました（[digest.test.ts](digest.test.ts)）。

```ts
function fakes(t: TestContext, tasksOf: Record<number, Task[]>, failFor: string[] = []) {
  const listTasks = t.mock.fn(async (userId: number) => tasksOf[userId] ?? []);
  const send = t.mock.fn(async (to: string, _count: number) => {
    if (failFor.includes(to)) throw new Error('送れない');
  });
  return { listTasks, send };
}

test('送れなかった人の id を返し、残りの人にも送る', async (t) => {
  const due = [{ id: 1, status: 'todo', dueDate: '2026-12-11' } satisfies Task];
  const { listTasks, send } = fakes(t, { 1: due, 2: due }, ['alice@example.com']);
  const failed = await sendDigest([alice, bob], { now, listTasks, send });

  assert.deepEqual(failed, [1]);
  assert.equal(send.mock.callCount(), 2);
});
```

| テスト | 見つけるミュータント |
| --- | --- |
| 数えないもの（終わったもの・期限なし・4日後）と、3日後だけ数える | 2（終わったものも数える）、4（2日以内） |
| 期限を過ぎたものも数える | 5 |
| 数えるものが無い人には送らない | 1 |
| 送れなかった人の id を返し、残りにも送る | 3（止まる）、6（逆の id） |
| 2つ数えたら、`2` で1通 | 7（1通ずつ送る） |

- `t.mock.fn` で作った偽物は、`t` のテストが終わると片付けられます。テストごとに作り直すので、前のテストの呼び出しの記録が混ざりません。
- `satisfies Task` は、オブジェクトが `Task` の形に合うかを確かめながら、`'todo'` のような文字列の型をそのまま残します（第7部 第36章）。`status: 'todo'` が `string` に広がってしまうのを防いでいます。
- 「数えるものが無い人には送らない」では、`listTasks` が人ごとに、その人の id で呼ばれたこと（`[1, 2]`）も確かめています。偽物の**呼ばれ方**を確かめるのは、引数の渡し間違いを見つけるためです。

**つまずきやすい所**: 3日以内を確かめるのに「3日後のタスク1つ」だけを使うと、「4日以内」に広げたミュータントは見つけられません（このミュータントはありませんが）。境目の外側（4日後）も一緒に入れておくと、両方向の間違いを見つけられます。

## 問題6 タイマーを進めて確かめる

```ts
function setup(t: TestContext) {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const save = t.mock.fn((_text: string) => {});
  const debounced = debounce(save, 300);
  const tick = (ms: number) => t.mock.timers.tick(ms);
  return { save, debounced, tick };
}

test('flush すると、待たずに今すぐ呼ばれ、後でもう一度は呼ばれない', (t) => {
  const { save, debounced, tick } = setup(t);
  debounced('a');
  debounced.flush();
  assert.deepEqual(save.mock.calls.map((call) => call.arguments), [['a']]);
  tick(1000);
  debounced.flush();
  assert.equal(save.mock.callCount(), 1);
});
```

| テスト | 見つけるミュータント |
| --- | --- |
| 299ms では 0 回、300ms で 1 回 | 3（1ms 短い） |
| 200ms 後にもう一度呼ぶと待ち直し、最後の引数で呼ぶ | 1（待ち直さない）、2（最初の引数） |
| cancel すると呼ばれない | 4 |
| flush で今すぐ、その後は呼ばれない | 5（flush が何もしない）、6（もう一度呼ぶ） |

- `setup(t)` は、テストの `t` を受け取って準備をまとめる関数です。pytest のフィクスチャの代わりになります（本文10節）。
- 「待ち直す」の確かめは、最初の呼び出しから 400ms（300ms を過ぎている）、最後の呼び出しから 200ms の時点で 0 回であることを見ます。待ち直さない実装なら、300ms の時点で呼ばれてしまいます。

**つまずきやすい所**: `t.mock.timers.enable()` を、`debounce(…)` より後に呼んでも動きます（`setTimeout` は、呼ばれたときに偽物かどうかが決まるため）。でも、`debounced('a')` より後に有効にすると、その `setTimeout` は本物になり、`tick` で進みません。準備の最初に有効にしておくのが安全です。

## 問題7 カバレッジを 100% にする

表の `uncovered lines`（17-23 行目）と、分かれ道を見ながら、OFF の3つの道・知らないクーポン・数の間違いのテストを足しました（[discount.test.ts](discount.test.ts)）。

```ts
test('OFF500 は 500 円引き', () => {
  assert.equal(total(lines, 'OFF500'), 201);
});

test('引きすぎても 0 円より下にはならない', () => {
  assert.equal(total(lines, 'OFF1000'), 0);
});

test('OFF の後が正の整数でなければ例外', () => {
  assert.throws(() => total(lines, 'OFFabc'), /知らないクーポンです: OFFabc/);
  assert.throws(() => total(lines, 'OFF0'), /知らないクーポンです/);
});
```

確かめ方（`exercises/` で。模範解答のテストは `../exercises/discount.ts` を読みます）:

```sh
$ node --test --experimental-test-coverage --test-coverage-include='**/discount.ts' \
    --test-coverage-lines=100 --test-coverage-branches=100 ../solutions/discount.test.ts
…
ℹ file        | line % | branch % | funcs % | uncovered lines
ℹ discount.ts | 100.00 |   100.00 |  100.00 |
$ echo $?
0
```

- `Math.max(0, sum - off)` のように、1行の中に分かれ道が隠れているものもあります（0 で止まるか）。行のカバレッジは、1回通れば 100% ですが、ここでは「引きすぎ」のテストで、結果が 0 になることも確かめています。
- `quantity <= 0` の例外は、1行に書いてあるので行のカバレッジには出ず、分かれ道のカバレッジにだけ出ます。

**つまずきやすい所**: `assert` の無いテスト（`total(lines, 'OFF500');` だけ）でも、カバレッジは上がります。問題4の問3と同じく、それでは確かめたことになりません。

## 問題8 回数の制限を、偽物の時計で確かめる

```ts
function setup(limit = 2) {
  const clock = { now: 0 };
  const limiter = createLimiter({ limit, windowMs: 1000, now: () => clock.now });
  return { clock, limiter };
}

test('窓の境目ちょうど（1000ms）で数え直す', () => {
  const { clock, limiter } = setup();
  limiter.hit('alice');
  limiter.hit('alice');
  clock.now = 999;
  assert.equal(limiter.hit('alice').allowed, false);
  clock.now = 1000;
  assert.deepEqual(limiter.hit('alice'), { allowed: true, remaining: 1, retryAfterMs: 0 });
});
```

| テスト | 見つけるミュータント |
| --- | --- |
| `limit` 回まで許し、remaining が 1 ずつ減る | 4（減らない） |
| 超えたら断り、次の窓までの時間（700 で断られたら 300） | 1（limit + 1）、5（いつも窓の長さ） |
| 境目ちょうどで数え直す（999 と 1000） | 2（数え直さない）、6（1ms 遅い） |
| 断られた後も、次の窓では limit 回できる | （断った呼び出しを数えない、の確かめ） |
| キーごとに数える | 3 |

- 偽物の時計は、`mock.timers` を使わなくても、「今」を返す関数を渡せる形なら、変数1つで作れます。**関数が「今」を引数（関数）で受け取る形**にしておくと、テストはいちばん簡単になります（本文5.1節）。
- `retryAfterMs` を、窓の始め（0）で断られたときだけで確かめると、「いつも 1000 を返す」ミュータント5と区別できません。窓の途中（700）で確かめるのがポイントです。

**つまずきやすい所**: `Date.now()` を本物のまま使い、`await new Promise((r) => setTimeout(r, 1000))` で本当に待つテストも書けますが、遅いうえに、Mac が忙しいと境目がずれて、ときどき失敗するテスト（**フレーキーなテスト**）になります。
