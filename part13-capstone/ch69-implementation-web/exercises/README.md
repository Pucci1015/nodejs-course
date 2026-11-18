# 第69章 練習問題

本文（[../README.md](../README.md)）の「手を動かす」を終えてから取り組んでください。模範解答は [../solutions/README.md](../solutions/README.md) にあります。
この練習問題は `~/dev/part13/ch69-implementation-web/exercises/` で行います（問題7だけは `~/dev/room-booking`）。最初に `cd ~/dev/part13/ch69-implementation-web/exercises` で移動してください。

| 問題 | 種類 | テーマ                                 | 使うファイル                                                                     | 本文の節 |
| ---- | ---- | -------------------------------------- | -------------------------------------------------------------------------------- | -------- |
| 1    | 基本 | 予約のダイアログの「長さ」の選択肢     | [lengths.ts](lengths.ts)、[lengths.test.ts](lengths.test.ts)                     | 4.1      |
| 2    | 基本 | 自分の予約の1行の「いつ・どこ」        | [when.ts](when.ts)、[when.test.ts](when.test.ts)                                 | 2.1・5.1 |
| 3    | 基本 | 表示する日付と、前後の日               | [day-nav.ts](day-nav.ts)、[day-nav.test.ts](day-nav.test.ts)                     | 3.2      |
| 4    | 基本 | 考えて答える                           | [predict.md](predict.md)                                                         | 2〜8     |
| 5    | 応用 | 表のセルの作り方を純粋な関数にする     | [grid-cells.ts](grid-cells.ts)、[grid-cells.test.ts](grid-cells.test.ts)         | 3.1      |
| 6    | 応用 | 予約を日本の日付ごとにまとめる         | [group-by-day.ts](group-by-day.ts)、[group-by-day.test.ts](group-by-day.test.ts) | 4.3・5.1 |
| 7    | 発展 | 自分の予約を、日付ごとに分けて表示する | [app-tests/my-bookings-by-day.test.tsx](app-tests/my-bookings-by-day.test.tsx)   | 5・7     |
| 8    | 発展 | 自分の予約を iCalendar（.ics）にする   | [to-ics.ts](to-ics.ts)、[to-ics.test.ts](to-ics.test.ts)                         | 4.2      |

**発展**（7・8）は、少し長めの問題です。できなくても次の章に進んでかまいません。

## テストの使い方

問題4・7以外は、ファイルを書いて、`node --test ○○.test.ts` ですべてのテストが通れば完成です。画面の部品の中身を、React を使わない純粋な関数にして練習するので、Vitest も jsdom も要りません。模範解答で試すには、`MODULE=../solutions/○○.ts` を付けます（例: `MODULE=../solutions/lengths.ts node --test lengths.test.ts`）。

- [domain/](domain/) は本文の `src/domain/` の `time.ts`・`booking-rules.ts`・`slots.ts` のコピーです（画面の `web/src/domain/` と同じもの）。書き換えなくてかまいません。
- [typecheck.ts](typecheck.ts) はテストの部品です。どのテストも最後に、書いたファイルに `tsc` のエラーが無いことを確かめます。

---

## 基本

### 問題1 予約のダイアログの「長さ」の選択肢

本文 4.1節のダイアログの「長さ」を、[lengths.ts](lengths.ts) の3つの関数で作ってください。引数の `startMinutes` は 0 時からの分（10:00 なら 600）です。

| 関数                                 | 例                                                                               |
| ------------------------------------ | -------------------------------------------------------------------------------- |
| `lengthsFrom(startMinutes)`          | 10:00 → `[30, 60, 90, 120, 150, 180]`、19:00 → `[30, 60, 90, 120]`、21:00 → `[]` |
| `lengthLabel(minutes)`               | 30 → `'30 分'`、60 → `'1 時間'`、90 → `'1 時間 30 分'`                           |
| `optionLabel(startMinutes, minutes)` | 14:00 と 90 → `'1 時間 30 分（〜15:30）'`                                        |

- 30・180・21:00 は書かずに、`RULES`（[domain/booking-rules.ts](domain/booking-rules.ts)）の数を使う

