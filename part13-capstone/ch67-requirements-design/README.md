# 第67章 要件と設計

この部では、会議室の予約のアプリを、実際の開発と同じ順番（要件定義 → 設計 → 実装 → テスト → 公開）で、小さく作ります。この章は、その最初の2つです。「何を作るか」「どう作るか」を、コードを書く前に文書（`docs/`）にし、いちばん大事な決まりを、データベースの制約と純粋な関数にします。ここで決めたことが、第68〜70章の全部の土台になります。

| 項目           | 内容                                                                                                                     |
| -------------- | ------------------------------------------------------------------------------------------------------------------------ |
| 所要時間の目安 | 4〜6 時間（練習問題を除く）                                                                                              |
| 前提           | 第12部まで（特に第6部 第30章のトランザクション、第11部 第56章のテストの考え方）                                          |
| この章のゴール | 要件・画面・API・データの設計を文書にできる。重なる予約を EXCLUDE 制約で断れる。時刻の決まりを純粋な関数とテストにできる |

| フォルダ                 | 中身                                                                                 |
| ------------------------ | ------------------------------------------------------------------------------------ |
| [exercises/](exercises/) | 練習問題（8問）                                                                      |
| [solutions/](solutions/) | 練習問題の模範解答と、この章を終えたときのアプリ（[solutions/app/](solutions/app/)） |

> **読み方**
>
> この部では、1つのアプリ `~/dev/room-booking` を、4つの章で育てます。この章の2節で、土台をコピーして作ります。練習問題は、部のコピー `~/dev/part13` の中で解きます。
>
> 第13部を始めるときに1回だけ、部のフォルダを `~/dev/part13` にコピーし、練習問題で使うパッケージを入れます（`bash ` まで打ってから、Finder から教材のフォルダの `part13-capstone/setup-part13.sh` をターミナルにドラッグし、`Return`）。
>
> ```sh
> $ bash （Finder から setup-part13.sh をドラッグ）
> 作りました: /Users/alice/dev/part13
> ```
>
> 2回目は打たないでください（作成先があれば何もしません）。
>
> この部の本文は、ほかの部より「書くもの」が大きくなります。各節の「手を動かす」で、まず自分で書いてみて、詰まったら [solutions/app/](solutions/app/) の同じファイルを開いて見比べてください。全部を写すより、「なぜこう書いたか」を説明できるほうが大事です。

## この章で学ぶことを、後でどこで使うか

| この章で学ぶこと                                     | 後で使う場所                                                       |
| ---------------------------------------------------- | ------------------------------------------------------------------ |
| 要件定義（ユーザーストーリー・決まり・作らないもの） | 第68〜69章の実装とテストの基準、第70章の振り返り、自分で作るアプリ |
| 画面・API・データの設計                              | 第68章（API）、第69章（画面）                                      |
| EXCLUDE 制約                                         | 第68章の「2人が同時に予約しても1人だけ」                           |
| 時刻の決まりを純粋な関数にする                       | 第68章のサービス、第69章の画面（同じ関数をコピーして使う）         |
| ADR（設計の決定の記録）                              | 第70章の振り返り、自分で作るアプリ                                 |

---

## 1. この部の進め方

実際の開発は、たいてい次の順番で進みます。この部の4つの章は、それぞれ次の段階にあたります。

| 段階           | すること                                                        | この部の章                 | できるもの                                                   |
| -------------- | --------------------------------------------------------------- | -------------------------- | ------------------------------------------------------------ |
| 要件定義       | だれが、何のために、何をしたいか。守る決まり。作らないもの      | 第67章                     | `docs/requirements.md`                                       |
| 設計           | 画面・API・データの形。技術の選び方                             | 第67章                     | `docs/screens.md`・`api.md`・`data.md`・`adr/`               |
| 実装           | 決まり → データベース → API → 画面 の順に、小さく作ってはテスト | 第67〜69章                 | `src/`・`web/`・`migrations/`                                |
| テスト         | 決まりを全部、自動のテストで確かめる                            | 第67〜69章（実装と一緒に） | `test/`・`web/test/`・`e2e/`                                 |
| 公開と振り返り | イメージ・CI・デプロイ。運用の手順。何がうまくいったか          | 第70章                     | `Dockerfile`・`.github/`・`docs/runbook.md`・`docs/retro.md` |

