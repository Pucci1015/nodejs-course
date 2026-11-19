# 第68章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part13/ch68-implementation-api/exercises/` で行います（問題7だけは `~/dev/room-booking`）。最初に `cd ~/dev/part13/ch68-implementation-api/exercises` で移動してください。

| 問題 | 種類 | テーマ                                        | 使うファイル                                                                                 | 本文の節 |
| ---- | ---- | --------------------------------------------- | -------------------------------------------------------------------------------------------- | -------- |
| 1    | 基本 | データの層の予約を、API の形にする            | [to-booking.ts](to-booking.ts)、[to-booking.test.ts](to-booking.test.ts)                     | 5.2      |
| 2    | 基本 | 取り消せない理由を、ステータスと文にする      | [cancel-problem.ts](cancel-problem.ts)、[cancel-problem.test.ts](cancel-problem.test.ts)     | 3.2・5.2 |
| 3    | 基本 | 一覧のクエリを Zod で確かめる                 | [day-query.ts](day-query.ts)、[day-query.test.ts](day-query.test.ts)                         | 3.1・6.2 |
| 4    | 基本 | 考えて答える                                  | [predict.md](predict.md)                                                                     | 2〜6     |
| 5    | 応用 | 予約のデータの層を、メモリで作る              | [memory-bookings.ts](memory-bookings.ts)、[memory-bookings.test.ts](memory-bookings.test.ts) | 4.2      |
| 6    | 応用 | 役割を選べる `requireRole`                    | [require-role.ts](require-role.ts)、[require-role.test.ts](require-role.test.ts)             | 2.3      |
| 7    | 発展 | 予約の題名を変える API をアプリに足す         | [app-tests/edit-title.test.ts](app-tests/edit-title.test.ts)                                 | 3〜7     |
| 8    | 発展 | 会議室ごとの、その日の使われ方を SQL で数える | [usage-report.ts](usage-report.ts)、[usage-report.test.ts](usage-report.test.ts)             | 4.2      |

**発展**（7・8）は、少し長めの問題です。できなくても次の章に進んでかまいません。

## テストの使い方

問題4・7以外は、ファイルを書いて、`node --test ○○.test.ts` ですべてのテストが通れば完成です。書く前に失敗するテストの数は、それぞれの問題に書いてあります。模範解答で試すには、`MODULE=../solutions/○○.ts` を付けます（例: `MODULE=../solutions/to-booking.ts node --test to-booking.test.ts`）。

- [domain/](domain/) は本文の `src/domain/` の `time.ts`・`booking-rules.ts` の、[errors.ts](errors.ts) は `src/errors.ts` のコピーです。問題の中で import して使います。書き換えなくてかまいません。
- [http-problem.ts](http-problem.ts) と [express-user.d.ts](express-user.d.ts) は、問題6で使う小さな部品です（本文の `problem.ts` の `HttpProblem` と、`express.d.ts` の `req.user` を小さくしたもの）。
- 問題8のテストは、`~/dev/room-booking` の compose の PostgreSQL（127.0.0.1:5434）を使います。テストごとに新しいスキーマを作り、終わったら消します（[pg-test.ts](pg-test.ts)）。
- [typecheck.ts](typecheck.ts) と [pg-test.ts](pg-test.ts) は、テストの部品です。どのテストも最後に、書いたファイルに `tsc` のエラーが無いことを確かめます。

---

## 基本

### 問題1 データの層の予約を、API の形にする

[to-booking.ts](to-booking.ts) に `toBooking(record, viewerId)` を書いてください（本文 5.2節）。

- `userId` と `canceledAt` は出さない
- 時刻は `toISOString()` の文字列（UTC の `…Z`）
- `mine` は、`viewerId` が予約した人なら `true`

```sh
$ node --test to-booking.test.ts       # 書く前は 2 個が失敗
```

ヒント: `{ ...record }` で広げてから要らないものを消すより、出す項目を1つずつ書くほうが安全です。なぜかは解答で説明します。

