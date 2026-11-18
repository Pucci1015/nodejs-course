# 第69章 模範解答

練習問題（[../exercises/README.md](../exercises/README.md)）の模範解答と、この章の終わりのアプリです。

| もの               | 中身                                                                                                                                                         |
| ------------------ | ------------------------------------------------------------------------------------------------------------------------------------------------------------ |
| [app/](app/)       | 第69章を終えたときの `~/dev/room-booking`（画面・SSE の知らせ・メールとリマインド・E2E。API 90・画面 24・E2E 2）。本文の「手を動かす」で書いたものと見比べる |
| [extend/](extend/) | 問題7（自分の予約を日付ごとに）で書き換えた画面のファイル                                                                                                    |
| `*.ts`             | 練習問題の模範解答                                                                                                                                           |

練習問題の解答を動かすときは、`exercises/` で `MODULE=../solutions/○○.ts` を付けてテストを動かします。

| 問題 | ファイル                           | 確かめ方（`exercises/` で）                                            |
| ---- | ---------------------------------- | ---------------------------------------------------------------------- |
| 1    | [lengths.ts](lengths.ts)           | `MODULE=../solutions/lengths.ts node --test lengths.test.ts`           |
| 2    | [when.ts](when.ts)                 | `MODULE=../solutions/when.ts node --test when.test.ts`                 |
| 3    | [day-nav.ts](day-nav.ts)           | `MODULE=../solutions/day-nav.ts node --test day-nav.test.ts`           |
| 4    | このファイルの「問題4」            |                                                                        |
| 5    | [grid-cells.ts](grid-cells.ts)     | `MODULE=../solutions/grid-cells.ts node --test grid-cells.test.ts`     |
| 6    | [group-by-day.ts](group-by-day.ts) | `MODULE=../solutions/group-by-day.ts node --test group-by-day.test.ts` |
| 7    | [extend/](extend/)                 | `~/dev/room-booking/web` に置き換えて `npx vitest run`                 |
| 8    | [to-ics.ts](to-ics.ts)             | `MODULE=../solutions/to-ics.ts node --test to-ics.test.ts`             |

`app/` を動かすときは、教材のフォルダではなく、`~/dev` にコピーしてから `npm ci`（`web/` でも）します（第67章 2節）。

---

## 問題1 予約のダイアログの「長さ」の選択肢

```ts
for (let m = RULES.minMinutes; m <= RULES.maxMinutes && startMinutes + m <= RULES.closeMinutes; m += RULES.slotMinutes)
  out.push(m);
```

- `for` の条件に「3 時間まで」と「21:00 まで」の両方を書きました。21:00 ちょうどに終わる（`<=`）のはよく、過ぎる（`>`）のはだめです。R2 の「21:00 までに終わる」と同じ境目です（第67章 6.2節）。
- 21:00 から始めると、空の配列になります。表では 20:30 が最後の枠なので起きませんが、関数としては「選べるものが無い」を正しく返します。
- `lengthLabel` は、本文のダイアログでは三項演算子を重ねた1行でした。`if` で分けたほうが、`3 時間 30 分` のような値が来ても正しく、読みやすくなります。

## 問題2 自分の予約の1行の「いつ・どこ」

```ts
const d = new Date(`${date}T00:00:00Z`);
return `${d.getUTCMonth() + 1}/${d.getUTCDate()}（${WEEKDAYS[d.getUTCDay()] ?? ''}）`;
```

- `getUTCMonth()` は 0（1月）から数えるので、`+ 1` します。`getUTCDate()` は日（1〜31）です。名前が紛らわしいので気をつけます（`getUTCDay()` は曜日）。
- 頭の 0 を付けないので、`'2026-12-10'.slice(5)` のような文字の切り出しより、`Date` を通したほうが簡単です。
- 予約の時刻を `new Date(b.startsAt).getUTCHours()` で読むと、UTC の時刻（日本より 9 時間前）になります。`tokyoParts` を通して、日本の日付と分にします。日本の 0:00〜9:00 は UTC では前の日なので、日付も `tokyoParts` の `date` を使います（テストの3つ目）。

## 問題3 表示する日付と、前後の日

```ts
export function pickDate(asked: string | null, today: string): string {
  return asked !== null && isDateString(asked) ? asked : today;
}
```