この部で決めた進め方は3つです。

- **1章が終わるたびに、動いてテストが通るものにして、コミットする。** 章の終わりのアプリが、各章の `solutions/app/` です。
- **作るものは、教材が決めた題材（会議室の予約）。** 全部の模範解答があるので、詰まったら見比べられます。自分で決めた題材は、この部を終えてから、同じ順番で作ってください。
- **土台から始める。** ログイン・メール・仕事の列・設定・監視は、第12部までに作ったものを使い、題材の部分に時間を使います。

## 2. 土台を用意する

[../base/](../base/) は、第12部のタスク管理アプリから、タスク・添付ファイル・毎朝のお知らせ・冪等キー・SSE を取り除き、どの題材でも使う部分だけを残したものです（中身は [../base/README.md](../base/README.md)）。

| 残したもの                                                                | 第何部で作ったか |
| ------------------------------------------------------------------------- | ---------------- |
| 登録・メールの確認・ログイン・パスワードの再設定・練習用の IdP            | 第10部           |
| 設定（`loadConfig`）・ログ・`/healthz`・`/readyz`・`/version`・`/metrics` | 第5・12部        |
| PostgreSQL のプールとマイグレーション                                     | 第6部            |
| 仕事の列（BullMQ）とメールの仕事                                          | 第12部           |
| 画面のログイン・登録のページ、偽の API のテスト、E2E                      | 第8・10・11部    |

### 2.1 手を動かす: 土台をコピーして、テストを通す

```sh
$ cp -R ~/dev/part13/base ~/dev/room-booking
$ cd ~/dev/room-booking
$ git init
$ git add -A && git commit -m "土台"
```

| コマンド      | 意味                                                                           |
| ------------- | ------------------------------------------------------------------------------ |
| `cp -R 元 先` | フォルダを中身ごとコピーする（第1章）                                          |
| `git init`    | ここを新しい Git のリポジトリにする（第3章）。この部では、章ごとにコミットする |

PostgreSQL と Redis を動かし、パッケージを入れて、テストを通します。ポートは、第6部（5433・6380）や第12部とぶつからないように、5434・6381 にしてあります。

```sh
$ docker compose up -d --wait       # PostgreSQL（5434）と Redis（6381）
$ npm ci
$ npm run check                     # tsc → ESLint → Prettier → テスト
…
ℹ tests 25
ℹ pass 25
ℹ fail 0
$ (cd web && npm ci && npm run check)
…
      Tests  14 passed (14)
```

`( … )` は、カッコの中だけ別のフォルダで動かし、終わったら元のフォルダに戻る書き方です（第1部 第1章のサブシェル）。

E2E（第11部 第58章）も1回動かしておきます。初めての Mac では、ブラウザを入れるところからです。

```sh
$ npx playwright install chromium   # 初めてのときだけ
$ npm run e2e
  ✓  1 [chromium] › e2e/auth-flow.spec.ts:8:1 › 登録 → 確認のメールのリンク → ログイン → ログアウト
  1 passed
```

ここで全部が通らないときは、先に進まずに直します。土台が動かないまま題材を作ると、どこで壊れたのか分からなくなります。

## 3. 要件定義

**要件定義**（requirements definition）は、「だれが、何のために、何をしたいか」と「守る決まり」を、作る前に文書にすることです。目的は、作る人と使う人（と未来の自分）が、同じものを思い浮かべられるようにすることです。

Flask で小さなアプリを作ったときは、頭の中の「こういうもの」から、すぐに `@app.route` を書き始めたかもしれません。1人で1日で作るならそれで足ります。何日もかけるとき、だれかに頼まれて作るときは、書いておかないと「そんなつもりではなかった」が後から出てきます。

### 3.1 手を動かす: 目的と使う人を書く

`~/dev/room-booking/docs/requirements.md` を作り、まず2つの節を書きます。

