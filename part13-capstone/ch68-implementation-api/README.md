# 第68章 実装（前半）

第67章で決めた要件と設計を、API にします。管理者という役割を足し、会議室と予約の API を「データの層 → サービス → ルート」の順に作って、要件の決まり R1〜R10 を1つずつ HTTP のテストで確かめます。画面はまだ作りません（第69章）。この章を終えると、`docs/api.md` に書いた API が全部動き、テストが 82 個通ります。

| 項目           | 内容                                                                                                                                              |
| -------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- |
| 所要時間の目安 | 5〜7 時間（練習問題を除く）                                                                                                                       |
| 前提           | 第67章。第5部 第26章（3つの層）、第6部 第32章（pg のエラーコード）、第10部（ログインと `requireUser`）、第11部 第57章（HTTP のテスト）            |
| この章のゴール | 要件の決まりを、どの層で守るか決めて書ける。サービスの層のエラーを HTTP のステータスに読み替えられる。決まりを1つずつ HTTP のテストで確かめられる |

| フォルダ                 | 中身                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------ |
| [exercises/](exercises/) | 練習問題（8問）                                                                      |
| [solutions/](solutions/) | 練習問題の模範解答と、この章を終えたときのアプリ（[solutions/app/](solutions/app/)） |

> **読み方**
>
> 第67章で作った `~/dev/room-booking` に書き足していきます。最初に、PostgreSQL と Redis が動いていることを確かめてください。
>
> ```sh
> $ cd ~/dev/room-booking
> $ docker compose up -d --wait
> $ npm test                          # 第67章の終わりの 57 個が通ること
> ```
>
> 書くファイルが多い章です。各節の「手を動かす」で、まず自分で書いてみて、詰まったら [solutions/app/](solutions/app/) の同じファイルと見比べてください。どのファイルにも、先頭のコメントに「何のファイルか」と節の番号を書いてあります。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと                                                        | 後で使う場所                                   |
| ----------------------------------------------------------------------- | ---------------------------------------------- |
| 役割（member・admin）と `requireAdmin`                                  | 第69章の管理者のページ、自分で作るアプリの権限 |
| サービスの層のエラー（`ForbiddenError`・`ValidationError` の `issues`） | 第69章の画面（422 を項目の横に出す）           |
| 決まりを守る場所（制約・サービス・ルート）の分け方                      | 自分で作るアプリの設計                         |
| HTTP のテストで要件を1つずつ確かめる                                    | 第69章の画面のテスト・E2E、第70章の振り返り    |

---

## 1. 作る順番

第67章 7.2節の `docs/plan.md` では、この章を次の順番で作ると決めました。下の層から作ると、上の層を作るときに、下の層はもうテストで確かめてあります。

| 順  | 作るもの                             | ファイル                                                                            | 節  |
| --- | ------------------------------------ | ----------------------------------------------------------------------------------- | --- |
| 1   | 役割の列と、管理者を決めるスクリプト | `migrations/003_roles.sql`・`scripts/grant-admin.ts`・`middleware/require-admin.ts` | 2   |
| 2   | 入力の形とエラー                     | `domain/schemas.ts`・`errors.ts`・`middleware/domain-errors.ts`                     | 3   |
| 3   | データの層                           | `repositories/pg-rooms.ts`・`pg-bookings.ts`・`test/db/repositories.test.ts`        | 4   |
| 4   | サービス                             | `services/rooms.ts`・`services/bookings.ts`                                         | 5   |
| 5   | ルートとつなぎ込み                   | `routes/rooms.ts`・`routes/bookings.ts`・`app.ts`・`server.ts`                      | 6   |
| 6   | HTTP のテスト                        | `test/http/rooms.test.ts`・`bookings.test.ts`                                       | 7   |

決まりをどこで守るかは、第67章の `docs/data.md` で決めてあります。この章では、それをコードにします。

