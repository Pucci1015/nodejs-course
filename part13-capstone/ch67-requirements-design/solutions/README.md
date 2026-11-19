# 第67章 模範解答

練習問題（[../exercises/README.md](../exercises/README.md)）の模範解答と、この章の終わりのアプリです。

| もの            | 中身                                                                                                                                             |
| --------------- | ------------------------------------------------------------------------------------------------------------------------------------------------ |
| [app/](app/)    | 第67章を終えたときの `~/dev/room-booking`（土台 + `docs/`・`src/domain/`・`migrations/002`・テスト）。本文の「手を動かす」で書いたものと見比べる |
| `*.ts`・`*.sql` | 練習問題の模範解答                                                                                                                               |

練習問題の解答を動かすときは、`exercises/` で `MODULE=../solutions/○○.ts` を付けてテストを動かします。

| 問題 | ファイル                               | 確かめ方（`exercises/` で）                                                |
| ---- | -------------------------------------- | -------------------------------------------------------------------------- |
| 1    | [slot-round.ts](slot-round.ts)         | `MODULE=../solutions/slot-round.ts node --test slot-round.test.ts`         |
| 2    | [weekday.ts](weekday.ts)               | `MODULE=../solutions/weekday.ts node --test weekday.test.ts`               |
| 3    | [booking-length.ts](booking-length.ts) | `MODULE=../solutions/booking-length.ts node --test booking-length.test.ts` |
| 4    | このファイルの「問題4」                |                                                                            |
| 5    | [free-ranges.ts](free-ranges.ts)       | `MODULE=../solutions/free-ranges.ts node --test free-ranges.test.ts`       |
| 6    | [next-free.ts](next-free.ts)           | `MODULE=../solutions/next-free.ts node --test next-free.test.ts`           |
| 7    | [room-closures.sql](room-closures.sql) | `SQL=../solutions/room-closures.sql node --test room-closures.test.ts`     |
| 8    | [recurring.ts](recurring.ts)           | `MODULE=../solutions/recurring.ts node --test recurring.test.ts`           |

`app/` を動かすときは、教材のフォルダではなく、`~/dev` にコピーしてから `npm ci` します（本文 2節）。

---

## 問題1 時刻を 30 分の区切りに切り下げる・切り上げる

```ts
const SLOT_MS = 30 * 60_000;
export const floorToSlot = (at: Date) => new Date(Math.floor(at.getTime() / SLOT_MS) * SLOT_MS);
export const ceilToSlot = (at: Date) => new Date(Math.ceil(at.getTime() / SLOT_MS) * SLOT_MS);
```

- `getTime()` は UTC の 1970 年からのミリ秒です。日本は UTC より 9 時間（30 分の 18 倍）進んでいるだけなので、UTC で 30 分に割り切れる瞬間は、日本でも :00 か :30 です。本文の `onGrid` と同じ考え方です。
- インドのように 5 時間 30 分ずれる国でも 30 分なら割り切れますが、ネパール（5 時間 45 分）では割り切れません。題材の「使う人はみな日本にいる」という前提（要件の 4節）が、コードを簡単にしています。
- つまずきやすい所: `at.setMinutes(0)` のように引数を書き換えると、呼んだ側の `Date` まで変わります。テストの3つ目は、それを確かめています。

## 問題2 日付の曜日と、週末か

```ts
const day = WEEKDAYS[new Date(`${date}T00:00:00Z`).getUTCDay()];
```

- `new Date('2026-12-10')` も UTC の 0 時として読まれますが、`getDay()`（UTC が付かない）は Mac のタイムゾーンで数えます。アメリカのタイムゾーンの Mac では、前の日の曜日になります。`getUTCDay()` と組で使います。
- `WEEKDAYS[…]` は、`noUncheckedIndexedAccess` のため `Weekday | undefined` 型です。`getUTCDay()` が 0〜6 しか返さないことを TypeScript は知らないので、`undefined` のときに投げる1行で絞り込みました（`as` は使いません）。
- `isDateString` で先に確かめないと、`'2026-02-30'` は `new Date` が 3月2日として読んでしまい、黙って間違った曜日を返します。