```md
# 要件定義 — 会議室の予約

## 1. 目的

社内の会議室の予約を、紙の表やチャットのやりとりから、Web の画面に移す。
だれがいつ使うかが一目で分かり、2人が同じ時間を取ってしまうことを無くす。

## 2. 使う人

| 役割               | 人数の目安 | すること                                               |
| ------------------ | ---------- | ------------------------------------------------------ |
| メンバー（member） | 50 人      | 空いている会議室を探して予約する。自分の予約を取り消す |
| 管理者（admin）    | 1〜2 人    | 会議室を登録・変更・停止する。だれの予約でも取り消せる |
```

| 節     | 書くこと                       | 後で何に使うか                                    |
| ------ | ------------------------------ | ------------------------------------------------- |
| 目的   | 何が困っていて、何が良くなるか | 迷ったときの判断（「それは目的に要るか」）        |
| 使う人 | 役割と人数                     | 権限の設計（第68章の `role`）、どれくらいの負荷か |

### 3.2 手を動かす: ユーザーストーリーを書く

**ユーザーストーリー**（user story）は、「〇〇として、△△したい。□□のため」の形で、使う人の側から機能を書いたものです。「予約の API を作る」のような作る側の言葉で書くと、何のためかが抜け落ちます。

```md
## 3. ユーザーストーリー

| #   | ストーリー                                                                       | 優先 |
| --- | -------------------------------------------------------------------------------- | ---- |
| S1  | メンバーとして、ある日の全部の会議室の予約を表で見たい。空いている時間を探すため | 必須 |
| S2  | メンバーとして、空いている枠から予約したい。題名を付けて                         | 必須 |
```

続きは自分で考えて書いてから、[solutions/app/docs/requirements.md](solutions/app/docs/requirements.md) の S1〜S9 と比べてください。「後回し」の優先を付けたもの（S8 の繰り返しの予約、S9 の設備での絞り込み）は、この版では作りません。

### 3.3 手を動かす: 決まりに番号を付ける

予約の決まりは、後でテストと1つずつ対応させるので、番号（R1〜R10）を付けます。「破ったとき」の列に、API が返すステータスも書いておきます。

```md
## 4. 予約の決まり

| #   | 決まり                                                               | 破ったとき |
| --- | -------------------------------------------------------------------- | ---------- |
| R1  | 時刻は 30 分の区切り（:00 か :30）                                   | 422        |
| R2  | 予約できるのは 8:00〜21:00（日本の時刻）。日をまたがない             | 422        |
| R3  | 長さは 30 分〜3 時間                                                 | 422        |
| R4  | 始まりが過ぎた時刻は予約できない。60 日先まで                        | 422        |
| R6  | 同じ会議室で、時間が重なる予約はできない（取り消したものは数えない） | 409        |
```

| ステータス | 使い分け（第5部 第25章）                                              |
| ---------- | --------------------------------------------------------------------- |
| 422        | 送られた値そのものが決まりに合わない（何度送り直しても同じ）          |
| 409        | 値は正しいが、今の状態とぶつかる（ほかの予約と重なる、10 件を超える） |

R5・R7〜R10、機能以外の要件（5節）、作らないもの（6節）も書きます。完成形は [solutions/app/docs/requirements.md](solutions/app/docs/requirements.md) です。特に「作らないもの」の節は飛ばさないでください。作る途中で思いついたことを「次の版で」と言える根拠になります（練習問題4）。

## 4. 画面と API の設計

要件が決まったら、使う人から見える形（画面）と、画面とサーバの約束（API）を決めます。

### 4.1 手を動かす: 画面を絵と表で書く

`docs/screens.md` に、ページの一覧と、いちばん大事なページの絵を書きます。絵は、きれいな図より、テキストで素早く描いたもののほうが、直しやすく、Git で差分も見られます。

```
┌──────────────────────────────────────────────┐
│ その日の予約                                    │
│ [← 前の日] 2026-12-10（木） [次の日 →] [今日]     │
│ 時刻   │ 会議室A（6人） │ 会議室B（4人） │
│ 08:00 │ [空き]         │ [空き]         │
│ 10:00 │ 定例（自分）    │ [空き]         │
│ 10:30 │   〃           │ [空き]         │
└──────────────────────────────────────────────┘
```

