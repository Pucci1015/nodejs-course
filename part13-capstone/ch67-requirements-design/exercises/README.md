# 第67章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part13/ch67-requirements-design/exercises/` で行います。最初に `cd ~/dev/part13/ch67-requirements-design/exercises` で移動してください。

| 問題 | 種類 | テーマ                                       | 使うファイル                                                                             | 本文の節 |
| ---- | ---- | -------------------------------------------- | ---------------------------------------------------------------------------------------- | -------- |
| 1    | 基本 | 時刻を 30 分の区切りに切り下げる・切り上げる | [slot-round.ts](slot-round.ts)、[slot-round.test.ts](slot-round.test.ts)                 | 6.1      |
| 2    | 基本 | 日付の曜日と、週末か                         | [weekday.ts](weekday.ts)、[weekday.test.ts](weekday.test.ts)                             | 6.1      |
| 3    | 基本 | 予約の長さと、その表し方                     | [booking-length.ts](booking-length.ts)、[booking-length.test.ts](booking-length.test.ts) | 6.2      |
| 4    | 基本 | 考えて答える                                 | [predict.md](predict.md)                                                                 | 3〜6     |
| 5    | 応用 | 1つの会議室の、その日の空いている時間        | [free-ranges.ts](free-ranges.ts)、[free-ranges.test.ts](free-ranges.test.ts)             | 6.3      |
| 6    | 応用 | 予約を入れられる、いちばん早い始まり         | [next-free.ts](next-free.ts)、[next-free.test.ts](next-free.test.ts)                     | 6.2・6.3 |
| 7    | 応用 | 会議室を使えない時間の表（EXCLUDE 制約）     | [room-closures.sql](room-closures.sql)、[room-closures.test.ts](room-closures.test.ts)   | 5        |
| 8    | 発展 | 毎週の予約を1回ずつに広げて確かめる          | [recurring.ts](recurring.ts)、[recurring.test.ts](recurring.test.ts)                     | 6.2      |

**発展**（8）は、少し長めの問題です。できなくても次の章に進んでかまいません。

## テストの使い方

問題4以外は、ファイルを書いて、`node --test ○○.test.ts` ですべてのテストが通れば完成です。書く前に失敗するテストの数は、それぞれの問題に書いてあります。模範解答で試すには、`MODULE=../solutions/○○.ts` を付けます（例: `MODULE=../solutions/slot-round.ts node --test slot-round.test.ts`）。問題7だけは `SQL=../solutions/room-closures.sql` です。

- [domain/](domain/) は、本文で書いた `src/domain/` の `time.ts`・`booking-rules.ts` のコピーです。問題の中で import して使います。書き換えなくてかまいません。
- 問題7のテストは、`~/dev/room-booking` の compose の PostgreSQL（127.0.0.1:5434）を使います。テストごとに新しいスキーマ（`test_…`）を作り、終わったら消します（[pg-test.ts](pg-test.ts)）。アプリの表には触りません。
- [typecheck.ts](typecheck.ts) と [pg-test.ts](pg-test.ts) は、テストの部品です。書き換えなくてかまいません。どのテストも最後に、書いたファイルに `tsc` のエラーが無いことを確かめます。

---

## 基本

### 問題1 時刻を 30 分の区切りに切り下げる・切り上げる

[slot-round.ts](slot-round.ts) に、2つの関数を書いてください（本文 6.1節）。

| 関数              | 返すもの                            | 例（日本の時刻）                     |
| ----------------- | ----------------------------------- | ------------------------------------ |
| `floorToSlot(at)` | `at` の前（か同じ）の 30 分の区切り | 10:17 → 10:00、10:30 → 10:30         |
| `ceilToSlot(at)`  | `at` の後（か同じ）の 30 分の区切り | 10:17 → 10:30、23:45 → 次の日の 0:00 |

- 引数の `Date` は書き換えず、新しい `Date` を返します

```sh
$ node --test slot-round.test.ts       # 書く前は 3 個が失敗
```

ヒント: 本文 6.2節の `onGrid` は「30 分のミリ秒で割り切れるか」でした。`Math.floor`・`Math.ceil` で、割った数を整数にしてから掛け直します。日本と UTC の差は 9 時間ちょうどなので、UTC で区切れば日本でも区切れています。

### 問題2 日付の曜日と、週末か

[weekday.ts](weekday.ts) に、`weekdayOf(date)`（`'日'`〜`'土'`）と `isWeekend(date)`（土曜か日曜なら `true`）を書いてください。

- `date` が本当にある日付（`'YYYY-MM-DD'`）でなければ、`RangeError`（文にその文字を含める）
- [domain/time.ts](domain/time.ts) の `isDateString` を使ってかまいません

```sh
$ node --test weekday.test.ts          # 書く前は 4 個が失敗
```

ヒント: `new Date('2026-12-10T00:00:00Z').getUTCDay()` は、日曜を 0 とする曜日の番号です。日付だけの文字は「どこの 0 時か」を持たないので、UTC で読んで UTC の曜日を使えば、Mac のタイムゾーンに左右されません。

