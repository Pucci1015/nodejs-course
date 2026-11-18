# 第68章 模範解答

練習問題（[../exercises/README.md](../exercises/README.md)）の模範解答と、この章の終わりのアプリです。

| もの               | 中身                                                                                                                            |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------- |
| [app/](app/)       | 第68章を終えたときの `~/dev/room-booking`（役割・会議室と予約の API・テスト 82 個）。本文の「手を動かす」で書いたものと見比べる |
| [extend/](extend/) | 問題7（題名を変える API）で書き換えたアプリのファイル                                                                           |
| `*.ts`             | 練習問題の模範解答                                                                                                              |

練習問題の解答を動かすときは、`exercises/` で `MODULE=../solutions/○○.ts` を付けてテストを動かします。

| 問題 | ファイル                                 | 確かめ方（`exercises/` で）                                                  |
| ---- | ---------------------------------------- | ---------------------------------------------------------------------------- |
| 1    | [to-booking.ts](to-booking.ts)           | `MODULE=../solutions/to-booking.ts node --test to-booking.test.ts`           |
| 2    | [cancel-problem.ts](cancel-problem.ts)   | `MODULE=../solutions/cancel-problem.ts node --test cancel-problem.test.ts`   |
| 3    | [day-query.ts](day-query.ts)             | `MODULE=../solutions/day-query.ts node --test day-query.test.ts`             |
| 4    | このファイルの「問題4」                  |                                                                              |
| 5    | [memory-bookings.ts](memory-bookings.ts) | `MODULE=../solutions/memory-bookings.ts node --test memory-bookings.test.ts` |
| 6    | [require-role.ts](require-role.ts)       | `MODULE=../solutions/require-role.ts node --test require-role.test.ts`       |
| 7    | [extend/](extend/)                       | `~/dev/room-booking` に置き換えて `node --test test/http/edit-title.test.ts` |
| 8    | [usage-report.ts](usage-report.ts)       | `MODULE=../solutions/usage-report.ts node --test usage-report.test.ts`       |

`app/` を動かすときは、教材のフォルダではなく、`~/dev` にコピーしてから `npm ci` します（第67章 2節）。

---

## 問題1 データの層の予約を、API の形にする

```ts
return {
  id: record.id,
  roomId: record.roomId,
  roomName: record.roomName,
  title: record.title,
  startsAt: record.startsAt.toISOString(),
  endsAt: record.endsAt.toISOString(),
  mine: record.userId === viewerId,
};
```

- 出す項目を1つずつ書きました。`const { userId, canceledAt, ...rest } = record` のように広げてから消す書き方は、今は同じ結果になります。しかし、後でデータの層に `createdBy` や `notes` のような項目が増えたとき、黙って API に出てしまいます。「出してよいもの」を数えるほうが、「出してはいけないもの」を数えるより安全です（第10部 第55章の「見せない」と同じ考え方）。
- 戻り値の型 `Booking` を書いておくと、項目を書き忘れたときに `tsc` が教えてくれます。ただし、余分な項目を広げて足したときは教えてくれません（TypeScript は、広げた余分な項目を断らない）。これも1つずつ書く理由です。

## 問題2 取り消せない理由を、ステータスと文にする

```ts
switch (result) {
  case 'ok':
    return null;
  case 'forbidden':
    return { status: 403, detail: '自分の予約だけを取り消せます' };
  case 'canceled':
    return { status: 409, detail: 'この予約は、もう取り消してあります' };
  case 'started':
    return { status: 409, detail: '始まった予約は取り消せません' };
}
```

- `default` を書かないので、`canCancel` に `'too-late'` のような結果が増えると、`tsc` が「`undefined` を返す道がある」と教えてくれます（戻り値の型に `undefined` が無いため）。`default: return null` と書くと、新しい結果を黙って「取り消せる」にしてしまいます。
- 本文のアプリでは、この読み替えを2段に分けています。サービスが `ForbiddenError`・`ConflictError` を投げ、`domain-errors.ts` が 403・409 にします。この問題のように1つの関数でステータスまで決めると短く書けますが、サービスが HTTP を知ることになります（第5部 第26章 3節）。

## 問題3 一覧のクエリを Zod で確かめる

```ts
const Schema = z.strictObject({
  date: z.string('1つだけ書いてください').refine(isDateString, 'YYYY-MM-DD の日付です'),
  room: z
    .string('1つだけ書いてください')
    .regex(/^[1-9]\d*$/, '1 以上の整数です')
    .transform(Number)
    .optional(),
});
```

- `z.coerce.number()` を使わなかったのは、`''` を 0 に、`'1.5'` を 1.5 に、`' 1'` を 1 に変えてしまうからです（第7部 第38章の `z.coerce` の落とし穴）。文字のまま正規表現で確かめてから `Number` にします。
- `?date=a&date=b` は、Express 5 の `req.query` では `['a', 'b']` になります（第5部 第23章）。`z.string()` が配列を断るので、別に書く必要はありません。
- 知らない名前は、`z.strictObject` が1つの issue（`code: 'unrecognized_keys'`、`keys: ['x', 'y']`）にまとめて返します。`parameter` を名前ごとに出すため、`flatMap` で1つずつに広げました。
- `room === undefined ? { date } : { date, room }` と分けたのは、`exactOptionalPropertyTypes` のような厳しい設定でも、`room: undefined` という項目を作らないためです。テストの `deepEqual` も、`{ date }` と `{ date, room: undefined }` を違うものとして比べます。