絵の下に、決めたことを箇条書きにします。たとえば「空いている枠はボタン。名前は『会議室A 10:00 から予約』」と書いておくと、第69章のテストで、そのまま `getByRole('button', { name: '会議室A 10:00 から予約' })` と探せます（第11部 第58章）。完成形は [solutions/app/docs/screens.md](solutions/app/docs/screens.md) です。

### 4.2 手を動かす: API を表で書く

`docs/api.md` に、メソッドとパス・だれが・成功・失敗を表にします。

```md
| メソッドとパス                                             | だれが         | 成功             | 失敗                                              |
| ---------------------------------------------------------- | -------------- | ---------------- | ------------------------------------------------- |
| `GET /api/bookings?date=YYYY-MM-DD`                        | ログインした人 | 200 `{ items }`  | 400（日付が無い・正しくない）                     |
| `POST /api/bookings` `{ roomId, title, startsAt, endsAt }` | ログインした人 | 201 + `Location` | 422（R1〜R5）、404（会議室が無い）、409（R6〜R8） |
| `DELETE /api/bookings/:id`                                 | 本人か管理者   | 204              | 403、404、409（始まった・取り消した）             |
```

| 決めること     | この題材で決めたこと                                                                |
| -------------- | ----------------------------------------------------------------------------------- |
| 時刻の形       | 返すときは UTC の ISO 8601。受け取るときは時差付きなら何でもよい                    |
| 日付だけのもの | `?date=` は日本の日付                                                               |
| 個人情報       | 予約に、予約した人の id やメールアドレスを付けない。代わりに `mine`（自分のものか） |

失敗の列の番号（R1〜R8）が、3.3節の決まりと対応しているのを確かめてください。完成形は [solutions/app/docs/api.md](solutions/app/docs/api.md) です。

## 5. データの設計と EXCLUDE 制約

いちばん難しい決まりは R6（同じ会議室で、時間が重なる予約はできない）です。「重なっていないか SELECT で確かめてから INSERT」では、2人が同時に確かめると、2人とも入ってしまいます（第6部 第30章 6節。練習問題4の(1)）。そこで、データベースの**排他制約**（EXCLUDE 制約）に守らせます。

```sql
CONSTRAINT bookings_no_overlap EXCLUDE USING gist (room_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
  WHERE (canceled_at IS NULL)
```

| 部分                                    | 意味                                                                              |
| --------------------------------------- | --------------------------------------------------------------------------------- |
| `EXCLUDE USING gist (…)`                | 「（…）の条件が全部 true になる2行」を入れさせない。GiST という種類の索引で調べる |
| `room_id WITH =`                        | 会議室が同じで、かつ                                                              |
| `tstzrange(starts_at, ends_at) WITH &&` | 時刻の範囲が重なる（`&&`）2行                                                     |
| `WHERE (canceled_at IS NULL)`           | 取り消したものは比べない                                                          |

`tstzrange(a, b)` は、`a` を含み `b` を含まない範囲 `[a, b)` です。10:00〜11:00 と 11:00〜12:00 は、接しているだけで重なりません。

`room_id WITH =` のように、ふつうの整数の「等しい」を GiST の索引で使うには、PostgreSQL に付いてくる拡張 `btree_gist` が要ります。

### 5.1 手を動かす: psql で重なりを断らせる

マイグレーションを書く前に、psql で動きを確かめます。`docker compose exec db psql -U app roombooking` で、コンテナの中の psql につなぎます（第6部 第32章）。

```sh
$ docker compose exec db psql -U app roombooking
```

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;
CREATE SCHEMA demo67;
SET search_path TO demo67, public;
CREATE TABLE b (room_id int, starts_at timestamptz, ends_at timestamptz, canceled_at timestamptz,
  CONSTRAINT bookings_no_overlap EXCLUDE USING gist (room_id WITH =, tstzrange(starts_at, ends_at) WITH &&)
  WHERE (canceled_at IS NULL));