```sh
$ node --test lengths.test.ts          # 書く前は 3 個が失敗
```

ヒント: 終わりの時刻は `hhmm(startMinutes + minutes)` です。`lengthLabel` は「時間が 0」「分が 0」で分けます（第67章 練習問題3と同じ考え方）。

### 問題2 自分の予約の1行の「いつ・どこ」

[when.ts](when.ts) に、2つの関数を書いてください（本文 2.1節・5.1節）。

- `formatDay('2026-12-10')` → `'12/10（木）'`（月と日の頭に 0 を付けない）
- `when({ startsAt, endsAt, roomName })` → `'12/10（木） 10:00〜11:00 会議室A'`。時刻は API の ISO 8601 の文字列で、出すのは日本の時刻と日付

```sh
$ node --test when.test.ts             # 書く前は 3 個が失敗
```

ヒント: 日付だけの文字は ``new Date(`${date}T00:00:00Z`)`` で UTC の 0 時として読み、`getUTCMonth()`（0 から数える）・`getUTCDate()`・`getUTCDay()` で読みます。予約の時刻は `tokyoParts(new Date(…))` で日本の日付と分にします。日本の 8:00 は、UTC では前の日です（テストの3つ目）。

### 問題3 表示する日付と、前後の日

本文 3.2節の `DayPage` の、日付を決める所を [day-nav.ts](day-nav.ts) の3つの関数にしてください。

| 関数                     | 返すもの                                                                               |
| ------------------------ | -------------------------------------------------------------------------------------- |
| `pickDate(asked, today)` | `?date=` の値（無ければ `null`）が本当にある日付ならそれ。無い・正しくなければ `today` |
| `searchFor(date, today)` | 今日なら `{}`、ほかの日なら `{ date }`（`setSearchParams` に渡すもの）                 |
| `dayNav(date, today)`    | `{ prev, next, isToday }`（前の日・次の日・今日か）                                    |

```sh
$ node --test day-nav.test.ts          # 書く前は 3 個が失敗
```

ヒント: [domain/time.ts](domain/time.ts) の `isDateString` と `addDays` を使えば、月や年、うるう年をまたぐ計算を自分で書く必要はありません。

### 問題4 考えて答える

[predict.md](predict.md) の5つの問いに、本文とアプリのコードを読んで答えてください。知らせの中身、描画の中の「今」、送る前に確かめても起きる 409、リマインドが2通届くとき、E2E で明日を開く理由、を考えます。

## 応用

### 問題5 表のセルの作り方を純粋な関数にする

本文 3.1節の `DayGrid` は、描画の中で「このセルは予約の最初か、覆われているか、過ぎたか、空きか」を決めていました。この判断を、[grid-cells.ts](grid-cells.ts) の `gridCells(slots, busy, now)` に取り出してください。`busy` は `markBusy` の結果（枠ごとの予約か `null`）です。

| セル                                | いつ                                                     |
| ----------------------------------- | -------------------------------------------------------- |
| `{ kind: 'booked', booking, span }` | 予約の最初の枠。`span` は、同じ予約（`===`）が続く枠の数 |
| `{ kind: 'covered' }`               | 上の `booked` が覆っている枠                             |
| `{ kind: 'past' }`                  | 予約が無く、枠の始まりが `now` 以前                      |
| `{ kind: 'free' }`                  | それ以外                                                 |

- 始まった予約も `booked` のまま（過ぎていても予約は見せる）
- 題名が同じでも、別の予約なら別のセル

```sh
$ node --test grid-cells.test.ts       # 書く前は 4 個が失敗
```

こうしておくと、`DayGrid` は `gridCells` の結果を `switch` でセルにするだけになり、rowSpan の計算を React 無しでテストできます。ヒント: `slots.map((slot, i) => …)` の中で、`busy[i - 1]`・`busy[i + span]` を見ます。戻り値の型 `Cell<T>` は判別できるユニオンです（第7部 第36章 2節）。

### 問題6 予約を日本の日付ごとにまとめる

[group-by-day.ts](group-by-day.ts) に `groupByDay(bookings)` を書いてください。問題7で使います。