## 問題4 考えて答える

**(1) 道を書く順番**

Express は、書いた順に道と比べます。`/:id` が先にあると、`/mine` は `:id` に合い、`req.params.id` が `'mine'` になります。次の `IdParam.parse(req.params)` で、`'mine'` は `/^[1-9]\d{0,8}$/` に合わないので `ZodError` が投げられ、`problemHandler` が 422（`errors[].pointer` が `#/id`）を返します。自分の予約の一覧は、二度と返りません。テストの 10 番目が、これを見つけます。

**(2) 422 と 409**

|     | 答え | 理由                                                       |
| --- | ---- | ---------------------------------------------------------- |
| a   | 422  | 入力（始まり）を :00 か :30 に直せば通る。R1               |
| b   | 409  | 入力は正しい。ほかの予約（今の状態）があるので通らない。R6 |
| c   | 409  | 入力は正しい。会議室が今は停止している（状態）。R8         |
| d   | 422  | 入力（題名）を 100 文字以下に直せば通る。R5                |

c は、管理者が会議室を使えるように戻せば、同じ入力で通ります。それが「状態のせい」ということです。

**(3) 役割をセッションに覚えさせる**

管理者を外しても（`grant-admin --revoke`）、その人がログインしている間（セッションが続く間。既定は 7 日で、使うたびに延びる）は管理者のままになります。辞めた人や、間違えて管理者にした人を、すぐに止められません。セッションをデータベースに置いているので、その人のセッションを全部消す方法もありますが、「役割を変える」と「セッションを消す」の2つを忘れずにする必要があります。リクエストのたびに読めば、問い合わせが1回増える代わりに、変えた役割が次のリクエストからすぐに効きます。この規模なら、1回の問い合わせ（索引で1行）は気にしなくてよい重さです。

**(4) 取り消しの UPDATE の条件**

1. alice のリクエスト: `get` で読む（取り消していない）
2. 管理者のリクエスト: `get` で読む（取り消していない）
3. alice: UPDATE（`canceled_by` = alice）
4. 管理者: UPDATE（`canceled_by` = 管理者）

条件が無いと、4 の UPDATE も 1 行を変え、`canceled_at` と `canceled_by` が管理者のもので上書きされます。両方に 204 が返り、「管理者がほかの人の予約を取り消したら、予約した人にメールを送る」（第69章）なら、本人が取り消したのに「管理者が取り消しました」のメールが届きます。条件があれば 4 は 0 行になり、管理者には 409 が返ります。確かめた後に状態が変わっているかもしれないので、書くときにもう一度条件を付けます（第6部 第30章の楽観的な考え方）。

**(5) 本当の 11 件目**

1. タブ1: `countUpcomingOf` → 9（10 未満なので進む）
2. タブ2: `countUpcomingOf` → 9（タブ1はまだ INSERT していない）
3. タブ1: INSERT → 201（10 件）
4. タブ2: INSERT → 201（11 件）

別の会議室なので、EXCLUDE 制約も断りません。要件（第67章 `docs/requirements.md` の 5節）で「使いすぎを防ぐ目安。1件多く入っても困らない」と決めたので、困りません。困る題材なら、その人の行を `SELECT … FOR UPDATE` でロックしてから数える（第6部 第32章 6節）ことになります。

## 問題5 予約のデータの層を、メモリで作る

```ts
async insert(b) {
  const clash = active().some((x) => x.roomId === b.roomId && x.startsAt < b.endsAt && b.startsAt < x.endsAt);
  if (clash) throw new ConflictError('その時間は、ほかの予約と重なっています');
  // …
}
```

- 重なりの条件は、EXCLUDE 制約の `tstzrange(starts_at, ends_at) && …` と同じ「`[始まり, 終わり)` が重なる」です。`<=` にすると、10:00〜11:00 と 11:00〜12:00 が重なることになり、PostgreSQL と動きが変わります（テストの2つ目）。
- `get` などで中のオブジェクトをそのまま返すと、呼んだ側（サービスのテスト）が `b.title = '…'` と書き換えたとき、メモリの中まで変わります。PostgreSQL では起きないことなので、写しを返します。`{ ...b }` だけでは `Date` は同じものを指したままなので、`new Date(…)` で写しました（第11部の成果物で、契約テストが見つけた落とし穴と同じ）。
- これがあると、`createBookingService({ bookings: createMemoryBookingRepo(…), … })` で、PostgreSQL 無しにサービスの単体テストが書けます。本物と偽物が同じに動くことは、第11部 第57章の契約テスト（同じテストを両方に）で確かめるのが本当です。このテストは、本文の `repositories.test.ts` と同じことを確かめています。