INSERT INTO b VALUES (1, '2026-12-10 10:00+09', '2026-12-10 11:00+09');
INSERT INTO b VALUES (1, '2026-12-10 10:30+09', '2026-12-10 11:30+09');
```

2つ目の INSERT が断られます。

```
ERROR:  conflicting key value violates exclusion constraint "bookings_no_overlap"
DETAIL:  Key (room_id, tstzrange(starts_at, ends_at))=(1, ["2026-12-10 01:30:00+00","2026-12-10 02:30:00+00")) conflicts with existing key (room_id, tstzrange(starts_at, ends_at))=(1, ["2026-12-10 01:00:00+00","2026-12-10 02:00:00+00")).
```

接するだけなら重ならないことも確かめます。

```sql
SELECT tstzrange('2026-12-10 10:00+09', '2026-12-10 11:00+09') && tstzrange('2026-12-10 11:00+09', '2026-12-10 12:00+09') AS touch;
```

```
 touch
-------
 f
```

| 見えたもの   | 意味                                                                                          |
| ------------ | --------------------------------------------------------------------------------------------- |
| `+00` の時刻 | `timestamptz` は瞬間で持ち、psql は UTC で表示している（コンテナのタイムゾーンが UTC のため） |
| `[` と `)`   | 始まりを含み、終わりを含まない範囲                                                            |
| `f`          | 接するだけの2つの範囲は、`&&` が false                                                        |

確かめたら、`DROP SCHEMA demo67 CASCADE;` で消し、`\q` で psql を抜けます。このエラーのコードは `23P01` で、第68章で API の 409 に読み替えます。

### 5.2 手を動かす: data.md とマイグレーションを書く

`docs/data.md` に、表の絵と「決めたこと・理由」の表を書きます。理由まで書くのは、後から来た人（未来の自分）が「なぜ枠の番号で持たなかったのか」と迷わないためです（練習問題4の(2)）。完成形は [solutions/app/docs/data.md](solutions/app/docs/data.md) です。

次に、マイグレーション `migrations/002_rooms_bookings.sql` を書きます（`001` は土台のユーザーとセッションの表）。

```sql
CREATE EXTENSION IF NOT EXISTS btree_gist WITH SCHEMA public;

CREATE TABLE rooms (
  id         integer     GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  name       text        NOT NULL CONSTRAINT rooms_name_check CHECK (length(name) BETWEEN 1 AND 50),
  capacity   integer     NOT NULL CONSTRAINT rooms_capacity_check CHECK (capacity BETWEEN 1 AND 100),
  active     boolean     NOT NULL DEFAULT true,
  created_at timestamptz NOT NULL DEFAULT now()
);
CREATE UNIQUE INDEX rooms_name ON rooms (name);
```

`bookings` の表（`bookings_no_overlap` を含む）は、自分で書いてから [solutions/app/migrations/002_rooms_bookings.sql](solutions/app/migrations/002_rooms_bookings.sql) と比べてください。

| 決めたこと                          | 理由                                                                                                                          |
| ----------------------------------- | ----------------------------------------------------------------------------------------------------------------------------- |
| `btree_gist` を `public` に入れる   | テストはテストごとのスキーマで動く（第11部 第57章）。拡張がテストのスキーマに入ると、スキーマを消したときに一緒に消えてしまう |
| 予約を消さず `canceled_at` を入れる | だれがいつ取り消したかを残す                                                                                                  |
| 会議室を消さず `active`             | 過去の予約が会議室を指している（外部キー）                                                                                    |

### 5.3 手を動かす: 制約をテストで確かめる

psql で確かめたことを、自動のテストにします。`test/db/constraints.test.ts` は、テストごとのスキーマに、アプリと同じマイグレーションで表を作り（`test/support/test-db.ts`。土台にある）、SQL で直接入れて確かめます。

```ts
test('同じ会議室で時間が重なる予約は、23P01（bookings_no_overlap）で断られる', async () => {
  await book('10:00', '11:00');
  assert.deepEqual(await rejects(book('10:30', '11:30')), { code: '23P01', constraint: 'bookings_no_overlap' });
});