| 決まり                                                 | 守る場所                                               | 理由                                                      |
| ------------------------------------------------------ | ------------------------------------------------------ | --------------------------------------------------------- |
| 形（型・文字数・知らない項目）                         | ルート（Zod のスキーマ）                               | HTTP の入力の問題。サービスは、形の正しい値だけを受け取る |
| R1〜R4（時刻の区切り・営業時間・長さ・過去と 60 日先） | サービス（`checkBookingTime`）                         | 「今」によって変わる。第67章の純粋な関数を呼ぶ            |
| R6（重ならない）                                       | データベース（EXCLUDE 制約）                           | 同時の予約で「確かめてから入れる」が壊れる（第67章 5節）  |
| R7（1人 10 件まで）                                    | サービス（数える）                                     | 1件多く入っても困らない（第67章 練習問題4）               |
| R8（停止した会議室）                                   | サービス                                               | 会議室を読んでから決める                                  |
| R9（取り消せる人・時）                                 | サービス（`canCancel`）                                | 本人か管理者か、で変わる                                  |
| 管理者だけの操作                                       | ルート（`requireAdmin`）                               | 道ごとに決まる                                            |
| R10（会議室の名前が重ならない・定員）                  | データベース（一意の索引 `rooms_name`）とルート（Zod） | 名前の重なりは同時の書き込みで壊れる。定員は形の問題      |

## 2. 管理者という役割

会議室を足したり止めたりできるのは、管理者だけです（要件 2節）。ユーザーの表に `role` の列を足します。

### 2.1 手を動かす: 役割の列を足す

`migrations/003_roles.sql` を作ります。

```sql
-- ユーザーの役割（第68章 1節）。今いる人は全員 member になる。管理者は scripts/grant-admin.ts で決める
ALTER TABLE users
  ADD COLUMN role text NOT NULL DEFAULT 'member' CONSTRAINT users_role_check CHECK (role IN ('member', 'admin'));
```

| 書き方                          | 意味                                                                                              |
| ------------------------------- | ------------------------------------------------------------------------------------------------- |
| `ADD COLUMN … DEFAULT 'member'` | 今ある行にも `'member'` が入る。`NOT NULL` の列を足すには、既定の値が要る                         |
| `CHECK (role IN (…))`           | 決めた2つの値しか入らない。TypeScript の `'member' \| 'admin'` と同じものを、データベースにも書く |

次に、`src/repositories/pg-users.ts` の `User` に `role` を足し、`setRole` を書きます。

```ts
export type Role = 'member' | 'admin';
// …
const toUser = (row: UserRow): User => ({
  // …
  // CHECK 制約で 'member' か 'admin' しか入らないが、型は text なので、知らない値は member にしておく
  role: row.role === 'admin' ? 'admin' : 'member',
});
// …
    /** 役割を変える（scripts/grant-admin.ts が使う）。その人がいなければ false */
    async setRole(email: string, role: Role): Promise<boolean> {
      const { rowCount } = await db.query('UPDATE users SET role = $2 WHERE email = $1', [email, role]);
      return rowCount === 1;
    },
```

`row.role as Role` と書かずに比べたのは、`as` は何も確かめないからです（第7部 第38章）。知らない値が来ても、権限の強いほう（admin）には倒れません。

続けて、ログインしている人（`req.user`）にも役割を入れます。

| ファイル                          | 変えるところ                                                         |
| --------------------------------- | -------------------------------------------------------------------- |
| `src/express.d.ts`                | `user?: { id: number; email: string \| null; role: Role }`           |
| `src/middleware/require-user.ts`  | `req.user = { id: user.id, email: user.email, role: user.role }`     |
| `src/routes/auth.ts` の `GET /me` | `{ id, email, role }` を返す（第69章で、画面がメニューを出し分ける） |

### 2.2 手を動かす: 管理者を決めるスクリプト

管理者を画面から決められると、「管理者を決める管理者」が要ります。この版では、サーバで動かすスクリプトにしました。`scripts/grant-admin.ts` を書き、`package.json` の `scripts` に `"grant-admin": "node --env-file-if-exists=.env scripts/grant-admin.ts"` を足します。