## 問題6 役割を選べる `requireRole`

```ts
export function requireRole(...roles: Role[]): RequestHandler {
  if (roles.length === 0) throw new Error('requireRole には役割を1つ以上書いてください');
  const detail = `${roles.map((r) => ROLE_NAMES[r]).join('・')}だけが使えます`;
  return (req, _res, next) => {
    if (req.user === undefined) return next(new HttpProblem(401, 'ログインしてください'));
    if (!roles.includes(req.user.role)) return next(new HttpProblem(403, detail));
    next();
  };
}
```

- `roles` が空のときに、リクエストの時ではなく作るときに投げるのは、書き間違いを起動したときに見つけるためです。リクエストのときに 403 にすると、その道はだれも使えないのに、だれかが試すまで気づきません。
- `ROLE_NAMES` を `satisfies Record<Role, string>` にしたので、役割を足したとき（`'viewer'` など）に名前を書き忘れると、`tsc` が教えてくれます（第7部 第36章）。
- 本文のアプリで `requireAdmin()` を `requireRole('admin')` に置き換えても、文も同じなので、テストはそのまま通ります。役割が2つしかない今は、`requireAdmin` だけで十分です。3つ目の役割が要るまで、汎用にしない判断もあります。

## 問題7 予約の題名を変える API をアプリに足す

書き換えたファイルは [extend/](extend/) にあります。要点は4つです。

```ts
// サービス（src/services/bookings.ts）
async rename(actor: Actor, id: number, title: string): Promise<Booking> {
  const b = await bookings.get(id);
  if (b === null) throw new NotFoundError('予約がありません');
  if (b.userId !== actor.id) throw new ForbiddenError('自分の予約だけを変えられます');
  if (b.canceledAt !== null) throw new ConflictError('取り消した予約は変えられません');
  if (b.startsAt.getTime() <= now().getTime()) throw new ConflictError('始まった予約は変えられません');
  if (!(await bookings.updateTitle(id, title))) throw new ConflictError('取り消した予約は変えられません');
  return toBooking({ ...b, title }, actor);
},
```

- **確かめる順番**: 「無い」→「本人か」→「状態」の順です。本人でない人に「取り消し済みです」と返すと、ほかの人の予約の状態を教えてしまいます。だれかを先に確かめます（第10部 第55章の認可の漏れ）。
- **管理者も 403**: 取り消し（R9）は管理者もできますが、題名は「予約した人の言葉」なので本人だけにしました。これは要件の判断です。実際の開発なら、`docs/requirements.md` に R11 として書き足し、`docs/api.md` に PATCH の行を足します。
- **UPDATE の条件**: `WHERE id = $1 AND canceled_at IS NULL` で、確かめた後に取り消されたときは変えません（問題4の (4) と同じ）。
- **題名の決まりを共有**: `Title` を変数にして、`CreateBookingBody` と `UpdateBookingBody` の両方で使いました。片方だけ 200 文字に直す、という食い違いが起きません。`UpdateBookingBody` は `z.strictObject({ title: Title })` なので、`{}` も `{ roomId }` も 422 です。時刻や会議室を変えたいときは、取り消して入れ直してもらいます（変えられるようにすると、R1〜R8 を全部もう一度確かめる必要があります）。

## 問題8 会議室ごとの、その日の使われ方を SQL で数える

```sql
SELECT r.id AS room_id, r.name AS room_name,
       count(b.id)::int AS count,
       coalesce(sum(extract(epoch FROM b.ends_at - b.starts_at) / 60), 0)::int AS minutes
FROM rooms r
LEFT JOIN bookings b
  ON b.room_id = r.id AND b.canceled_at IS NULL AND b.starts_at < $2 AND b.ends_at > $1
WHERE r.active
GROUP BY r.id, r.name
ORDER BY r.id
```

- 予約の条件（取り消していない・その日）を `WHERE` に書くと、予約の無い会議室の行（`b` の列が全部 NULL）は `b.canceled_at IS NULL` は通っても `b.starts_at < $2` で消え、会議室B が出なくなります。`ON` に書くと、「合う予約が無ければ NULL の行をつなぐ」になり、会議室は残ります（第6部 第30章 2節）。会議室の条件（`r.active`）は `WHERE` で構いません。
- `count(*)` ではなく `count(b.id)` です。`count(*)` は NULL の行も1と数えるので、予約の無い会議室が 1 件になります。
- 予約の無い会議室では `sum` が NULL になるので `coalesce(…, 0)` にします。`::int` を付けないと、pg は `count` の `bigint` と計算した `numeric` を文字列（`'150'`）で返します（テストの3つ目）。
- 日付の範囲は、本文と同じ `dayRange(date)`（日本の 0:00 から次の日の 0:00 まで）です。`starts_at::date = $1` のように書くと、データベースのタイムゾーン（多くは UTC）の日付で比べるので、日本の 8:00〜9:00 の予約が前の日に数えられます（テストの2つ目）。