test('境目が接するだけなら重ならない（[始まり, 終わり) の範囲）', async () => {
  await book('11:00', '12:00');
});
```

`book` と `rejects` の作り方と、ほかの4つのテスト（ほかの会議室ならよい・取り消したものとは重なってよい・CHECK 制約・会議室の名前の重なり）は、[solutions/app/test/db/constraints.test.ts](solutions/app/test/db/constraints.test.ts) を見てください。`package.json` の `test` は `"test/**/*.test.ts"` なので、`test/db/` も自動で入ります。

```sh
$ node --test test/db/constraints.test.ts
ℹ tests 6
ℹ pass 6
ℹ fail 0
```

## 6. 決まりを純粋な関数にする

R1〜R4 の時刻の決まりは、データベースの制約では書きにくく（日本の時刻・「今」）、API と画面の両方で使います。そこで、どこにも頼らない**純粋な関数**（引数だけで結果が決まり、外に何もしない関数）として `src/domain/` に置きます。「今」も引数で受け取るので、テストで時刻を自由に決められます（第11部 第56章 3節）。

### 6.1 手を動かす: 日本の時刻の関数（time.ts）

データベースと API は時刻を UTC の瞬間で持ち、「何日の何時」は日本の時刻で数えます。日本は夏時間が無く、いつも UTC より 9 時間進んでいるので、9 時間を足し引きするだけで行き来できます。

```ts
const OFFSET_MS = 9 * 60 * 60 * 1000;

/** その瞬間の、日本での日付（'YYYY-MM-DD'）と、0 時からの分 */
export function tokyoParts(at: Date): { date: string; minutes: number } {
  const t = new Date(at.getTime() + OFFSET_MS); // UTC の読み方で読むと、日本の時刻になる
  return { date: t.toISOString().slice(0, 10), minutes: t.getUTCHours() * 60 + t.getUTCMinutes() };
}
```

| 関数                      | 例                                                                        |
| ------------------------- | ------------------------------------------------------------------------- |
| `tokyoParts(瞬間)`        | UTC の 2026-12-10 01:00 → `{ date: '2026-12-10', minutes: 600 }`（10:00） |
| `tokyoDateTime(日付, 分)` | `('2026-12-10', 600)` → UTC の 2026-12-10 01:00                           |
| `addDays(日付, n)`        | `('2026-12-31', 1)` → `'2027-01-01'`                                      |
| `isDateString(s)`         | `'2026-02-30'` → `false`                                                  |
| `hhmm(分)`                | `480` → `'08:00'`                                                         |

まず `tokyoParts` と `tokyoDateTime` を書き、`test/unit/time.test.ts` で確かめます。テストには、日本と UTC で日付がずれる時刻（UTC の 15:00 の前後）を必ず入れます。

```ts
test('tokyoParts: UTC の 15:00 は、日本の次の日の 0:00', () => {
  assert.deepEqual(tokyoParts(new Date('2026-12-10T01:30:00Z')), { date: '2026-12-10', minutes: 10 * 60 + 30 });
  assert.deepEqual(tokyoParts(new Date('2026-12-10T15:00:00Z')), { date: '2026-12-11', minutes: 0 });
  assert.deepEqual(tokyoParts(new Date('2026-12-10T14:59:00Z')), { date: '2026-12-10', minutes: 23 * 60 + 59 });
});
```

残りの関数とテストは [solutions/app/src/domain/time.ts](solutions/app/src/domain/time.ts)・[solutions/app/test/unit/time.test.ts](solutions/app/test/unit/time.test.ts) と比べてください。

### 6.2 手を動かす: 予約の時刻の決まり（booking-rules.ts）

決まりの数は、1か所（`RULES`）にまとめます。後で「21:00 まで」を変えたくなったとき、直す所が1つで済みます。

```ts
export const RULES = {
  slotMinutes: 30,
  openMinutes: 8 * 60,
  closeMinutes: 21 * 60,
  minMinutes: 30,
  maxMinutes: 3 * 60,
  maxDaysAhead: 60,
  maxUpcomingPerUser: 10,
  titleMax: 100,
} as const;
```

`checkBookingTime(startsAt, endsAt, now)` は、合わないところを**全部**、`{ field, message }` の配列で返します（合えば空）。最初の1つで止めずに全部返すのは、API の 422 で「どの項目が、なぜ」を全部伝えるためです（第5部 第25章の `errors[].pointer`）。

```ts
const onGrid = (d: Date) => d.getTime() % (RULES.slotMinutes * 60_000) === 0;