```ts
import { parseArgs } from 'node:util';
// …
const { positionals, values } = parseArgs({
  allowPositionals: true,
  options: { revoke: { type: 'boolean', default: false } },
});
const email = positionals[0]?.trim().toLowerCase();
if (email === undefined || positionals.length !== 1) {
  console.error('使い方: npm run grant-admin -- メールアドレス [--revoke]');
  process.exit(2);
}
// …設定を読み、プールを作り、migrate してから setRole。いなければ終了コード 1
```

全体は [solutions/app/scripts/grant-admin.ts](solutions/app/scripts/grant-admin.ts) にあります。`parseArgs`・終了コード 2（使い方の間違い）は第3部 第16章の書き方です。まだだれも登録していないので、「いない」と言われます。

```sh
$ npm run grant-admin -- alice@example.com
…
alice@example.com のユーザーはいません（先に画面から登録してください）
$ echo $?
1
```

| 部分                          | 意味                                                    |
| ----------------------------- | ------------------------------------------------------- |
| `npm run grant-admin -- 引数` | `--` の後ろを、スクリプトにそのまま渡す（第3部 第14章） |
| `echo $?`                     | 直前のコマンドの終了ステータスを表示する（第1章）       |

第69章で画面から登録した後に、もう一度動かします。

### 2.3 手を動かす: 管理者だけを通すミドルウェア

`src/middleware/require-admin.ts` を作ります。

```ts
// 管理者だけを通す（第68章 1節）。requireUser の後ろに置く（req.user が入っている前提）
// 画面でボタンを隠すのは使いやすさのため。守っているのは、ここ（API）
import type { RequestHandler } from 'express';
import { HttpProblem } from './problem.ts';

export function requireAdmin(): RequestHandler {
  return (req, _res, next) => {
    if (req.user === undefined) return next(new HttpProblem(401, { detail: 'ログインしてください' }));
    if (req.user.role !== 'admin') return next(new HttpProblem(403, { detail: '管理者だけが使えます' }));
    next();
  };
}
```

| ステータス | 意味                                                          |
| ---------- | ------------------------------------------------------------- |
| 401        | だれか分からない（ログインしていない）                        |
| 403        | だれかは分かったが、その人には許されていない（第10部 第51章） |

役割は `requireUser` が毎回データベースから読みます。セッションに役割を覚えさせると、管理者を外しても、ログインし直すまで管理者のままになるからです。

## 3. 入力の形とエラー

### 3.1 手を動かす: 入力の形を Zod で書く

`src/domain/schemas.ts` に、`docs/api.md` の入力を Zod で書きます（第7部 第38章）。いちばん大事なのは、予約の時刻です。

```ts
/** 時差の付いた ISO 8601（'2026-12-10T10:00:00+09:00' か '…Z'）。Date にして返す */
const Instant = z.iso
  .datetime({ offset: true, error: '時差の付いた日時（ISO 8601）です' })
  .transform((s) => new Date(s));

export const CreateBookingBody = z.strictObject({
  roomId: z.int().positive(),
  title: z.string().trim().min(1, '題名を入れてください').max(RULES.titleMax, `題名は ${RULES.titleMax} 文字までです`),
  startsAt: Instant,
  endsAt: Instant,
});
```

| 書き方                             | 意味                                                                                                      |
| ---------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `z.iso.datetime({ offset: true })` | `Z` か `+09:00` の付いた日時だけ。`'2026-12-10T10:00:00'`（時差なし）は、どこの 10 時か分からないので断る |
| `.transform((s) => new Date(s))`   | 確かめた後で `Date` にする。サービスは `Date` を受け取る                                                  |
| `z.strictObject`                   | 知らない項目（`userId` など）があれば断る。だれの予約かは、ボディではなくログインから決める               |
| `RULES.titleMax`                   | 第67章の `booking-rules.ts` の数を使う。100 をあちこちに書かない                                          |

会議室の `CreateRoomBody`・`UpdateRoomBody`（変えるものだけ。何も無ければ 422）、クエリの `DateQuery`、パスの `IdParam`（`'012'` や 10 桁は断る）も同じファイルに書きます。全体は [solutions/app/src/domain/schemas.ts](solutions/app/src/domain/schemas.ts) です。`test/unit/schemas.test.ts` も足して、動かします。