### 問題3 予約の長さと、その表し方

[booking-length.ts](booking-length.ts) に、2つの関数を書いてください。

| 関数                              | 返すもの                                                                                          |
| --------------------------------- | ------------------------------------------------------------------------------------------------- |
| `lengthMinutes(startsAt, endsAt)` | 始まりから終わりまでの分。終わりが始まりより前なら `RangeError`                                   |
| `formatLength(minutes)`           | `30` → `'30 分'`、`60` → `'1 時間'`、`90` → `'1 時間 30 分'`。1 以上の整数でなければ `RangeError` |

```sh
$ node --test booking-length.test.ts   # 書く前は 3 個が失敗
```

### 問題4 考えて答える

[predict.md](predict.md) の5つの問いに答えてください。

---

## 応用

### 問題5 1つの会議室の、その日の空いている時間

[free-ranges.ts](free-ranges.ts) に、`freeRanges(date, bookings)` を書いてください。1つの会議室の予約（`{ startsAt, endsAt }` の配列）から、その日の 8:00〜21:00 のうち、どの予約とも重ならない時間を、`{ start: 'HH:MM', end: 'HH:MM' }` の配列で早い順に返します。

- `bookings` は早い順とは限りません。接している予約・重なっている予約の間には、空きを作りません
- 営業時間の外にはみ出した部分や、ほかの日の予約は無視します
- 空きが無ければ空の配列

```sh
$ node --test free-ranges.test.ts      # 書く前は 5 個が失敗
```

ヒント: まず予約を「営業時間に切り詰めた、ミリ秒の始まりと終わり」にして、早い順に並べます。それから「まだ見ていない所の始まり」を 8:00 に置き、予約を1つずつ見ながら右へ進めます。

### 問題6 予約を入れられる、いちばん早い始まり

[next-free.ts](next-free.ts) に、`findNextFree(date, bookings, minutes, now)` を書いてください。次の全部に合う、いちばん早い始まりの `Date` を返します。無ければ `null` です。

- 始まりは 30 分の区切り（8:00、8:30、…）で、`now` より後（ちょうど `now` は過ぎたとする）
- 終わり（始まり + `minutes`）は 21:00 まで
- `bookings` のどれとも重ならない（接するのはよい）
- `minutes` が 30 分〜3 時間の、30 分の区切りでなければ `RangeError`

```sh
$ node --test next-free.test.ts        # 書く前は 5 個が失敗
```

ヒント: 2つの範囲 `[a, b)` と `[c, d)` が重なるのは、`a < d` かつ `c < b` のときです（本文 5節の `&&` と同じ）。

### 問題7 会議室を使えない時間の表（EXCLUDE 制約）

工事や点検で、会議室を使えない時間を記録する表 `room_closures` を、[room-closures.sql](room-closures.sql) に `CREATE TABLE` で書いてください（本文 5節）。

| 列        | 型・決まり                                                                                                |
| --------- | --------------------------------------------------------------------------------------------------------- |
| `id`      | 自動で振る整数の主キー                                                                                    |
| `room_id` | 整数。NULL はだめ（この問題では外部キーは付けない）                                                       |
| `reason`  | 文字。NULL はだめ。1〜100 文字（制約の名前は `room_closures_reason_check`）                               |
| `during`  | `tstzrange`（時刻の範囲）。NULL はだめ。空の範囲（始まり = 終わり）はだめ（`room_closures_during_check`） |

- 同じ会議室で `during` が重なる行は入れられない（`room_closures_no_overlap`。接するのはよい）

```sh
$ node --test room-closures.test.ts    # 書く前は 5 個が失敗（PostgreSQL が要る）
```

ヒント: 本文の `bookings_no_overlap` は、`tstzrange(starts_at, ends_at)` を制約の中で作りました。ここでは列そのものが `tstzrange` なので、`during WITH &&` と書けます。範囲が空かは `isempty(during)` で調べられます（PostgreSQL の公式ドキュメント「Range Functions」）。

---

## 発展

### 問題8 毎週の予約を1回ずつに広げて確かめる

要件の S8（毎週同じ時間を一度に予約したい）は、この版では作りません。その準備として、[recurring.ts](recurring.ts) に `expandWeekly(input, now)` を書いてください。

- `input` は `{ date, start: 'HH:MM', minutes, weeks }`。最初の回の日付から 7 日ずつ、`weeks` 回分の `{ date, startsAt, endsAt, issues }` を返します
- `issues` は、その回を [domain/booking-rules.ts](domain/booking-rules.ts) の `checkBookingTime` で確かめた結果の `message` の配列（合えば空）
- 入力の形が正しくなければ `RangeError`: `date` が日付でない、`start` が `'00:00'`〜`'23:59'` の形でない、`weeks` が 1〜12 の整数でない

```sh
$ node --test recurring.test.ts        # 書く前は 5 個が失敗
```

ヒント: 「入力の形の間違い（呼んだ側の誤り）」と「決まりに合わない回（ふつうに起きること）」を分けて扱うのが、この問題の大事なところです。前者は例外、後者はデータとして返します。