export function checkBookingTime(startsAt: Date, endsAt: Date, now: Date): BookingIssue[] {
  const issues: BookingIssue[] = [];
  if (!onGrid(startsAt))
    issues.push({ field: 'startsAt', message: '始まりは 30 分の区切り（:00 か :30）にしてください' });
  if (!onGrid(endsAt)) issues.push({ field: 'endsAt', message: '終わりは 30 分の区切り（:00 か :30）にしてください' });
  if (issues.length > 0) return issues; // 区切りが合わなければ、ほかは数えない
  // ここから R2〜R4 …
}
```

R2〜R4 の続きを自分で書いてから、[solutions/app/src/domain/booking-rules.ts](solutions/app/src/domain/booking-rules.ts) と比べてください。

テストは、境目の値を表にして、`for` で回します（第11部 第56章 3節）。

```ts
const NOW = new Date('2026-12-10T09:10:00+09:00');
const ok = [
  ['30 分（いちばん短い）', '2026-12-10T10:00', '2026-12-10T10:30'],
  ['21:00 まで（いちばん遅い）', '2026-12-10T20:30', '2026-12-10T21:00'],
  ['60 日先（2027-02-08）', '2027-02-08T10:00', '2027-02-08T11:00'],
] as const;
for (const [name, s, e] of ok)
  test(`よい: ${name}`, () => {
    assert.deepEqual(checkBookingTime(at(s), at(e), NOW), []);
  });