- `'2026-02-30'` を `new Date` で読むと 3月2日 になります。`isDateString` は、読んだ日付を書き戻して元の文字と同じかを比べるので、こうした「無い日付」も断ります（第67章 6.1節）。
- `searchFor` で今日のときに `?date=` を書かないのは、`/` を「今日」の URL にするためです。ブックマークした `/` は、翌日に開けば翌日の表になります。`?date=2026-12-10` を書くと、いつ開いてもその日です。
- 日付の文字に 1 を足す計算は、月末・年末・うるう年で間違えやすいので、`addDays`（UTC の 0 時に日数を足す）に任せます。

## 問題4 考えて答える

**(1) 知らせに中身を入れない**

`mine` は「見ている人の予約か」なので、見ている人ごとに違います。サーバは1つの知らせを全員に配るので、alice の予約の知らせに `mine: true` を入れると、bob の画面にも「（自分）」が出ます。人ごとに知らせを作り分けることもできますが、だれに何を見せてよいか（題名を見せてよいか、取り消せるか）を、API と知らせの2か所で決めることになり、食い違いの元になります。「変わった」だけを知らせて、見せてよいものは API が決める、と1か所にしました。

**(2) 描画の中の「今」**

- 何も触らなければ、React は描画し直さないので、9:35 になっても 9:30 の枠は「空き」のボタンのままです（押すと API が 422 で断る）。`useNow` は1分ごとに state を変えるので、描画し直されて「過ぎた枠」になります。
- テストを 22 時に動かすと、「今」は本当の今（22 時）になり、その日の枠は全部「過ぎた枠」になります。空きのボタンを押すテストが、動かす時刻によって失敗します。テストでは `vi.setSystemTime` で「今」を決めます。`useNow` も `new Date()` を使うので、どちらの書き方でもテストの「今」は決まりますが、描画の中で呼ぶと、描画のたびに値が変わり、同じ props でも結果が変わります（第8部 第42章 1節）。

**(3) 送る前に確かめても 409**

- ダイアログを開いてから「予約する」を押すまでの間に、ほかの人が同じ枠を予約した（R6）
- これからの予約が 10 件あった（R7）、または管理者が会議室を止めた（R8）。画面は、これらを確かめていない

`web/src/domain/` が古いままだと、画面は :15 の枠を出さず、送る前の確かめで :15 を断ります。API は受け付けるのに、画面からは予約できない、という食い違いになります。逆（API が厳しくなった）なら、画面は通すが API が 422 で断ります。どちらも、守っているのは API なので、間違った予約は入りません。コピーのつらさは、第70章の振り返りで Problem に挙げています。

**(4) リマインドが2通届くとき**

「送る → 記録」の順では、2台のワーカーが同時に「まだ記録が無い」を見て、どちらも送ります。再試行でも、1回目が送った後・記録する前に失敗すると、2回目がもう一度送ります。本文の順では、記録を入れる INSERT が主キーで1台だけに通るので、同時に動いても1通です。2通届くのは、送れた後・COMMIT の前にプロセスが落ちたときだけです（記録が消え、再試行でもう一度送る）。メールを送ることとデータベースに書くことは、1つのトランザクションにできないので、どちらかに倒すしかありません。「1通も届かない」より「まれに2通」を選びました。

**(5) E2E で「明日」を開く**

今日の表では、10:00 を過ぎた後にテストを動かすと、10:00 の枠は「過ぎた枠」でボタンが無く、`getByRole('button', { name: '会議室A 10:00 から予約' })` が見つからずに失敗します（CI がいつ動くかは選べない）。また、日本の 0:00 前後に動かすと、テストの途中で「今日」が変わります。`exact: true` を外すと、名前に「定例」を含むセル、つまり「定例（自分）」にも合います。bob の画面に「（自分）」が付く間違い（(1) の `mine` の取り違え）を見逃します。

## 問題5 表のセルの作り方を純粋な関数にする

```ts
return slots.map((slot, i): Cell<T> => {
  const booking = busy[i] ?? null;
  if (booking === null) return slot.start.getTime() <= now.getTime() ? { kind: 'past' } : { kind: 'free' };
  if (i > 0 && busy[i - 1] === booking) return { kind: 'covered' };
  let span = 1;
  while (busy[i + span] === booking) span++;
  return { kind: 'booked', booking, span };
});
```