## 問題3 予約の長さと、その表し方

- `formatLength` は「時間が 0」「分が 0」の2つの場合で分けました。`${h} 時間 ${m} 分` を1つで作ってから `' 0 分'` を消す、のような書き方は、`'10 時間 0 分'` が `'1 時間'` に化けるような思わぬ壊れ方をします。
- `Number.isInteger(NaN)` は `false` なので、`NaN` もこの1行で断れます。

## 問題4 考えて答える

**(1) 確かめてから入れる**

1. alice の SELECT: 10:00〜11:00 に重なる予約は無い
2. bob の SELECT: 重なる予約は無い（alice はまだ INSERT していない）
3. alice の INSERT: 入る
4. bob の INSERT: 入る（bob は 2 で「無い」と確かめ終わっている）

同じ枠に2件入ります。トランザクションで囲んでも、既定の分離レベル（READ COMMITTED）では防げません（第6部 第30章 6節）。EXCLUDE 制約なら、2つ目の INSERT のときに、データベースが1件目と比べて `23P01` で断ります。第68章では、これを「5人が同時に予約しても1人だけ」のテストで確かめます。

**(2) 枠の番号で持つ**

- 枠の番号で持つ設計: 全部の予約の番号を付け直すマイグレーション（30 分の 1 番 → 15 分の 2・3 番）、番号と時刻の変換、画面、API の形。過去のデータも全部触ります。
- 瞬間で持つ設計（本文）: `RULES.slotMinutes` を 15 にし、`checkBookingTime` のテストを直すだけ。データベースの行は1つも変わりません。区切りは「決まり」であって「データ」ではない、というのが `data.md` の判断です。

**(3) 日本の日付**

`'2026-12-09'`（前の日）が返ります。`toISOString()` は UTC で書くので、日本の 8:30 は UTC の前の日の 23:30 です。日本の 0:00〜8:59 の間だけ、1日ずれます。`tokyoParts` は、瞬間に 9 時間足してから UTC の読み方で読むので、日本の日付になります。テストでは、ずれる時刻（UTC の 15:00 の前後）を必ず入れます（第69章の `tomorrowOf` のテストも同じ）。

**(4) 作らないもの**

例: 作る途中で「ついでに繰り返しの予約も」「カレンダーのアプリとも」と、やることが増え続け、いつまでも終わらない（スコープの膨張）。「作らない」と書いておけば、思いついたことを「次の版」に回す理由になり、相談の相手とも同じ線を共有できます。振り返り（第70章）の Try は、ここに書いたものから選びます。

**(5) 10 件までは制約にしない**

2つのリクエストが、どちらも「今 10 件目まで入っていない（9 件）」と数えてから INSERT すると、11 件まで入りえます（12 件目のほうも 9 件と数えていれば、さらに 12 件）。それでも制約にしなかったのは:

- 数の上限は、EXCLUDE や CHECK では書けない（トリガーや、人ごとの行をロックする仕組みが要る）
- 上限は「使いすぎを防ぐ目安」で、1件多く入っても困らない（要件の 5節で、そう決めた）

重なり（R6）は「1件でも入ったら困る」ので制約で守り、10 件（R7）は「だいたい守れればよい」のでサービスで数える。困り方の大きさで、守る場所を変えています。

## 問題5 1つの会議室の、その日の空いている時間

```ts
let cursor = open;
for (const b of busy) {
  if (b.s > cursor) out.push({ start: label(cursor), end: label(b.s) });
  cursor = Math.max(cursor, b.e);
}
if (cursor < close) out.push({ start: label(cursor), end: label(close) });
```