```

| 表に入れる値                                 | 理由                                               |
| -------------------------------------------- | -------------------------------------------------- |
| いちばん短い・長い・早い・遅い               | 「〜まで」の境目は、含むか含まないかを間違えやすい |
| 1つ外側（3 時間 30 分、21:30 まで、61 日先） | 境目の外が、ちゃんと断られるか                     |
| 日をまたぐ（23:30〜0:30）                    | 日本の日付で数えているか                           |

「だめ」の表と、取り消せるかを決める `canCancel` も、[solutions/app/test/unit/booking-rules.test.ts](solutions/app/test/unit/booking-rules.test.ts) にあります。

### 6.3 手を動かす: 1日の枠（slots.ts）

画面の表（第69章）は、1日を 30 分の枠に分け、予約で埋まった枠を調べます。これも純粋な関数にしておきます。

```ts
export function slotsOfDay(date: string): Slot[] {
  const slots: Slot[] = [];
  for (let m = RULES.openMinutes; m < RULES.closeMinutes; m += RULES.slotMinutes) {
    slots.push({ start: tokyoDateTime(date, m), end: tokyoDateTime(date, m + RULES.slotMinutes), label: hhmm(m) });
  }
  return slots;
}
```

`markBusy(slots, bookings)` は、枠ごとに、その枠に重なる予約（無ければ `null`）を返します。重なりの調べ方は、データベースの `&&` と同じ「`a < d` かつ `c < b`」です。[solutions/app/src/domain/slots.ts](solutions/app/src/domain/slots.ts) と [test/unit/slots.test.ts](solutions/app/test/unit/slots.test.ts) を見て書いてください。

## 7. ADR と作る順番

### 7.1 手を動かす: ADR を書く

**ADR**（Architecture Decision Record、設計の決定の記録）は、大きな決定を1つ1ファイルで残すものです。「文脈・考えた選択肢・決定・結果」の4つを書きます。決定を変えるときは、ファイルを書き換えず、新しい番号のファイルを足して「0001 を置き換える」と書きます。

`docs/adr/0001-stack.md` に、技術の選び方を書きます。この題材では「Express + React（土台から）」「Next.js（第9部）」「予約の SaaS」を比べ、期間が短く土台が動いていることを決め手に、1つ目を選びました。

| 節           | 書くこと                                   |
| ------------ | ------------------------------------------ |
| 文脈         | どんな状況で決めたか（チーム、期間、前提） |
| 考えた選択肢 | 2つ以上。よい点と困る点                    |
| 決定         | どれを選んだか、決め手は何か               |
| 結果         | よくなること、気をつけること               |

自分ならどれを選ぶかを考えて書いてから、[solutions/app/docs/adr/0001-stack.md](solutions/app/docs/adr/0001-stack.md) と比べてください。自分の題材を作るときに「Next.js か Express + React か」を決めるのも、この形で書けます。

### 7.2 手を動かす: 作る順番を書く

`docs/plan.md` に、章ごとに何を作り、何が通れば終わりかを書きます。

| 章     | 作るもの                                                                     | 終わりの確かめ                                                            |
| ------ | ---------------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| 第67章 | 設計の文書、予約の決まりの純粋な関数、マイグレーション 002                   | 単体テストと、制約のテスト（重なり 23P01）が通る                          |
| 第68章 | 役割と管理者だけの API、会議室と予約のリポジトリ・サービス・ルート           | HTTP のテストで R1〜R10 が全部確かめられる。2人同時の予約で片方だけが入る |
| 第69章 | 画面、SSE、リマインドと取り消しのメール、E2E                                 | 2つのブラウザで、片方の予約がもう片方に出る（E2E）                        |
| 第70章 | Dockerfile・compose・render.yaml・CI・デプロイ、README、運用の手順、振り返り | `docker compose up` で本番と同じ形が動く                                  |

「終わりの確かめ」を、テストで確かめられる形で書いておくのが大事です。「API ができたら終わり」では、どこまでやれば終わりかが決まりません。

## 8. 確かめて、コミットする

### 8.1 手を動かす: 全部を通してコミットする

```sh
$ npm run check
…
ℹ tests 57
ℹ pass 57
ℹ fail 0
$ git add -A
$ git commit -m "第67章 要件と設計（docs・予約の決まり・会議室と予約の表）"
```

| 数  | 内訳                                              |
| --- | ------------------------------------------------- |
| 25  | 土台（単体 9・HTTP 16）                           |
| 26  | この章の単体（time 6・booking-rules 18・slots 2） |
| 6   | この章の制約のテスト                              |

[solutions/app/](solutions/app/) と比べて、`docs/` の節と `src/domain/` の関数が揃っているかを確かめてください。文の言い回しは違ってかまいません。

## まとめ

- 実際の開発は、要件定義 → 設計 → 実装 → テスト → 公開の順に進む。この部では、1章ごとに動くものにしてコミットする
- 要件定義には、目的・使う人・ユーザーストーリー・番号を付けた決まり・**作らないもの**を書く
- 画面・API・データの設計は、表とテキストの絵で書き、決めた理由も残す。画面の名前は、そのままテストで探す名前になる
- 「確かめてから入れる」は同時の書き込みで壊れる。重なりは EXCLUDE 制約（`btree_gist`、`tstzrange`、`&&`）でデータベースに守らせる
- 時刻の決まりは「今」を引数で受け取る純粋な関数にし、境目の値を表にしてテストする
- 日本の時刻は、UTC の瞬間に 9 時間足して読む。日付がずれる時刻（日本の 0〜9 時）をテストに入れる
- 大きな決定は ADR に、作る順番と「終わりの確かめ」は plan.md に書く

## 練習問題

[exercises/README.md](exercises/README.md) に8問あります（基本4・応用3・発展1）。

## 参考資料

- PostgreSQL 公式ドキュメント「Exclusion Constraints」（CREATE TABLE の EXCLUDE）: https://www.postgresql.org/docs/current/sql-createtable.html
- PostgreSQL 公式ドキュメント「Range Types」（`tstzrange`・`&&`・`isempty`）: https://www.postgresql.org/docs/current/rangetypes.html
- PostgreSQL 公式ドキュメント「btree_gist」: https://www.postgresql.org/docs/current/btree-gist.html
- Michael Nygard「Documenting Architecture Decisions」（ADR の元の記事）: https://cognitect.com/blog/2011/11/15/documenting-architecture-decisions
- MDN「Date」（`getTime`・`toISOString`・`getUTCDay`）: https://developer.mozilla.org/ja/docs/Web/JavaScript/Reference/Global_Objects/Date

---

前: [第12部 成果物](../../part12-deploy/project-task-deploy/README.md) ／ 次: [第68章 実装（前半）](../ch68-implementation-api/README.md)