- `busy[i + span]` は、最後の枠を過ぎると `undefined` になり、`=== booking` が `false` になってループが止まります。21:00 まで続く予約でも、配列の外を読みすぎることはありません（テストの4つ目）。
- `===` で比べるので、`markBusy` が同じ予約のオブジェクトを返していることが前提です。`markBusy` は `bookings.find` の結果（元の配列の要素）を返すので、同じ予約なら同じオブジェクトです。題名で比べると、続けて入れた同じ題名の別の予約が1つのセルにまとまってしまいます（テストの3つ目）。
- `(slot, i): Cell<T> =>` と戻り値の型を書いたのは、`{ kind: 'past' }` が `{ kind: string }` と推論されないようにするためです（書かないと `Cell<T>[]` に入らないと言われます）。
- `DayGrid` をこれで書き直すと、描画の中は `switch (cell.kind)` だけになります。`switch` に `default` を書かず、`kind` が増えたら `tsc` に教えてもらえます。

## 問題6 予約を日本の日付ごとにまとめる

```ts
const sorted = bookings.toSorted((a, b) => Date.parse(a.startsAt) - Date.parse(b.startsAt));
const byDay = Map.groupBy(sorted, (x) => tokyoParts(new Date(x.startsAt)).date);
return [...byDay].map(([date, items]) => ({ date, items }));
```

- 先に並べてから分けると、日付の順と日の中の順が、一度に決まります。`Map` はキーを最初に入れた順に回るので、並べた後なら日付も早い順です。
- `toSorted` は安定な並べ替え（同じ値なら元の順）なので、同じ時刻の予約は元の順のままです。`sort` は引数の配列を並べ替えてしまうので、`readonly T[]` の引数には使えません（`tsc` が止めます）。
- `Date.parse` は ISO 8601 の文字を、1970 年からのミリ秒にします。文字のまま `localeCompare` で比べても、`Z` の付いた同じ形なら同じ順になりますが、時差の違う形（`+09:00`）が混ざると壊れます。

## 問題7 自分の予約を、日付ごとに分けて表示する

書き換えたファイルは [extend/](extend/) にあります。

```tsx
byDay(mine.data).map(([date, list]) => (
  <Fragment key={date}>
    <h2 id={`day-${date}`}>{formatDay(date)}</h2>
    <ul className="my-bookings" aria-labelledby={`day-${date}`}>
      {list.map((b) => (
        <li key={b.id}>
          {timeAndRoom(b)} 「{b.title}」{' '}
```

- API の `/mine` は始まりの早い順に返すので、`Map.groupBy` だけで日付の順になります（問題6のように並べ直してもかまいません）。ここで、偽の API（`fake-api.ts`）が並べずに返していたことが分かったので、本物と同じく並べるように直しました。偽物は、テストに要る所では本物と同じに動かす必要があります（第11部 第57章）。
- 見出しの `id` は日付から作るので、ページの中で一意です。`useId` を使うこともできますが、`map` の中では呼べない（Hooks の決まり）ので、値から作りました。
- 確かめるダイアログには、日付を残しました。ダイアログは一覧から離れて表示されるので、「どの日の予約か」がそこだけで分かるようにします。
- `booking.test.tsx` の `/mine` のテストは、行の文字に日付を含むことを確かめていました。仕様を変えたら、古い仕様のテストも直します。テストが落ちたら、まず「仕様が変わったのか、壊したのか」を考えます。

## 問題8 自分の予約を iCalendar（.ics）にする

```ts
function fold(line: string): string[] {
  const out: string[] = [];
  let current = '';
  let bytes = 0;
  for (const ch of line) {
    const size = Buffer.byteLength(ch);
    if (bytes + size > 75) {
      out.push(current);
      current = ' '; // 続きの行は空白1つで始める（空白も 1 バイト数える）
      bytes = 1;
    }
    current += ch;
    bytes += size;
  }
  out.push(current);
  return out;
}
```

- `for (const ch of line)` は、文字列を1文字（コードポイント）ずつ回ります。`line[i]` や `slice` は UTF-16 の単位で数えるので、絵文字のような文字を半分に切ることがあります。バイトで数えて `Buffer` を切ると、日本語の 3 バイトの途中で切れて、文字が壊れます（第3部 第15章の文字コードの境目）。
- エスケープは `\` を最初に置き換えます。`;` を `\;` にした後で `\` を `\\` にすると、`\;` が `\\;` になってしまいます。
- 改行は `\r\n` と `\n` の両方を `\n`（バックスラッシュと n の2文字）にします。題名は API で1行にしてありますが、`.ics` を作る関数は、入ってくる値を信じずに書きます。
- 画面から使うなら、`new Blob([toIcs(…)], { type: 'text/calendar' })` を作り、`URL.createObjectURL` のリンクを `download="bookings.ics"` で押させます。API で `GET /api/bookings/mine.ics` を作るなら、`Content-Type: text/calendar; charset=utf-8` と `Content-Disposition`（第12部 第63章）を付けます。