### 問題2 取り消せない理由を、ステータスと文にする

[cancel-problem.ts](cancel-problem.ts) に `cancelProblem(result)` を書いてください。`result` は第67章の `canCancel` の結果（`'ok' | 'forbidden' | 'started' | 'canceled'`）です。

| result        | 返すもの                                                        |
| ------------- | --------------------------------------------------------------- |
| `'ok'`        | `null`                                                          |
| `'forbidden'` | `{ status: 403, detail: '自分の予約だけを取り消せます' }`       |
| `'canceled'`  | `{ status: 409, detail: 'この予約は、もう取り消してあります' }` |
| `'started'`   | `{ status: 409, detail: '始まった予約は取り消せません' }`       |

```sh
$ node --test cancel-problem.test.ts   # 書く前は 3 個が失敗
```

ヒント: `switch` で4つの場合を全部書き、`default` は書かないでください（本文 5.2節）。

### 問題3 一覧のクエリを Zod で確かめる

本文の `GET /api/bookings?date=…` に、会議室で絞り込む `room` を足すとします。[day-query.ts](day-query.ts) に `parseDayQuery(query)` を書いてください（本文 3.1節・6.2節）。`query` は Express の `req.query` です。

- `date`: 必須。本当にある日付（`'YYYY-MM-DD'`）
- `room`: 任意。1 以上の整数の文字列（`'0'`・`'01'`・`'1.5'`・`'a'` はだめ）。確かめた後は `number`
- 同じ名前が2回（`?date=…&date=…`。`req.query` では配列になる）もだめ
- 知らない名前があれば、その名前を `parameter` にした issue（`detail` は `'○○ は知らない名前です'`）
- 合わないところは全部 `issues` で返す。合っていれば `{ ok: true, value }`

```sh
$ node --test day-query.test.ts        # 書く前は 4 個が失敗
```

ヒント: `z.strictObject` は知らない名前を、`code` が `'unrecognized_keys'` の issue（`keys` に名前の配列）で返します。`z.string()` は配列を断ります。

### 問題4 考えて答える

[predict.md](predict.md) の5つの問いに、本文とアプリのコードを読んで答えてください。道を書く順番、422 と 409、役割をセッションに覚えさせる書き方、取り消しの UPDATE の条件、同時の 11 件目、を考えます。

## 応用

### 問題5 予約のデータの層を、メモリで作る

[memory-bookings.ts](memory-bookings.ts) に、本文の `createPgBookingRepo` と同じ形（同じ関数・同じ動き）のものを、配列で書いてください（本文 4.2節）。サービスの単体テストで、PostgreSQL の代わりに使えます（第11部 第57章の偽物のリポジトリ）。

- `insert` の id は 1 から順。同じ会議室の、取り消していない予約と `[始まり, 終わり)` が重なれば `ConflictError`（接するだけならよい）
- `get`・`listBetween`・`listUpcomingOf` は、中のオブジェクトではなく写しを返す（返したものを書き換えても、中は変わらない）
- `listBetween` は始まりの順、同じなら会議室の順
- `cancel` は、無い・もう取り消してあれば `false`

```sh
$ node --test memory-bookings.test.ts  # 書く前は 6 個が失敗
```

ヒント: 重なりの条件は「`a.startsAt < b.endsAt` かつ `b.startsAt < a.endsAt`」です（第67章 5節の `&&`）。並べ替えは `toSorted`（第8部 第42章）で、元の配列を変えずに。

### 問題6 役割を選べる `requireRole`

本文 2.3節の `requireAdmin` は、管理者だけを通します。[require-role.ts](require-role.ts) に、通す役割を選べる `requireRole(...roles)` を書いてください。