```sh
$ node --test test/unit/schemas.test.ts
✔ CreateBookingBody: 題名は前後の空白を除き、時刻は Date にする
✔ CreateBookingBody: 時差の無い日時・知らない項目・文字の roomId はだめ
✔ CreateRoomBody・UpdateRoomBody
✔ DateQuery・IdParam
ℹ tests 4
ℹ pass 4
ℹ fail 0
```

### 3.2 手を動かす: サービスの層のエラーを足す

土台の `src/errors.ts` には、`NotFoundError`・`ConflictError`・`ValidationError` がありました（第5部 第26章 3節）。予約には2つ足りません。

- 「本人でも管理者でもない」を表す `ForbiddenError`
- 「時刻の決まりに合わないところが、いくつもある」を表す、`ValidationError` の `issues`

```ts
/** その人には許されていない（本人でも管理者でもない、など） */
export class ForbiddenError extends Error {
  name = 'ForbiddenError';
}

/** 決まりに合わないところ（field は入力の名前） */
export type Issue = { field?: string | undefined; message: string };

export class ValidationError extends Error {
  name = 'ValidationError';
  /** 合わないところ。1つ以上 */
  readonly issues: Issue[];

  /** 1つなら (message, field)。いくつもあれば (message, undefined, issues) */
  constructor(message: string, field?: string, issues?: Issue[]) {
    super(message);
    this.issues = issues ?? [{ field, message }];
  }
}
```

`src/middleware/domain-errors.ts` で、HTTP のステータスに読み替えます。サービスは HTTP を知りません。

```ts
if (err instanceof ForbiddenError) return next(new HttpProblem(403, { detail: err.message }));
// …
if (err instanceof ValidationError) {
  const errors = err.issues.map((i) => ({
    ...(i.field ? { pointer: `#/${i.field}` } : {}),
    detail: i.message,
  }));
  return next(new HttpProblem(422, { errors }));
}
```

| サービスのエラー  | ステータス | 例                                                  |
| ----------------- | ---------- | --------------------------------------------------- |
| `NotFoundError`   | 404        | 無い会議室・無い予約                                |
| `ForbiddenError`  | 403        | ほかの人の予約を取り消す                            |
| `ConflictError`   | 409        | 重なる・10 件を超える・停止した会議室・取り消し済み |
| `ValidationError` | 422        | 時刻の決まり（R1〜R4）                              |

422 と 409 の分け方は「入力を直せば通るか」です。:15 に始まる予約は、入力を :00 に直せば通ります（422）。重なる予約は、入力は正しく、今の状態（ほかの予約）のせいで断られます（409）。

## 4. データの層

### 4.1 手を動かす: 会議室のリポジトリ

`src/repositories/pg-rooms.ts` は、第6部 第32章の書き方そのままです。新しいのは、変える項目を選べる `update` だけです。

```ts
// 列の名前は、決めた表から選ぶ（利用者の文字を SQL に入れない。第31章 3節）
const COLUMNS = { name: 'name', capacity: 'capacity', active: 'active' } satisfies Record<keyof RoomFields, string>;
// …
    async update(id: number, fields: Partial<RoomFields>): Promise<Room | null> {
      const sets: string[] = [];
      const values: unknown[] = [id];
      for (const key of ['name', 'capacity', 'active'] as const) {
        if (fields[key] === undefined) continue;
        values.push(fields[key]);
        sets.push(`${COLUMNS[key]} = $${values.length}`);
      }
      // …`UPDATE rooms SET ${sets.join(', ')} WHERE id = $1 RETURNING *`
```

名前の一意（`rooms_name`）の違反 `23505` は、`ConflictError('同じ名前の会議室があります')` に読み替えます。

### 4.2 手を動かす: 予約のリポジトリ

`src/repositories/pg-bookings.ts` を書きます。データの層の予約（`BookingRecord`）には、だれの予約か（`userId`）を持たせます。API には出しませんが、サービスが「本人か」を決めるのに使います。

```ts
// 会議室の名前も一緒に読む（自分の予約の一覧で、会議室の名前を出すため）
const SELECT = `
  SELECT b.id, b.room_id, r.name AS room_name, b.user_id, b.title, b.starts_at, b.ends_at, b.canceled_at
  FROM bookings b JOIN rooms r ON r.id = b.room_id`;
```

| 関数                           | SQL の条件                                                          | 使う所              |
| ------------------------------ | ------------------------------------------------------------------- | ------------------- |
| `get(id)`                      | `b.id = $1`                                                         | 1つの予約・取り消し |
| `listBetween(from, to)`        | 取り消していない、`starts_at < $2 AND ends_at > $1`（範囲に重なる） | その日の予約        |
| `listUpcomingOf(userId, now)`  | その人の、取り消していない、`ends_at > $2`（まだ終わっていない）    | 自分の予約          |
| `countUpcomingOf(userId, now)` | 同じ条件で `count(*)::int`                                          | R7                  |
| `insert(b)`                    | `RETURNING id`。`23P01` は `ConflictError` に                       | 予約する            |
| `cancel(id, by)`               | `WHERE id = $1 AND canceled_at IS NULL`                             | 取り消す            |

`insert` で、EXCLUDE 制約の違反を読み替えます。

```ts
      } catch (err) {
        if (isCode(err, '23P01')) throw new ConflictError('その時間は、ほかの予約と重なっています');
        throw err;
      }
