# 第56章 テストの考え方

ここまでの章でも、練習問題のテスト（`node --test`）をたくさん動かしてきました。第11部では、テストを**自分で書く側**に回ります。この章では、`node:test` を使って、「何を・どの大きさで・どう確かめるか」を、小さな関数で手を動かしながら決めていきます。時刻や外とのやりとりを偽物に替える方法、カバレッジの読み方、そして「そのテストは本当に間違いを見つけられるのか」を確かめる方法（ミュータント）まで扱います。

| 項目 | 内容 |
| --- | --- |
| 所要時間の目安 | 4〜5時間 |
| 前提 | 第2部 第7章（`node --test` の基本）、第3部 第11・12章（クロージャ・`debounce`・async/await）、第7部（TypeScript） |
| この章のゴール | テストを「仕様を例で書いたもの」として書ける / `assert` の関数を使い分け、失敗の出力を読める / 境界の値を表にして、テストを回せる / 時刻・タイマー・外とのやりとりを、引数や `mock` で偽物に替えられる / 単体・結合・E2E の違いと、どこに何を書くかを説明できる / カバレッジを測り、その限界を説明できる / ミュータントで、テストの強さを確かめられる |

| フォルダ | 中身 |
| --- | --- |
| [samples/](samples/) | 本文で書くプログラムの完成形 |
| [exercises/](exercises/) | 練習問題（テストで確かめる。テストを書く問題が多い） |
| [solutions/](solutions/) | 模範解答 |

> **読み方**
> - 第11部の最初の章です。先に、第11部のフォルダを `~/dev/part11` にコピーします（[第11部の README](../README.md) の「準備」。1回だけ）。
>
>   ```sh
>   $ bash （ここに Finder から part11-testing フォルダの中の setup-part11.sh をドラッグ）
>   ```
>
> - この章のコマンドは、`~/dev/part11/ch56-testing-basics/` で実行します。手を動かして作るファイルは、このフォルダの直下に作ります。
>
>   ```sh
>   $ cd ~/dev/part11/ch56-testing-basics
>   ```
>
> - この章は、サーバを起動しません（ポートを使いません）。
> - 7節（テストの層）は、手を動かす所がありません。急ぐときは、表だけ読んで先に進んでかまいません。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと | 後で使う場面 |
| --- | --- |
| `node:test` と `assert`（1〜4節） | 第57章（API とデータベースのテスト）、成果物（サービスの単体テスト） |
| 時刻・外とのやりとりを偽物に（5・6節） | 第57章（偽物のリポジトリ・外の API）、第58章（Vitest の `vi.fn`・偽物の `fetch`）、第12部 第64章（ジョブの再試行） |
| テストの層（7節） | 第57・58章（層ごとのテスト）、成果物（テストのフォルダを層で分ける）、第13部 |
| カバレッジ（8節） | 第59章（CI でカバレッジの下限を決める）、成果物 |
| ミュータント（9節） | この部の「テストを書く」練習問題すべて |

---

## 1. テストは「仕様を例で書いたもの」

「作業の時間を `1h30m` のように書けるようにしたい」と決めたとします。この決まり（**仕様**）を文章で書くと、あいまいな所が残ります。`90` と書いたら? `1.5h` は? 0 分は?

テストは、仕様を**具体的な入力と、期待する出力の例**で書いたものです。例にすると、あいまいな所がはっきりし、コンピュータが何度でも確かめてくれます。

| 書き方 | 決まり |
| --- | --- |
| `90` | 90 分（数字だけなら分） |
| `45m`・`2h`・`1h30m` | 45 分・120 分・90 分 |
| 前後の空白 | 無視する |
| 1 分より少ない・24 時間より多い・読めない | `null` |

### 1.1 手を動かす: 関数と、最初のテスト

`duration.ts` を作ります（正規表現は第3部 第11章。`(?:…)` は「まとめるが、取り出さない」かっこ、`?` は「あってもなくてもよい」です）。

```ts
const MAX_MINUTES = 24 * 60;

function inRange(minutes: number): number | null {
  return minutes >= 1 && minutes <= MAX_MINUTES ? minutes : null;
}

export function parseDuration(text: string): number | null {
  const s = text.trim();
  if (/^\d+$/.test(s)) return inRange(Number(s));
  const match = /^(?:(\d+)h)?(?:(\d+)m)?$/.exec(s);
  if (match === null) return null;
  const [, hours, minutes] = match;
  if (hours === undefined && minutes === undefined) return null; // 空の文字列
  return inRange(Number(hours ?? 0) * 60 + Number(minutes ?? 0));
}
```