- ログインしていない（`req.user` が無い）: `next(new HttpProblem(401, 'ログインしてください'))`
- 役割が `roles` に無い: 403。文は `ROLE_NAMES` の名前を `・` でつないで「だけが使えます」を付ける（`requireRole('admin')` なら `'管理者だけが使えます'`）
- `roles` が空: ミドルウェアを**作るとき**に `Error` を投げる

```sh
$ node --test require-role.test.ts     # 書く前は 5 個が失敗
```

テストは、小さな Express のアプリを `listen(0)` で起動して、HTTP で確かめます（第11部 第57章）。ヒント: `...roles` は残りの引数を配列で受け取る書き方です（第3部 第11章）。403 の文は、リクエストのたびではなく、作るときに1回だけ組み立てれば十分です。

## 発展

### 問題7 予約の題名を変える API をアプリに足す

「会議の名前を間違えたので直したい」という声が出たとします。`~/dev/room-booking` に、予約の題名を変える `PATCH /api/bookings/:id` を足してください。仕様は、テスト [app-tests/edit-title.test.ts](app-tests/edit-title.test.ts) に書いてあります。

| 場合                                                 | 応答                                                  |
| ---------------------------------------------------- | ----------------------------------------------------- |
| 本人が `{ "title": "…" }` を送る                     | 200。変えた後の予約（GET と同じ形）。前後の空白は取る |
| 本人でない（管理者も）                               | 403                                                   |
| 題名が空・101 文字以上・知らない項目がある・何も無い | 422                                                   |
| 取り消した予約・始まった予約                         | 409                                                   |
| 無い予約                                             | 404                                                   |
| ログインしていない・ほかのオリジン                   | 401・403                                              |

ブランチを作り、テストをアプリにコピーしてから始めます（第3章のブランチ）。

```sh
$ cd ~/dev/room-booking
$ git switch -c practice-edit-title
$ cp ~/dev/part13/ch68-implementation-api/exercises/app-tests/edit-title.test.ts test/http/
$ node --test test/http/edit-title.test.ts   # 書く前は 6 個のうち 5 個が失敗
```

本文の作る順番（1節）どおり、下の層から足していきます。

1. `src/domain/schemas.ts` に、ボディの形 `UpdateBookingBody`
2. `src/repositories/pg-bookings.ts` に、題名を変える関数
3. `src/services/bookings.ts` に、決まり（本人だけ・取り消したもの・始まったもの）を確かめる関数
4. `src/routes/bookings.ts` に、`router.patch('/:id', …)`

最後に `npm run check` が通ること（82 + 6 個）を確かめ、ブランチにコミットしてから `git switch main` で戻ってください。第69章は、題名を変えない `main` から続けます。

ヒント: 題名の決まり（1〜100 文字・前後の空白を取る）は、`CreateBookingBody` と同じです。同じものを2回書かずに、変数にして両方で使います。

### 問題8 会議室ごとの、その日の使われ方を SQL で数える

管理者が「どの会議室がどれだけ使われているか」を見たいとします。[usage-report.ts](usage-report.ts) に `usageReport(db, date)` を書いてください。

- 使える会議室（`active`）ごとに `{ roomId, roomName, count, minutes }`（予約の数と、予約した分の合計）
- 取り消した予約、ほかの日（日本の日付で数える）の予約は数えない
- 予約が1件も無い会議室も `count: 0, minutes: 0` で出す
- 会議室の id の順。SQL は1回だけ（会議室ごとに SELECT しない）。`count` と `minutes` は `number`

```sh
$ node --test usage-report.test.ts     # 書く前は 4 個が失敗
```

テストは、必要な列だけの `rooms` と `bookings` をテストのスキーマに作って確かめます。ヒント: 予約の無い会議室を残すには `LEFT JOIN` です。予約の条件を `ON` と `WHERE` のどちらに書くかで結果が変わります（第6部 第30章 2節）。時間の差の分は `extract(epoch FROM 終わり - 始まり) / 60`、pg が文字列で返す数は `::int` で整数にします（第6部 第32章 4節）。