```

`cancel` の `AND canceled_at IS NULL` は、2人が同時に取り消したときのためです。後から来たほうの UPDATE は0行になり、`false` が返ります。サービスはそれを見て 409 にします（第6部 第32章 6節の `n = n + 1` と同じ考え方）。

### 4.3 手を動かす: 本物の PostgreSQL で確かめる

`test/db/repositories.test.ts` を足します。第67章の制約のテストと同じ `test/support/test-db.ts`（テストごとのスキーマ）を使います。

```sh
$ npm run test:db
…
✔ insert と get。会議室の名前も読む
✔ 重なれば ConflictError（23P01 を読み替える）
✔ listBetween: 範囲に重なるものだけ（端に接するだけのものは入らない）
✔ countUpcomingOf・listUpcomingOf: 終わったもの・取り消したものは数えない
ℹ tests 10
ℹ pass 10
ℹ fail 0
```

`package.json` の `scripts` に `"test:db": "node --test \"test/db/*.test.ts\""` を足しておきます（10 個は、第67章の制約の 6 個と、この 4 個です）。

## 5. サービス

### 5.1 手を動かす: 会議室のサービス

`src/services/rooms.ts` は短くなります。だれが使えるか（管理者だけ）は、ルートの `requireAdmin` が決めるので、サービスは「無ければ `NotFoundError`」だけです。

```ts
    async update(id: number, fields: Partial<RoomFields>): Promise<Room> {
      const room = await repo.update(id, fields);
      if (room === null) throw new NotFoundError('会議室がありません');
      return room;
    },
```

### 5.2 手を動かす: 予約のサービス

`src/services/bookings.ts` が、この章の中心です。だれが（`actor`）・何を・いつ（`now`）を受け取り、要件の決まりを順に確かめます。

```ts
    async create(actor: Actor, input: { roomId: number; title: string; startsAt: Date; endsAt: Date }) {
      const at = now();
      // R1〜R4: 時刻の決まり（合わないところを全部返す）
      const issues = checkBookingTime(input.startsAt, input.endsAt, at);
      if (issues.length > 0) throw new ValidationError('予約の時刻が決まりに合いません', undefined, issues);
      // R8: 会議室があって、使えるか
      const room = await rooms.get(input.roomId);
      if (room === null) throw new NotFoundError('会議室がありません');
      if (!room.active) throw new ConflictError('この会議室は、今は使えません');
      // R7: 1人 10 件まで（同時に2件入れると 11 件になりうる。要件で許した。docs/data.md）
      if ((await bookings.countUpcomingOf(actor.id, at)) >= RULES.maxUpcomingPerUser)
        throw new ConflictError(`これからの予約は ${RULES.maxUpcomingPerUser} 件までです`);
      // R6: 重なりは、データベースの制約が断る（リポジトリが ConflictError にする）
      const id = await bookings.insert({ ...input, userId: actor.id });
      // …作った予約を返す
    },