- 「まだ見ていない所の始まり」（`cursor`）を左から右へ動かす書き方は、区間を扱う問題でよく使います。重なっている予約で `cursor` を戻さないように `Math.max` にするのがつまずきやすい所です（テストの3つ目）。
- 先に `Math.max(始まり, 8:00)`・`Math.min(終わり, 21:00)` で営業時間に切り詰め、切り詰めて空になったもの（ほかの日の予約）は `filter` で捨てます。こうすると、ループの中で「はみ出し」を考えずに済みます。
- `toSorted` は元の配列を並べ替えずに、並べ替えた新しい配列を返します（第8部 第42章）。引数の配列を `sort` で並べ替えると、呼んだ側の予約の順番まで変わります。

## 問題6 予約を入れられる、いちばん早い始まり

- 枠は1日 26 個しかないので、全部ためしても一瞬です。問題5の `freeRanges` を使って「空きの中で長さが足りる所」を探す書き方もできますが、「区切り」「now より後」の条件が増えるので、ここでは全部ためす書き方にしました。速さが要らない所では、読みやすさと正しさを取ります。
- `start <= now` を「過ぎた」としたのは、`checkBookingTime` と同じにするためです。画面と API で「予約できる」の判断が食い違わないように、境目（ちょうど同じ時刻）は同じ側に倒します。

## 問題7 会議室を使えない時間の表（EXCLUDE 制約）

```sql
CREATE TABLE room_closures (
  id      integer   GENERATED ALWAYS AS IDENTITY PRIMARY KEY,
  room_id integer   NOT NULL,
  reason  text      NOT NULL CONSTRAINT room_closures_reason_check CHECK (length(reason) BETWEEN 1 AND 100),
  during  tstzrange NOT NULL CONSTRAINT room_closures_during_check CHECK (NOT isempty(during)),
  CONSTRAINT room_closures_no_overlap EXCLUDE USING gist (room_id WITH =, during WITH &&)
);
```

- `bookings` は、API の形に合わせて始まりと終わりの2つの列にしました。`room_closures` は範囲の型の列1つにしたので、制約が短くなります。どちらでも EXCLUDE 制約は書けます。2つの列なら、`CHECK (starts_at < ends_at)` で空と逆向きを断ります。
- `tstzrange(a, b)` は、`a > b` なら作るときにエラー（22000 番台）、`a = b` なら空の範囲になります。空の範囲は、どの範囲とも重ならない（`&&` が false）ので、CHECK で断っておかないと、「何も閉めない行」が黙って入ります。
- `btree_gist` が無いと、`room_id WITH =` の所で「GiST で integer の = を使えない」というエラーになります。本文 5節のマイグレーションで、`public` に入れてあります。
- アプリに入れるなら、マイグレーション `005_room_closures.sql` として足し、`room_id` に `REFERENCES rooms (id)` を付けます。予約を入れるときに「閉めている時間と重ならないか」も確かめる必要があり、こちらは2つの表をまたぐので制約では書けません（サービスで確かめる）。

## 問題8 毎週の予約を1回ずつに広げて確かめる

```ts
return Array.from({ length: input.weeks }, (_, i) => {
  const date = addDays(input.date, i * 7);
  const startsAt = tokyoDateTime(date, startMinutes);
  const endsAt = tokyoDateTime(date, startMinutes + input.minutes);
  return { date, startsAt, endsAt, issues: checkBookingTime(startsAt, endsAt, now).map((x) => x.message) };
});
```

- `addDays` で日付の文字を進めてから `tokyoDateTime` で瞬間にします。瞬間に 7 日分のミリ秒を足す書き方でも日本では同じ結果ですが、夏時間のある国では、切り替わりの週に 1 時間ずれます。「日付で進めてから、その日の何時」と考えるほうが、どこでも正しい書き方です。
- 入力の形の間違い（`'9:00'` など）は呼んだ側（画面か API のルート）のバグか、Zod で断るべき入力なので、例外にしました。一方「12 回のうち 9 回目から 60 日を超える」はふつうに起きることなので、データ（`issues`）で返し、画面が「この回は入れられません」と出せるようにします。
- 本当に繰り返しの予約を作るなら、「全部入れるか、1つも入れないか」（トランザクション）か「入れられる回だけ入れるか」を、要件として決める必要があります。振り返り（第70章）の Try に、ADR を書いてから決める、と書いたのはこのためです。