`duration.test.ts` を作ります。

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseDuration } from './duration.ts';

test('数字だけなら分', () => {
  assert.equal(parseDuration('90'), 90);
});

test('h と m を組み合わせられる', () => {
  assert.equal(parseDuration('1h30m'), 90);
});
```

```sh
$ node --test duration.test.ts
✔ 数字だけなら分 (0.721401ms)
✔ h と m を組み合わせられる (0.22843ms)
ℹ tests 2
ℹ suites 0
ℹ pass 2
ℹ fail 0
…
```

| 書いたもの | 意味 |
| --- | --- |
| `test(名前, 関数)` | テストを1つ登録する。関数が例外を投げずに終われば成功 |
| `assert.equal(実際, 期待)` | 2つが `===` で等しくなければ、例外（`AssertionError`）を投げる |
| `node:assert/strict` | 「厳しい」比べ方の `assert`。`assert.equal` が `==` ではなく `===` で比べる。いつもこちらを使う |
| テストの名前 | 仕様の文にする。失敗したとき、名前だけで「どの決まりが破れたか」が分かる |

### 1.2 手を動かす: わざと壊して、失敗の出力を読む

テストは、失敗したときに役に立つものです。失敗の出力を一度、ゆっくり読んでおきます。`duration.ts` の `* 60` を、わざと `* 6` に変えて動かします。

```sh
$ node --test duration.test.ts
✔ 数字だけなら分 (0.778484ms)
✖ h と m を組み合わせられる (0.910887ms)
…
✖ failing tests:

test at duration.test.ts:9:1
✖ h と m を組み合わせられる (0.910887ms)
  AssertionError [ERR_ASSERTION]: Expected values to be strictly equal:

  36 !== 90

      at TestContext.<anonymous> (file:///Users/alice/dev/part11/ch56-testing-basics/duration.test.ts:10:10)
…
$ echo $?
1
```

| 出力 | 読み方 |
| --- | --- |
| `test at duration.test.ts:9:1` | 失敗したテストが書いてある場所（9行目） |
| `36 !== 90` | 左が実際の値、右が期待した値 |
| `duration.test.ts:10:10` | 失敗した `assert` の場所 |
| 終了ステータス `1` | 1つでも失敗すると 1。CI（第59章）は、これを見て「失敗」と判断する |

確かめたら、`* 60` に戻してください。**テストを書いたら、一度わざと失敗させて、本当に失敗することを見る**のは良い習慣です。いつでも成功するテスト（書き間違いで何も確かめていないテスト）を見つけられます。

## 2. `assert` を使い分ける

| 関数 | 確かめること | 例 |
| --- | --- | --- |
| `assert.equal(a, b)` | `a === b`（数・文字列・真偽値・`null`） | `assert.equal(parseDuration('2h'), 120)` |
| `assert.deepEqual(a, b)` | オブジェクト・配列の中身が同じ（入れ子も） | `assert.deepEqual(result, { sent: 2, failed: 0 })` |
| `assert.partialDeepStrictEqual(a, b)` | `a` が `b` の項目を（少なくとも）持つ。ほかの項目は見ない | 応答の一部だけ確かめる（第57章） |
| `assert.match(文字列, 正規表現)` | 文字列が正規表現に合う | `assert.match(message, /送れませんでした/)` |
| `assert.ok(値)` | 値が「真」と見なされる | 使うのは、ほかで書けないときだけ（失敗の文が分かりにくい） |
| `assert.throws(関数, 期待)` | 関数が例外を投げる。期待はクラスか正規表現 | `assert.throws(() => total([], 'X'), /知らない/)` |
| `await assert.rejects(Promise, 期待)` | Promise が失敗する（async 関数の例外） | `await assert.rejects(save(-1), RangeError)` |

`node:assert/strict` では、`deepEqual` も厳しい比べ方（`deepStrictEqual`）です。

**つまずきやすい所**: オブジェクトを `assert.equal` で比べると、中身が同じでも失敗します（`===` は「同じもの」かを比べるため）。中身を比べるのは `deepEqual` です。

### 2.1 手を動かす: 空白と、例外の確かめ方

`duration.test.ts` に足します。

```ts
test('前後の空白は無視する', () => {
  assert.equal(parseDuration(' 1h '), 60);
});
```

`assert.throws` は、関数を**呼ばずに渡す**のがポイントです。`assert.throws(() => f(x))` は正しく、`assert.throws(f(x))` は、`f(x)` が `assert` の前に例外を投げてしまい、テストが失敗します。async 関数なら `await assert.rejects(f(x))` です。`await` を忘れると、確かめ終わる前にテストが終わってしまいます（練習問題4）。

## 3. 表で回す・境界の値

「1 分〜24 時間」のような範囲の決まりでは、間違いは**境目**に集まります（`<` と `<=` の書き間違いなど）。そこで、境目の内側と外側の値を必ず確かめます（**境界値**のテスト）。また、「同じように扱われるはずの入力のまとまり」（数字だけ・h だけ・h と m・読めないもの）から、1つずつ代表を選びます（**同値分割**）。

例がたくさんあるときは、テストを1つずつ書かず、**表（配列）にして `for` で回します**。

### 3.1 手を動かす: 境界を表にする

`duration.test.ts` の import の行を `import { describe, test } from 'node:test';` に変え、ここまでのテストを `describe` で囲みます。そして、表を足します。

```ts
describe('parseDuration', () => {
  // （1・2節で書いた test をここに移す）

  const cases: [string, number | null][] = [
    ['0', null],
    ['1', 1],
    ['1440', 1440],
    ['1441', null],
    ['24h', 1440],
    ['24h1m', null],
    ['', null],
    ['h', null],
    ['1.5h', null],
    ['30m1h', null],
  ];
  for (const [input, expected] of cases) {
    test(`${JSON.stringify(input)} → ${expected}`, () => {
      assert.equal(parseDuration(input), expected);
    });
  }
});
```

```sh
$ node --test duration.test.ts
▶ parseDuration
  ✔ 数字だけなら分 (…ms)
  ✔ h と m を組み合わせられる (…ms)
  ✔ 前後の空白は無視する (…ms)
  ✔ "0" → null (…ms)
  ✔ "1" → 1 (…ms)
  ✔ "1440" → 1440 (…ms)
  ✔ "1441" → null (…ms)
…
ℹ tests 13
ℹ suites 1
```

| 書いたもの | 意味 |
| --- | --- |
| `describe(名前, 関数)` | テストをまとめる（**スイート**、suite）。出力が入れ子になる |
| `[string, number \| null][]` | 「文字列と、数か null」の組の配列（第7部 第35章 タプル） |
| テストの名前に入力を入れる | 失敗したとき、どの行の例かがすぐ分かる。`JSON.stringify` で空の文字列も `""` と見える |

境目は「1 と 0」「1440 と 1441」「`24h` と `24h1m`」です。片方だけでは、`<` と `<=` の取り違えを見つけられません。

## 4. 読みやすく、壊れにくいテスト

| 決まり | 理由 |
| --- | --- |
| 1つのテストで、1つの決まりを確かめる | 失敗したとき、名前で原因が分かる |
| 準備 → 動かす → 確かめる の順に書く（**AAA**: Arrange・Act・Assert） | どこが準備で、どこが本題かが読める |
| テストの中で `if` や計算をしない | テストが間違っていても気付けない。期待する値は、計算せずに書く |
| テストどうしで、状態を共有しない | 順番や、1つだけ動かしたときに結果が変わる（6節の `beforeEach`） |
| 実装の「やり方」ではなく、外から見える「結果」を確かめる | 中を書き直しただけで壊れるテストは、直すのが重荷になる |

動かし方も覚えておきます。

| コマンド | すること |
| --- | --- |
| `node --test` | `test/`・`*.test.ts` など、決まった名前のファイルを全部探して動かす（第3部 第16章） |
| `node --test --test-name-pattern='境界\|1440' duration.test.ts` | 名前が正規表現に合うテストだけ動かす |
| `node --test --watch duration.test.ts` | ファイルを保存するたびに動かし直す（`Ctrl+C` で止める） |
| `test.only(…)` + `node --test --test-only` | そのテストだけ動かす。**消し忘れると、ほかのテストが動かないまま成功する**ので、コミットの前に消す（第59章で ESLint に見張らせる） |
| `test.skip(…)`・`test.todo(…)` | 飛ばす・まだ書いていない、と出力に出す |

## 5. 「今」と時間を、テストで決められるようにする

### 5.1 手を動かす: 「今」を引数で受け取る

タスクの期限まで何日かを出す関数を考えます。中で `new Date()` を読むと、**いつ動かすかで結果が変わり**、テストに期待する値を書けません（[samples/due-bad.ts](samples/due-bad.ts)）。

そこで、「今」を引数で受け取ります。`due.ts` を作ります。

```ts
const DAY_MS = 24 * 60 * 60 * 1000;

export function daysUntil(due: string, now: Date, timeZone = 'Asia/Tokyo'): number {
  const today = new Intl.DateTimeFormat('en-CA', { timeZone }).format(now); // YYYY-MM-DD（第8部 第46章）
  return (Date.parse(due) - Date.parse(today)) / DAY_MS;
}

export function dueLabel(due: string | null, now: Date): string {
  if (due === null) return '期限なし';
  const days = daysUntil(due, now);
  if (days === 0) return '今日まで';
  return days > 0 ? `あと ${days} 日` : `${-days} 日過ぎ`;
}
```

`due.test.ts` を作ります。

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dueLabel } from './due.ts';

const now = new Date('2026-12-10T00:00:00Z'); // 日本時間 2026-12-10 の 9 時

test('今日', () => assert.equal(dueLabel('2026-12-10', now), '今日まで'));
test('3日後', () => assert.equal(dueLabel('2026-12-13', now), 'あと 3 日'));
test('2日前', () => assert.equal(dueLabel('2026-12-08', now), '2 日過ぎ'));

test('日本時間では、もう次の日（UTC では前の日の 15 時）', () => {
  assert.equal(dueLabel('2026-12-10', new Date('2026-12-09T15:00:00Z')), '今日まで');
});
```

```sh
$ node --test due.test.ts
```

最後のテストは、「UTC の日付で計算してしまう」間違いを見つけるためのものです。日本時間の 0 時〜9 時は、UTC ではまだ前の日です。夜中にだけ失敗するテストは、こういう所から生まれます。

本番のコードでは、呼ぶ側が `dueLabel(task.dueDate, new Date())` と「今」を渡します。**「今」・乱数・環境変数のように、毎回変わるものは、関数の外から渡す**と、テストで好きな値を入れられます（**依存を注入する**、dependency injection）。

### 5.2 中で `new Date()` を読むコードを確かめる: `mock.timers`

自分では直せないコード（ライブラリなど）が中で `new Date()` を読むときは、`node:test` の **`mock.timers`** で、`Date` を偽物にできます。`due.test.ts` に足します。

```ts
import { dueLabel as dueLabelBad } from './due-bad.ts';

test('mock.timers で「今」を止める', (t) => {
  t.mock.timers.enable({ apis: ['Date'], now });
  assert.equal(dueLabelBad('2026-12-13'), 'あと 3 日');
});
```

`due-bad.ts` は `cp samples/due-bad.ts .` でコピーしてください。

| 書いたもの | 意味 |
| --- | --- |
| `(t) => …` | テストの関数は、引数でそのテストの道具（**テストのコンテキスト**）を受け取れる |
| `t.mock.timers.enable({ apis: ['Date'], now })` | `Date` を偽物にし、「今」を `now` にする。そのテストが終わると、自動で元に戻る |

### 5.3 手を動かす: タイマーを進める

`setTimeout` を使うコードは、本当に待つとテストが遅くなり、時間に頼るので不安定になります。`mock.timers` は `setTimeout` も偽物にでき、**時間を手で進められます**。

第3部 第11章の `debounce` を `debounce.ts` に書きます。

```ts
export function debounce<A extends unknown[]>(fn: (...args: A) => void, ms: number) {
  let timer: ReturnType<typeof setTimeout> | undefined;
  return (...args: A): void => {
    clearTimeout(timer);
    timer = setTimeout(() => fn(...args), ms);
  };
}
```

`debounce.test.ts` を作ります。

```ts
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { debounce } from './debounce.ts';

test('続けて呼ぶと、最後の呼び出しから 300ms 後に1回だけ動く', (t) => {
  t.mock.timers.enable({ apis: ['setTimeout'] });
  const save = t.mock.fn((_text: string) => {});
  const debounced = debounce(save, 300);

  debounced('a');
  t.mock.timers.tick(200);
  debounced('ab');
  t.mock.timers.tick(299);
  assert.equal(save.mock.callCount(), 0);

  t.mock.timers.tick(1);
  assert.equal(save.mock.callCount(), 1);
  assert.deepEqual(save.mock.calls[0]?.arguments, ['ab']);
});
```

```sh
$ node --test debounce.test.ts
✔ 続けて呼ぶと、最後の呼び出しから 300ms 後に1回だけ動く (…ms)
```

| 書いたもの | 意味 |
| --- | --- |
| `t.mock.timers.tick(200)` | 偽物の時計を 200ms 進める。その間に来る `setTimeout` の関数が、その場で呼ばれる。本当には待たない |
| `t.mock.fn(関数)` | 呼ばれ方を覚える偽物の関数（6節） |
| `tick(299)` の後で 0 回、`tick(1)` の後で 1 回 | ここでも境目（299ms と 300ms）を確かめている |

## 6. 外とやりとりする部分を偽物にする

メールを送る・API を呼ぶ・データベースに書く、といった部分は、テストのたびに本物を使うと、遅く、不安定で、後片付けが要ります。そこで、その部分を**偽物**に取り替えます。偽物には、いくつかの種類があります。

| 呼び方 | 中身 | この部での例 |
| --- | --- | --- |
| **スタブ**（stub） | 決まった値を返すだけ | いつも同じタスクの一覧を返す `listTasks` |
| **フェイク**（fake） | 本物と同じように動く、簡単な実装 | メモリの `Map` に覚えるリポジトリ（第57章）、第10部の偽の SMTP サーバ |
| **モック・スパイ**（mock / spy） | 呼ばれ方（回数・引数）を覚えて、後で確かめる | `t.mock.fn()` |

どれも、5節と同じく「外から渡す」形になっていれば、テストで取り替えられます。

### 6.1 手を動かす: `mock.fn` で、送った相手を確かめる

`remind.ts` を作ります。送る処理 `send` を引数で受け取ります（`due.ts` の `daysUntil` を使います）。

```ts
import { daysUntil } from './due.ts';

export interface Task {
  id: number;
  title: string;
  status: 'todo' | 'doing' | 'done';
  dueDate: string | null;
}

export async function remindDueToday(
  tasks: Task[],
  { now, send }: { now: Date; send: (task: Task) => Promise<void> },
): Promise<{ sent: number; failed: number }> {
  let sent = 0;
  let failed = 0;
  for (const task of tasks) {
    if (task.status === 'done' || task.dueDate === null) continue;
    if (daysUntil(task.dueDate, now) !== 0) continue;
    try {
      await send(task);
      sent++;
    } catch (err) {
      console.error(`送れませんでした: ${task.id}`, err);
      failed++;
    }
  }
  return { sent, failed };
}
```

`remind.test.ts` を作ります。

```ts
import { beforeEach, test } from 'node:test';
import assert from 'node:assert/strict';
import { remindDueToday, type Task } from './remind.ts';

const now = new Date('2026-12-10T00:00:00Z');

function aTask(overrides: Partial<Task> = {}): Task {
  return { id: 1, title: '牛乳を買う', status: 'todo', dueDate: '2026-12-10', ...overrides };
}

let tasks: Task[];
beforeEach(() => {
  tasks = [
    aTask({ id: 1 }),
    aTask({ id: 2, status: 'done' }),
    aTask({ id: 3, dueDate: '2026-12-11' }),
    aTask({ id: 4, dueDate: null }),
    aTask({ id: 5, status: 'doing' }),
  ];
});

test('今日が期限で、終わっていないものだけ送る', async (t) => {
  const send = t.mock.fn(async (_task: Task) => {});
  const result = await remindDueToday(tasks, { now, send });

  assert.deepEqual(result, { sent: 2, failed: 0 });
  assert.deepEqual(send.mock.calls.map((call) => call.arguments[0]?.id), [1, 5]);
});
```

| 書いたもの | 意味 |
| --- | --- |
| `aTask(overrides)` | テストのデータを作る関数。違う所だけを書けば、ほかは「ふつうの値」になる（第57章でも使う） |
| `beforeEach(関数)` | 各テストの前に動く。テストごとにデータを作り直すので、前のテストの影響を受けない（`afterEach`・`before`・`after` もある） |
| `send.mock.calls` | 呼ばれた記録の配列。`calls[i].arguments` が、i 回目の引数 |
| `send.mock.callCount()` | 呼ばれた回数 |

### 6.2 手を動かす: 失敗したとき・`mock.method`

`send` が失敗したときも確かめます。`console.error` が出力を汚すので、**メソッドを偽物に差し替える** `t.mock.method` を使います。

```ts
test('送れないものがあっても、残りは送る', async (t) => {
  const send = t.mock.fn(async (task: Task) => {
    if (task.id === 1) throw new Error('つながらない');
  });
  const error = t.mock.method(console, 'error', () => {});

  const result = await remindDueToday(tasks, { now, send });

  assert.deepEqual(result, { sent: 1, failed: 1 });
  assert.equal(send.mock.callCount(), 2);
  assert.match(String(error.mock.calls[0]?.arguments[0]), /送れませんでした: 1/);
});
```

`t.mock.method(オブジェクト, 'メソッドの名前', 偽物)` は、テストが終わると元に戻ります。

**偽物にしすぎない**: 偽物が増えるほど、テストは「偽物どうしが話しているだけ」になり、本物と組み合わせたときの間違いを見つけられなくなります。偽物にするのは、遅いもの・不安定なもの・外の世界に影響するもの（メール・お金・時刻）だけにし、自分のコードどうしは、できるだけ本物のまま組み合わせます。本物のデータベースを使うテストは、第57章で書きます。

## 7. テストの層: 単体・結合・E2E

テストは、確かめる範囲の大きさで呼び分けます。第10部の成果物で並べると、次のようになります。

| 層 | 確かめる範囲 | 第10部の成果物の例 | 速さ | 見つけられる間違い |
| --- | --- | --- | --- | --- |
| **単体テスト**（unit） | 1つの関数・モジュール。外とのやりとりは偽物 | パスワードの決まり、トークンのハッシュ、`safeNext` | とても速い（数ミリ秒） | 計算・分岐・境界の間違い |
| **結合テスト**（integration） | いくつかの部品と、本物のデータベースなど | `createPgTaskRepo` が持ち主で絞るか、API に HTTP で頼んで 201 が返るか（`test/api.test.ts`） | 速い〜ふつう（数十〜数百ミリ秒） | SQL の間違い、ミドルウェアの順番、部品のつなぎ目 |
| **E2E テスト**（end-to-end） | 画面からデータベースまで全部。ブラウザを動かす | 登録 → メールのリンク → ログイン → タスクを作る | 遅い（数秒） | 画面と API のつながり、Cookie・プロキシ・リダイレクト |

| 考え方 | 中身 |
| --- | --- |
| **テストのピラミッド** | 速い単体テストをたくさん、結合テストをそこそこ、遅い E2E を少し |
| **テストのトロフィー** | 画面のある Web アプリでは、結合テスト（部品を本物のまま組み合わせたもの）がいちばん「お金に見合う」ので、そこを厚くする |

どちらも、言いたいことは同じです。**遅いテストは少なく、でも、つなぎ目は必ずどこかで確かめる**。どの層で確かめるかは、「その間違いを、いちばん速く・はっきり見つけられる層」で選びます。

| 確かめたいこと | 選ぶ層 |
| --- | --- |
| パスワードが 11 文字なら断る | 単体（境界の値を表で全部） |
| ログインしていなければ 401 | 結合（HTTP で頼む。第57章） |
| ほかの人のタスクは 404 | 結合（データベースまで本物で。第57章） |
| ログインのボタンを押すと、タスクの一覧が出る | 画面の結合テスト（第58章）と、E2E を1本（第58章） |

**Flask では**: pytest で、関数の単体テストと、`app.test_client()`（サーバを起動せずにリクエストを送る道具）で API の結合テストを書くのがふつうです。E2E は Selenium や Playwright を使います。層の考え方は、言葉もそのまま同じです。

## 8. カバレッジを測る

**カバレッジ**（coverage）は、テストを動かしたときに、コードのどの行・どの分かれ道を通ったかの割合です。「まだ確かめていない所」を見つけるのに使います。

### 8.1 手を動かす: 足りないテストを見つける

送料を決める関数と、わざと足りないテストを、サンプルからコピーします。

```sh
$ cp samples/shipping.ts samples/shipping.test.ts .
$ node --test --experimental-test-coverage shipping.test.ts
…
ℹ start of coverage report
ℹ -------------------------------------------------------------
ℹ file         | line % | branch % | funcs % | uncovered lines
ℹ -------------------------------------------------------------
ℹ shipping.ts  |  80.00 |    50.00 |  100.00 | 5-6
ℹ -------------------------------------------------------------
ℹ all files    |  80.00 |    50.00 |  100.00 |
ℹ -------------------------------------------------------------
ℹ end of coverage report
```

| 列 | 意味 |
| --- | --- |
| line % | 通った行の割合 |
| branch % | 通った分かれ道（`if` の「はい」と「いいえ」、`? :`、`&&` など）の割合 |
| funcs % | 呼ばれた関数の割合 |
| uncovered lines | 一度も通らなかった行。5〜6行目は、例外を投げる所 |

行は 80% なのに、分かれ道は 50% です。`member && …`、`island ? 500 : 0` のような、1行の中の分かれ道を、まだ片方しか通っていないからです。**行のカバレッジだけを見ると、確かめていない道を見落とします。**

| オプション | 意味 |
| --- | --- |
| `--experimental-test-coverage` | カバレッジを測って表を出す（執筆時点の Node.js 24 では、まだ「試験的」の扱い） |
| `--test-coverage-include='**/shipping.ts'` | 測るファイルを決める（テストのファイルは、もともと除かれる） |
| `--test-coverage-lines=90`・`--test-coverage-branches=80` | 下限。下回ると終了ステータスが 1 になる（CI で使う。第59章） |

### 8.2 カバレッジで分からないこと

カバレッジは「通ったか」しか見ません。**通った所で、正しい値を確かめたかは分かりません。** 極端な例では、`assert` を1つも書かずに関数を呼ぶだけで、カバレッジは 100% になります。

| カバレッジが教えてくれること | 教えてくれないこと |
| --- | --- |
| 一度も動かしていない行・分かれ道（ここは確実に確かめていない） | 動かした所の結果を、正しく確かめたか |
| | 書き忘れた決まり（コードに無いものは測れない） |

なので、「カバレッジ 100%」を目標にするより、**低い所を見つける道具**として使います。成果物では、下限を決めて、大きく下がったときに気付けるようにします（第59章）。

## 9. テストのテスト: ミュータント

では、「テストが本当に間違いを見つけられるか」は、どう確かめればよいでしょう。答えは、1.2節でやったことです。**わざとコードを壊して、テストが失敗するかを見る**。

コードを少しだけ壊したもの（`<=` を `<` に、`trim()` を消す、など）を**ミュータント**（mutant、突然変異体）と呼びます。良いテストは、どのミュータントでも失敗します（「ミュータントを殺す」と言います）。この考え方を自動で行う道具（**ミューテーションテスト**。JavaScript では Stryker など）もあります。

この部では、教材のフォルダの [tools/check-tests.ts](../tools/check-tests.ts) で、決まったミュータントを相手に確かめます。

### 9.1 手を動かす: 自分のテストで、ミュータントを見つける

確かめる実装を取り替えられるように、`duration.test.ts` の `import { parseDuration } …` の行を、次に置き換えます（練習問題のテストと同じ形です）。

```ts
import path from 'node:path';
import { pathToFileURL } from 'node:url';

const file = path.resolve(process.env.MODULE ?? path.join(import.meta.dirname, 'duration.ts'));
const { parseDuration }: typeof import('./duration.ts') = await import(pathToFileURL(file).href);
```

| 書いたもの | 意味 |
| --- | --- |
| `process.env.MODULE ?? …` | 環境変数 `MODULE` があればそのファイルを、無ければ `duration.ts` を読む |
| `await import(…)` | ファイルを、動かしている途中で読み込む（第3部 第14章）。`pathToFileURL` でパスを `file://` の URL にする |
| `typeof import('./duration.ts')` | 読み込んだものに、`duration.ts` と同じ型を付ける |

1.1節の2つのテストだけの状態で確かめると、こうなります。

```sh
$ node ../tools/check-tests.ts duration.test.ts --mutants samples/mutants
[OK] 正しい実装（duration.ts）で、すべてのテストが通る
[NG] ミュータント1（下限を 0 にした（0 分を通す））を見逃した（すべてのテストが通ってしまう）
[NG] ミュータント2（上限を「より小さい」にした（24時間ちょうどを断る））を見逃した（すべてのテストが通ってしまう）
[NG] ミュータント3（前後の空白を除かない）を見逃した（すべてのテストが通ってしまう）
[OK] ミュータント4（1時間を 100 分と数える）を見つけた
[NG] ミュータント5（小数の時間も読む（1.5h → 90））を見逃した（すべてのテストが通ってしまう）
4 個の確認が失敗しました
```

2・3節のテストまで書いてあれば、すべて `[OK]` になるはずです。`[NG]` が出たら、そのミュータントで結果が変わる入力を考えて、テストを足してください（答えは [samples/duration.test.ts](samples/duration.test.ts)）。

| `check-tests.ts` がすること | |
| --- | --- |
| 1 | `MODULE` を正しい実装（今いるフォルダの `duration.ts`）にしてテストを動かし、**すべて通る**ことを確かめる |
| 2 | `MODULE` をミュータント（`samples/mutants/duration-1.ts` …）にしてテストを動かし、**どれかが失敗する**ことを確かめる |

**どんなテストでも見つけられないミュータント**もあります。たとえば `duration.ts` の「空の文字列なら null」の行を消しても、空の文字列は `inRange(0)` で結局 `null` になるので、結果は変わりません。こういうものを**等価なミュータント**と呼びます。その行は「無くても同じ」なので、コードを短くできる、という発見でもあります。

## 10. Flask（pytest）との対応

| pytest | `node:test` |
| --- | --- |
| `def test_xxx():` | `test('名前', () => { … })` |
| `assert a == b`（式をそのまま書く） | `assert.equal(a, b)`・`assert.deepEqual(a, b)` |
| `pytest.raises(ValueError)` | `assert.throws(() => …, RangeError)`・`await assert.rejects(…)` |
| `@pytest.mark.parametrize` | 表（配列）を `for` で回して `test` を作る |
| フィクスチャ（`@pytest.fixture`） | `beforeEach`・`afterEach`、データを作る関数（`aTask`） |
| `monkeypatch.setattr` | `t.mock.method(オブジェクト, '名前', 偽物)` |
| `unittest.mock.Mock` | `t.mock.fn()` |
| freezegun（時刻を止める） | `t.mock.timers.enable({ apis: ['Date'], now })` |
| coverage.py（`pytest --cov`） | `node --test --experimental-test-coverage` |
| `pytest -k 名前` | `node --test --test-name-pattern=名前` |

pytest のフィクスチャは「テストの関数の引数の名前」で、準備したものを受け取ります。`node:test` には、その仕組みはありません。代わりに `beforeEach` や、準備を返す関数（練習問題6の `setup(t)`）を書きます。

## まとめ

- テストは、仕様を「入力と期待する出力の例」で書いたもの。名前は仕様の文にし、一度わざと失敗させて、本当に失敗することを見る。
- `node:assert/strict` を使い、値は `equal`、中身は `deepEqual`、例外は `throws`・`await rejects` で確かめる。
- 間違いは境目に集まる。境目の内側と外側を表に並べ、`for` でテストを作る。
- 「今」・乱数・外とのやりとりは、引数で受け取る形にする。直せないコードは `t.mock.timers`・`t.mock.method` で偽物にする。偽物は、遅いもの・不安定なもの・外に影響するものだけにする。
- 単体・結合・E2E は、確かめる範囲の大きさの違い。遅いテストは少なく、つなぎ目はどこかで必ず確かめる。
- カバレッジは「確かめていない所」を見つける道具。通っただけで正しいとは限らない。
- テストの強さは、わざと壊したコード（ミュータント）で失敗するかで確かめる。

## 練習問題

[exercises/README.md](exercises/README.md) にあります。8問です（テストを書く問題が6問）。

## 参考資料

- Node.js Docs「Test runner」: https://nodejs.org/api/test.html
- Node.js Docs「Assert」: https://nodejs.org/api/assert.html
- Node.js Docs「Test runner: Mocking」（`mock.fn`・`mock.method`・`mock.timers`）: https://nodejs.org/api/test.html#mocking
- Node.js Docs「Collecting code coverage」: https://nodejs.org/api/test.html#collecting-code-coverage
- Martin Fowler「Mocks Aren't Stubs」: https://martinfowler.com/articles/mocksArentStubs.html
- Kent C. Dodds「The Testing Trophy and Testing Classifications」: https://kentcdodds.com/blog/the-testing-trophy-and-testing-classifications
- Stryker Mutator（ミューテーションテストの道具）: https://stryker-mutator.io/
- pytest documentation: https://docs.pytest.org/

---

第11部の目次: [../README.md](../README.md) ／ 次の章: [第57章 API とデータベースのテスト](../ch57-api-db-testing/README.md)