```

| 書き方                                              | 理由                                                 |
| --------------------------------------------------- | ---------------------------------------------------- |
| `now` を引数（既定は `() => new Date()`）で受け取る | テストで「今」を決められる（第11部 第56章）          |
| `const at = now()` を1回だけ                        | R1〜R4 と R7 で、同じ「今」を使う                    |
| R1〜R4 を先に                                       | データベースに聞く前に、入力だけで分かる間違いを返す |
| 重なり（R6）は確かめない                            | 確かめても同時の予約で壊れる。制約に任せる           |

API が返す予約（`Booking`）は、データの層の `BookingRecord` から作り直します。`userId` の代わりに `mine`（自分の予約か）を出し、日時は `toISOString()` の文字にします。

```ts
const toBooking = (b: BookingRecord, actor: Actor): Booking => ({
  id: b.id,
  roomId: b.roomId,
  roomName: b.roomName,
  title: b.title,
  startsAt: b.startsAt.toISOString(),
  endsAt: b.endsAt.toISOString(),
  mine: b.userId === actor.id,
});
```

取り消し（R9）は、第67章の `canCancel` の結果で分けます。

```ts
switch (canCancel(b, actor, now())) {
  case 'forbidden':
    throw new ForbiddenError('自分の予約だけを取り消せます');
  case 'canceled':
    throw new ConflictError('この予約は、もう取り消してあります');
  case 'started':
    throw new ConflictError('始まった予約は取り消せません');
  case 'ok':
    break;
}
// 確かめてから取り消すまでの間に、ほかの人が取り消していたら false
if (!(await bookings.cancel(id, actor.id))) throw new ConflictError('この予約は、もう取り消してあります');
```

4つの場合を全部書いておくと、読む人に「ほかの場合は無い」と分かります。`canCancel` に新しい結果が増えたときに `tsc` に気づかせるには、値を返す関数にして `default` を書かない形にします（練習問題2）。

## 6. ルートとつなぎ込み

### 6.1 手を動かす: 会議室のルート

`src/routes/rooms.ts` です。作る・変えるは、`requireAdmin` を道に付けます。

```ts
router.post('/', adminOnly, async (req, res) => {
  const room = await rooms.create(CreateRoomBody.parse(req.body));
  res.status(201).location(`/api/rooms/${room.id}`).json(room);
});
```

`CreateRoomBody.parse` が投げる `ZodError` は、土台の `problemHandler` が 422 と `errors[].pointer` にします（第5部 第25章）。一覧の `?all=1`（停止した会議室も見る）は管理者だけなので、道の中で 403 にします。

### 6.2 手を動かす: 予約のルート

`src/routes/bookings.ts` です。

```ts
// /mine は /:id より前に書く（後ろだと、'mine' が :id として読まれる）
router.get('/mine', async (req, res) => {
  res.json({ items: await bookings.listMine(actorOf(req)) });
});