- 始まりの日本の日付ごとに `{ date, items }`。日付の早い順、同じ日の中は始まりの早い順（同じなら元の順）
- 引数の配列を並べ替えない

```sh
$ node --test group-by-day.test.ts     # 書く前は 3 個が失敗
```

ヒント: 本文 4.3節の `Map.groupBy` と、`toSorted`（第8部 第42章）を使います。`Map` は、キーを入れた順に回ります。

## 発展

### 問題7 自分の予約を、日付ごとに分けて表示する

予約が増えると、「自分の予約」の1行ごとに日付が並んで読みにくくなります。日付ごとに見出しを付けて分けることにしました。仕様は、テスト [app-tests/my-bookings-by-day.test.tsx](app-tests/my-bookings-by-day.test.tsx) に書いてあります。

- 日付ごとに見出し（`h2`、`'12/10（木）'`）。日付の早い順
- 見出しの下に、その日の予約の一覧（`ul`）。一覧の名前は見出し（`aria-labelledby`）
- 行は `'10:00〜11:00 会議室A 「定例」'`（日付は見出しにあるので書かない）
- その日の最後の予約を取り消したら、その日の見出しも消える

ブランチを作り、テストを画面のプロジェクトにコピーしてから始めます。

```sh
$ cd ~/dev/room-booking
$ git switch -c practice-mine-by-day
$ cp ~/dev/part13/ch69-implementation-web/exercises/app-tests/my-bookings-by-day.test.tsx web/test/
$ (cd web && npx vitest run test/my-bookings-by-day.test.tsx)   # 書く前は 4 個のうち 3 個が失敗
```

`web/src/pages/MyBookingsPage.tsx` を直してください。仕様が変わったので、`web/test/booking.test.tsx` の「自分の予約（/mine）」のテストの1行（行の文字に日付を含むか）も、新しい仕様に合わせて直す必要があります。どの1行かは、テストを動かすと分かります。最後に `(cd web && npm run check)` が通ることを確かめ、ブランチにコミットしてから `git switch main` で戻ってください。

ヒント: 問題6の `groupByDay` を `web/src/lib/` にコピーして使ってもよいし、`Map.groupBy` を直接使ってもかまいません。複数の要素を `map` で返すときは、`<Fragment key={…}>` で包んで `key` を付けます（第8部 第41章）。見出しに `id` を付け、`<ul aria-labelledby={その id}>` にすると、一覧の名前が見出しになります（第8部 第45章 5節）。

### 問題8 自分の予約を iCalendar（.ics）にする

自分の予約を、カレンダーのアプリ（macOS のカレンダーなど）に取り込めるようにしたい、という声が出たとします。カレンダーのアプリは iCalendar（RFC 5545）の形のファイルを読めます。[to-ics.ts](to-ics.ts) に `toIcs(bookings, { now, host })` を書いてください。この問題で使う決まりは、[to-ics.ts](to-ics.ts) のコメントに全部書いてあります。

```text
BEGIN:VCALENDAR
VERSION:2.0
PRODID:-//room-booking//JA
BEGIN:VEVENT
UID:booking-7@rooms.example.com
DTSTAMP:20261209T000000Z
DTSTART:20261210T010000Z
DTEND:20261210T020000Z
SUMMARY:定例
LOCATION:会議室A
END:VEVENT
END:VCALENDAR
```

- 行の終わりは CRLF（`\r\n`）。最後の行の後にも
- `SUMMARY`・`LOCATION` の `\`・`;`・`,`・改行は、`\\`・`\;`・`\,`・`\n` にする
- 75 バイト（UTF-8）より長い行は、続きの行を空白1つで始めて折り返す。日本語の文字（3 バイト）を途中で切らない

```sh
$ node --test to-ics.test.ts           # 書く前は 4 個が失敗
```

ヒント: 日時は `toISOString()` から `-`・`:`・`.000` を取り除けば作れます。エスケープは `\` を最初に置き換えます（後で足した `\` を2重にしないため）。文字の数え方は第3部 第15章（Buffer と文字コード）です。`for (const ch of 文字列)` は1文字（コードポイント）ずつ回り、`Buffer.byteLength(ch)` でその文字のバイト数が分かります。