router.get('/:id', async (req, res) => {
  const { id } = IdParam.parse(req.params);
  res.json(await bookings.get(actorOf(req), id));
});
```

| 道                                  | 応答                                                                      |
| ----------------------------------- | ------------------------------------------------------------------------- |
| `GET /api/bookings?date=YYYY-MM-DD` | その日の予約。`?date=` が無い・正しくなければ 400（`errors[].parameter`） |
| `GET /api/bookings/mine`            | 自分の、これからの予約                                                    |
| `GET /api/bookings/:id`             | 1つの予約。取り消したものは 404                                           |
| `POST /api/bookings`                | 201 + `Location`                                                          |
| `DELETE /api/bookings/:id`          | 204                                                                       |

`?date=` の間違いを 422 ではなく 400 にしたのは、ボディではなくクエリ（URL）の間違いだからです（第5部 第25章 4節）。

### 6.3 手を動かす: アプリにつなぐ

`src/app.ts` の「9.」のコメント（土台に書いておいた場所）に、2つのルートを足します。

```ts
// 9. ここから下は、ログインしている人だけ（req.user が入る）
const loggedIn = requireUser(users);
app.use('/api/rooms', loggedIn, createRoomsRouter({ rooms }));
app.use('/api/bookings', loggedIn, createBookingsRouter({ bookings }));
```

`AppDeps` に `rooms: RoomService` と `bookings: BookingService` を足し、`src/server.ts` でリポジトリとサービスを作って渡します。

```ts
// 会議室と予約（第68章）
const roomRepo = createPgRoomRepo(pool);
const rooms = createRoomService(roomRepo);
const bookings = createBookingService({
  bookings: createPgBookingRepo(pool),
  rooms: roomRepo,
});
```

POST・DELETE のほかのオリジンからのリクエストは、土台の `requireSameOrigin`（第10部 第52章）が、ルートより前で 403 にします。ここで書き足すものはありません。

```sh
$ npx tsc                           # 型のエラーが無いこと
```

## 7. HTTP のテストで決まりを確かめる

### 7.1 手を動かす: テストの部品を足す

管理者を作るには、`grant-admin` と同じことをテストの中でします。`test/support/helpers.ts` に2つ足します。

```ts
/** そのサーバのスキーマで SQL を動かす（テストの準備: 管理者にする・過去の予約を入れる、など） */
export async function sqlIn(server: Server, sql: string, params: unknown[] = []) {
  // …サーバと同じスキーマに search_path を決めてから query
}

/** 登録してログインし、管理者にして、Cookie を返す（役割は requireUser が毎回データベースから読むので、すぐ効く） */
export async function signUpAdmin(server: Server, email = newEmail('admin')): Promise<string> {
  const { cookie } = await signUp(server.base, email, { remember: false });
  await sqlIn(server, "UPDATE users SET role = 'admin' WHERE email = $1", [email]);
  return cookie;
}
```

「始まった予約」は API では作れないので（R4 で断られる）、これも `sqlIn` で入れます。テストの準備に、API の決まりを通らない近道を使うのはよくあることです。ただし、確かめたいこと（取り消せないか）は API で確かめます。

### 7.2 手を動かす: 決まりを1つずつテストにする

`test/http/rooms.test.ts`（6 個）と `test/http/bookings.test.ts`（11 個）を書きます。テストの名前に、要件の決まりの番号を入れておくと、`docs/requirements.md` と見比べて、抜けている決まりが分かります。

```sh
$ node --test test/http/rooms.test.ts test/http/bookings.test.ts
✔ 1. 予約できる（201 + Location）。ほかの人の一覧にも出るが、だれの予約かは出さない
✔ 2. R1〜R4: 時刻の決まりに合わなければ 422。合わないところを全部、pointer で返す
✔ 3. R5 と形: 題名・知らない項目・時差の無い日時は 422。無い会議室は 404
✔ 4. R6: 同じ会議室で重なれば 409。接するだけ・ほかの会議室ならよい
✔ 5. R6: 5人が同時に同じ枠を予約しても、入るのは1人だけ
✔ 6. R7: これからの予約は 10 件まで。取り消せば、また入れられる
✔ 7. R8: 停止した会議室は予約できない（409）
✔ 8. R9: 取り消せるのは本人か管理者。取り消したものと、始まったものは 409
✔ 9. ?date が無い・正しくなければ 400（errors[].parameter）
✔ 10. /mine: 自分の、これからの予約だけ（早い順・取り消したものは出ない）
✔ 11. ログインしていなければ 401。ほかのオリジンからの予約は 403
✔ 1. 管理者は会議室を作れる（201 + Location）。名前は前後の空白を除く
✔ 2. メンバーは会議室を見るだけ。作る・変える・?all=1 は 403
✔ 3. ログインしていなければ 401。知らないクエリは 400
✔ 4. 入力の間違いは 422（pointer）。名前が重なれば 409
✔ 5. 管理者は、名前・定員・使えるかを変えられる。停止した会議室は、メンバーの一覧に出ない
✔ 6. 一覧は名前の順
ℹ tests 17
ℹ pass 17
ℹ fail 0
```

第67章で「EXCLUDE 制約なら、同時の予約でも1人だけ」と言ったことを、5番目のテストが HTTP で確かめています。

```ts
test('5. R6: 5人が同時に同じ枠を予約しても、入るのは1人だけ', async () => {
  const people = await Promise.all(
    [1, 2, 3, 4, 5].map(async (i) => (await h.signUp(server.base, h.newEmail(`p${i}`), { remember: false })).cookie),
  );
  const results = await Promise.all(
    people.map((c) =>
      book(c, {
        roomId: roomA,
        title: '取り合い',
        startsAt: at(3, '15:00'),
        endsAt: at(3, '16:00'),
      }),
    ),
  );
  assert.deepEqual(results.map((r) => r.status).sort(), [201, 409, 409, 409, 409]);
});
```

`Promise.all` で5つのリクエストを同時に送ります（第3部 第12章）。どれが 201 になるかは毎回違うので、`sort()` してから比べます。全体は [solutions/app/test/http/bookings.test.ts](solutions/app/test/http/bookings.test.ts) にあります。

テストの日付は、`tokyoParts(new Date())` から作った「今日から n 日後」です。決まった日付（`2026-12-10`）を書くと、その日を過ぎたとき R4（過去）で失敗するからです。

## 8. 確かめて、コミットする

### 8.1 手を動かす: 全部を通してコミットする

```sh
$ npm run check
…
ℹ tests 82
ℹ pass 82
ℹ fail 0
$ git add -A
$ git commit -m "第68章 実装（前半）役割・会議室と予約の API"
```

| 数  | 内訳                                       |
| --- | ------------------------------------------ |
| 57  | 第67章まで                                 |
| 4   | 入力の形（`schemas.test.ts`）              |
| 4   | 予約のリポジトリ（`repositories.test.ts`） |
| 17  | 会議室と予約の HTTP のテスト               |

画面（`web/`）は、この章では変えていません。`docs/api.md` の予約の形には、`roomName` を足しました（自分の予約の一覧で、停止した会議室の名前も出すため）。設計の文書は、作りながら直してかまいません。直したら、なぜ直したかを1行書いておきます。

[solutions/app/](solutions/app/) と比べて、テストの名前に要件の番号（R1〜R9）が全部出てくるか、R10（会議室）を `rooms.test.ts` の 4 番目が確かめているかを確かめてください。

## まとめ

- 下の層（データ → サービス → ルート）から作り、各層をテストで確かめてから上に進む
- 決まりは、守るのにふさわしい場所に置く。形はルート（Zod）、「今」で変わる決まりはサービス、同時の書き込みで壊れる決まりはデータベースの制約
- 役割は列と CHECK 制約で持ち、リクエストのたびにデータベースから読む。管理者を決める操作はスクリプトにした
- サービスは HTTP を知らない。`ForbiddenError`・`ConflictError`・`ValidationError` を、1か所（`domain-errors.ts`）でステータスに読み替える
- 422 は「入力を直せば通る」、409 は「今の状態のせいで通らない」
- API に出す形（`mine`）と、データの層の形（`userId`）を分ける
- 要件の番号をテストの名前に入れ、決まりを1つずつ HTTP で確かめる。同時の予約は `Promise.all` で確かめる

## 練習問題

[exercises/README.md](exercises/README.md) に8問あります（基本4・応用2・発展2）。

## 参考資料

- PostgreSQL 公式ドキュメント「Appendix A. PostgreSQL Error Codes」（`23P01` exclusion_violation、`23505`）: https://www.postgresql.org/docs/current/errcodes-appendix.html
- RFC 9110「HTTP Semantics」15.5.4 403 Forbidden・15.5.10 409 Conflict: https://www.rfc-editor.org/rfc/rfc9110
- RFC 9457「Problem Details for HTTP APIs」: https://www.rfc-editor.org/rfc/rfc9457
- Zod 公式ドキュメント（`z.iso.datetime`・`z.strictObject`）: https://zod.dev/api
- Express 公式ドキュメント「Routing」（道を書く順番）: https://expressjs.com/en/guide/routing.html

---

前: [第67章 要件と設計](../ch67-requirements-design/README.md) ／ 次: [第69章 実装（後半）](../ch69-implementation-web/README.md)
